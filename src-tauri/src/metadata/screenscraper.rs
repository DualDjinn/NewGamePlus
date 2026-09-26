use serde::Deserialize;
use std::fs;
use std::io::{BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::time::Duration;

#[allow(dead_code)]
#[derive(Deserialize, Debug, Clone)]
pub struct SsMedia {
    #[serde(rename = "type")]
    pub media_type: Option<String>,
    pub parent: Option<String>,
    pub url: Option<String>,
    pub format: Option<String>,
    pub region: Option<String>,
}

#[allow(dead_code)]
#[derive(Deserialize, Debug, Clone)]
pub struct SsGame {
    pub id: Option<String>,
    #[serde(default)]
    pub medias: Option<Vec<SsMedia>>,
}

#[allow(dead_code)]
#[derive(Deserialize, Debug)]
struct SsJeuInfosResponse {
    pub response: Option<SsJeuInfosData>,
}

#[allow(dead_code)]
#[derive(Deserialize, Debug)]
struct SsJeuInfosData {
    pub status: Option<String>,
    pub error: Option<String>,
    pub jeu: Option<SsGame>,
}

#[allow(dead_code)]
#[derive(Deserialize, Debug)]
struct SsRechercheResponse {
    pub response: Option<SsRechercheData>,
}

#[allow(dead_code)]
#[derive(Deserialize, Debug)]
struct SsRechercheData {
    pub status: Option<String>,
    pub error: Option<String>,
    pub jeux: Option<Vec<SsGame>>,
}

#[allow(dead_code)]
#[derive(Deserialize, Debug)]
struct SsUserInfosResponse {
    pub response: Option<SsUserInfosData>,
}

#[allow(dead_code)]
#[derive(Deserialize, Debug)]
struct SsUserInfosData {
    pub status: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone)]
pub struct GameMediaUrls {
    pub video_url: Option<String>,
    pub logo_url: Option<String>,
}

/// Mapeo de plataforma interna de gameFlix al systemeid de ScreenScraper.fr
pub fn platform_to_screenscraper_id(platform: &str) -> Option<u32> {
    match platform.to_uppercase().as_str() {
        "MEGA_DRIVE" | "GENESIS" | "MD" => Some(1),
        "SMS" | "MASTER_SYSTEM" => Some(2),
        "NES" | "FAMICOM" => Some(3),
        "SNES" | "SUPER_NINTENDO" | "SFC" => Some(4),
        "GB" | "GAME_BOY" => Some(9),
        "GBC" | "GAME_BOY_COLOR" => Some(11),
        "GBA" | "GAME_BOY_ADVANCE" => Some(12),
        "GAMECUBE" | "GC" | "NGC" => Some(13),
        "N64" | "NINTENDO_64" => Some(14),
        "NDS" | "DS" | "NINTENDO_DS" => Some(15),
        "WII" => Some(16),
        "3DS" | "N3DS" | "NINTENDO_3DS" => Some(17),
        "WIIU" | "WII_U" => Some(18),
        "32X" | "SEGA_32X" => Some(19),
        "GAME_GEAR" | "GG" => Some(21),
        "SATURN" | "SEGA_SATURN" => Some(22),
        "DREAMCAST" | "DC" => Some(23),
        "NGP" | "NEO_GEO_POCKET" => Some(25),
        "LYNX" | "ATARI_LYNX" => Some(28),
        "PCE" | "PCENGINE" | "TG16" | "TURBOGRAFX" => Some(31),
        "VB" | "VIRTUAL_BOY" => Some(38),
        "A2600" | "ATARI_2600" => Some(40),
        "A7800" | "ATARI_7800" => Some(42),
        "WSWAN" | "WONDERSWAN" => Some(45),
        "WSWANC" | "WONDERSWAN_COLOR" => Some(46),
        "COLECOVISION" | "COLECO" => Some(48),
        "PS1" | "PSX" | "PLAYSTATION" => Some(57),
        "PS2" | "PLAYSTATION_2" | "PLAYSTATION2" => Some(58),
        "PS3" | "PLAYSTATION_3" | "PLAYSTATION3" => Some(59),
        "PSP" => Some(61),
        "PSVITA" | "VITA" => Some(62),
        "C64" | "COMMODORE_64" => Some(66),
        "MAME" | "ARCADE" | "FBNEO" => Some(75),
        "NGPC" | "NEO_GEO_POCKET_COLOR" => Some(82),
        "MSX" => Some(113),
        "MSX2" => Some(116),
        "PC" | "DOS" => Some(135),
        "NEOGEO" | "NEO_GEO" => Some(142),
        _ => None,
    }
}

/// Calcula CRC32 (IEEE 802.3) y MD5 sobre archivos de hasta `max_bytes` (para no congelar discos gigantes).
pub fn compute_file_hashes(path: &Path, max_bytes: u64) -> (Option<String>, Option<String>, u64) {
    let Ok(file) = fs::File::open(path) else {
        return (None, None, 0);
    };
    let file_len = file.metadata().map(|m| m.len()).unwrap_or(0);
    if file_len == 0 || file_len > max_bytes {
        return (None, None, file_len);
    }

    let mut reader = BufReader::with_capacity(64 * 1024, file);
    let mut buffer = [0u8; 64 * 1024];

    let mut crc: u32 = 0xFFFF_FFFF;
    let mut md5_context = md5::Context::new();

    loop {
        match reader.read(&mut buffer) {
            Ok(0) => break,
            Ok(n) => {
                let slice = &buffer[..n];
                for &byte in slice {
                    let mut b = (crc ^ (byte as u32)) & 0xFF;
                    for _ in 0..8 {
                        if b & 1 != 0 {
                            b = (b >> 1) ^ 0xEDB8_8320;
                        } else {
                            b >>= 1;
                        }
                    }
                    crc = (crc >> 8) ^ b;
                }
                md5_context.consume(slice);
            }
            Err(_) => return (None, None, file_len),
        }
    }

    let final_crc = !crc;
    let md5_digest = md5_context.compute();

    (
        Some(format!("{:08X}", final_crc)),
        Some(format!("{:x}", md5_digest)),
        file_len,
    )
}

fn build_client() -> Result<reqwest::blocking::Client, String> {
    reqwest::blocking::Client::builder()
        .user_agent("NewGamePlus/1.0 (Windows; DualDjinn)")
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|e| format!("Error creando cliente HTTP: {}", e))
}

fn append_auth_params(
    url: &mut String,
    dev_id: &str,
    dev_pass: &str,
    user: Option<&str>,
    pass: Option<&str>,
) {
    let sep = if url.contains('?') { '&' } else { '?' };
    url.push(sep);
    url.push_str(&format!(
        "devid={}&devpassword={}&softname=NewGamePlus&output=json",
        urlencoding::encode(dev_id.trim()),
        urlencoding::encode(dev_pass.trim())
    ));

    if let (Some(u), Some(p)) = (user, pass) {
        if !u.trim().is_empty() && !p.trim().is_empty() {
            url.push_str(&format!(
                "&ssid={}&sspassword={}",
                urlencoding::encode(u.trim()),
                urlencoding::encode(p.trim())
            ));
        }
    }
}

/// Valida credenciales contra la API de ScreenScraper
pub fn verify_credentials(
    dev_id: &str,
    dev_pass: &str,
    user: Option<&str>,
    pass: Option<&str>,
) -> Result<bool, String> {
    if dev_id.trim().is_empty() || dev_pass.trim().is_empty() {
        return Err("Las credenciales Dev de ScreenScraper son obligatorias".into());
    }

    let client = build_client()?;

    // Si se proveyeron credenciales de usuario, validamos con ssuserInfos.php
    let endpoint = if user.map(|u| !u.trim().is_empty()).unwrap_or(false) {
        "https://api.screenscraper.fr/api2/ssuserInfos.php"
    } else {
        // Validación solo de desarrollador llamando jeuInfos para un juego base
        "https://api.screenscraper.fr/api2/jeuInfos.php?gameid=1"
    };

    let mut url = endpoint.to_string();
    append_auth_params(&mut url, dev_id, dev_pass, user, pass);

    let resp = client
        .get(&url)
        .send()
        .map_err(|e| format!("Fallo al conectar con ScreenScraper: {}", e))?;

    let status = resp.status();
    if !status.is_success() {
        return Err(format!(
            "ScreenScraper respondió con error HTTP {} ({})",
            status.as_u16(),
            status.canonical_reason().unwrap_or("Error")
        ));
    }

    let body_text = resp
        .text()
        .map_err(|e| format!("Error leyendo respuesta: {}", e))?;

    if (body_text.contains("Erreur :") || body_text.contains("Error :"))
        && (body_text.contains("Identifiants")
            || body_text.contains("dev")
            || body_text.contains("password"))
    {
        return Err(
            "Credenciales de ScreenScraper inválidas. Verifica usuario y contraseña.".into(),
        );
    }

    Ok(true)
}

/// Limpia un nombre de juego quitando tags como (USA), [!], etc. para mejorar la búsqueda
fn clean_game_name_for_search(name: &str) -> String {
    let mut clean = String::new();
    let mut in_paren = false;
    let mut in_bracket = false;

    for ch in name.chars() {
        match ch {
            '(' => in_paren = true,
            ')' => in_paren = false,
            '[' => in_bracket = true,
            ']' => in_bracket = false,
            _ => {
                if !in_paren && !in_bracket {
                    clean.push(ch);
                }
            }
        }
    }

    let trimmed = clean.trim();
    if trimmed.is_empty() {
        name.trim().to_string()
    } else {
        trimmed.to_string()
    }
}

/// Extrae las mejores URLs de video snap y wheel logo de un `SsGame`
pub fn extract_media_urls(game: &SsGame) -> GameMediaUrls {
    let mut video_url = None;
    let mut logo_url = None;

    if let Some(medias) = &game.medias {
        // 1. Video Snap: preferimos "video-normalized" y luego "video"
        for m in medias {
            if let Some(t) = &m.media_type {
                if t == "video-normalized" {
                    if let Some(u) = &m.url {
                        video_url = Some(u.clone());
                        break;
                    }
                }
            }
        }
        if video_url.is_none() {
            for m in medias {
                if let Some(t) = &m.media_type {
                    if t == "video" {
                        if let Some(u) = &m.url {
                            video_url = Some(u.clone());
                            break;
                        }
                    }
                }
            }
        }

        // 2. Wheel Logo transparente: preferimos "wheel-hd", luego "wheel", luego "wheel-steel"
        let preferred_regions = ["wor", "us", "eu", "es", "ss"];
        for pref in &preferred_regions {
            if logo_url.is_some() {
                break;
            }
            for m in medias {
                if let (Some(t), Some(u)) = (&m.media_type, &m.url) {
                    if t == "wheel-hd" {
                        if let Some(r) = &m.region {
                            if r.to_lowercase() == *pref {
                                logo_url = Some(u.clone());
                                break;
                            }
                        }
                    }
                }
            }
        }

        // Fallback a cualquier wheel-hd
        if logo_url.is_none() {
            for m in medias {
                if let (Some(t), Some(u)) = (&m.media_type, &m.url) {
                    if t == "wheel-hd" {
                        logo_url = Some(u.clone());
                        break;
                    }
                }
            }
        }

        // Fallback a wheel estándar
        if logo_url.is_none() {
            for m in medias {
                if let (Some(t), Some(u)) = (&m.media_type, &m.url) {
                    if t == "wheel" || t == "wheel-steel" || t == "wheel-carbon" {
                        logo_url = Some(u.clone());
                        break;
                    }
                }
            }
        }
    }

    GameMediaUrls {
        video_url,
        logo_url,
    }
}

/// Consulta ScreenScraper para obtener metadatos y medios del juego
pub fn fetch_game_media(
    dev_id: &str,
    dev_pass: &str,
    user: Option<&str>,
    pass: Option<&str>,
    rom_path: &Path,
    platform: &str,
    game_name: &str,
) -> Result<GameMediaUrls, String> {
    let client = build_client()?;
    let sys_id = platform_to_screenscraper_id(platform);

    let filename = rom_path
        .file_name()
        .and_then(|f| f.to_str())
        .unwrap_or("")
        .to_string();

    // Intentar calcular hashes para ROMs de hasta 150MB
    let (crc32, md5, filesize) = compute_file_hashes(rom_path, 150 * 1024 * 1024);

    // -------------------------------------------------------------
    // Estrategia 1: Consulta directa por archivo/hashes con jeuInfos.php
    // -------------------------------------------------------------
    let mut url1 = "https://api.screenscraper.fr/api2/jeuInfos.php".to_string();
    append_auth_params(&mut url1, dev_id, dev_pass, user, pass);

    if let Some(sid) = sys_id {
        url1.push_str(&format!("&systemeid={}", sid));
    }
    if !filename.is_empty() {
        url1.push_str(&format!("&romnom={}", urlencoding::encode(&filename)));
    }
    if let Some(crc) = &crc32 {
        url1.push_str(&format!("&romcrc={}", crc));
    }
    if let Some(m) = &md5 {
        url1.push_str(&format!("&rommd5={}", m));
    }
    if filesize > 0 {
        url1.push_str(&format!("&romtaille={}", filesize));
    }

    if let Ok(resp) = client.get(&url1).send() {
        if resp.status().is_success() {
            if let Ok(parsed) = resp.json::<SsJeuInfosResponse>() {
                if let Some(data) = parsed.response {
                    if let Some(jeu) = data.jeu {
                        let urls = extract_media_urls(&jeu);
                        if urls.video_url.is_some() || urls.logo_url.is_some() {
                            return Ok(urls);
                        }
                    }
                }
            }
        }
    }

    // -------------------------------------------------------------
    // Estrategia 2: Búsqueda textual por título con jeuRecherche.php
    // -------------------------------------------------------------
    let search_title = clean_game_name_for_search(game_name);
    let mut url2 = "https://api.screenscraper.fr/api2/jeuRecherche.php".to_string();
    append_auth_params(&mut url2, dev_id, dev_pass, user, pass);
    url2.push_str(&format!(
        "&recherche={}",
        urlencoding::encode(&search_title)
    ));
    if let Some(sid) = sys_id {
        url2.push_str(&format!("&systemeid={}", sid));
    }

    let search_resp = client
        .get(&url2)
        .send()
        .map_err(|e| format!("Error buscando juego en ScreenScraper: {}", e))?;

    if search_resp.status().is_success() {
        if let Ok(parsed) = search_resp.json::<SsRechercheResponse>() {
            if let Some(data) = parsed.response {
                if let Some(jeux) = data.jeux {
                    if let Some(first_game) = jeux.into_iter().next() {
                        if let Some(game_id) = first_game.id {
                            // Obtener todos los medios del juego por ID
                            let mut url_details =
                                "https://api.screenscraper.fr/api2/jeuInfos.php".to_string();
                            append_auth_params(&mut url_details, dev_id, dev_pass, user, pass);
                            url_details.push_str(&format!("&gameid={}", game_id));

                            if let Ok(detail_resp) = client.get(&url_details).send() {
                                if detail_resp.status().is_success() {
                                    if let Ok(detail_parsed) =
                                        detail_resp.json::<SsJeuInfosResponse>()
                                    {
                                        if let Some(detail_data) = detail_parsed.response {
                                            if let Some(detail_jeu) = detail_data.jeu {
                                                return Ok(extract_media_urls(&detail_jeu));
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Err(format!(
        "No se encontraron medios para '{}' en ScreenScraper",
        game_name
    ))
}

/// Descarga un archivo multimedia (video o logo) preservando autenticación si es requerida
pub fn download_asset<F>(
    raw_url: &str,
    dest_path: &Path,
    dev_id: &str,
    dev_pass: &str,
    user: Option<&str>,
    pass: Option<&str>,
    on_progress: Option<F>,
) -> Result<PathBuf, String>
where
    F: Fn(u32),
{
    let client = build_client()?;

    let mut download_url = raw_url.to_string();

    // Si la URL apunta a screenscraper.fr y no contiene ya devid, agregamos credenciales
    if download_url.contains("screenscraper.fr") && !download_url.contains("devid=") {
        append_auth_params(&mut download_url, dev_id, dev_pass, user, pass);
    }

    if let Some(parent) = dest_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let mut resp = client
        .get(&download_url)
        .send()
        .map_err(|e| format!("Error conectando para descargar medio: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!(
            "Descarga falló con estado HTTP {}",
            resp.status().as_u16()
        ));
    }

    let total_size = resp.content_length().unwrap_or(0);

    let temp_path = dest_path.with_extension("tmp_download");
    let mut file = fs::File::create(&temp_path)
        .map_err(|e| format!("No se pudo crear archivo temporal: {}", e))?;

    let mut downloaded: u64 = 0;
    let mut buffer = [0u8; 32 * 1024];
    let mut last_pct = 0u32;

    loop {
        let n = resp
            .read(&mut buffer)
            .map_err(|e| format!("Error leyendo stream de descarga: {}", e))?;
        if n == 0 {
            break;
        }
        file.write_all(&buffer[..n])
            .map_err(|e| format!("Error guardando datos descargados: {}", e))?;
        downloaded += n as u64;

        if total_size > 0 {
            let pct = ((downloaded as f64 / total_size as f64) * 100.0).min(100.0) as u32;
            if pct != last_pct {
                last_pct = pct;
                if let Some(ref cb) = on_progress {
                    cb(pct);
                }
            }
        }
    }

    if downloaded == 0 {
        let _ = fs::remove_file(&temp_path);
        return Err("El archivo descargado está vacío".into());
    }

    file.sync_all()
        .map_err(|e| format!("Error sincronizando archivo: {}", e))?;

    drop(file);

    if dest_path.exists() {
        let _ = fs::remove_file(dest_path);
    }

    fs::rename(&temp_path, dest_path)
        .map_err(|e| format!("Error al renombrar archivo final: {}", e))?;

    if let Some(ref cb) = on_progress {
        cb(100);
    }

    Ok(dest_path.to_path_buf())
}
