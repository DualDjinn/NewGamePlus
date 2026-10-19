use crate::state::storage::log_error;
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
    #[serde(default)]
    pub noms: Option<Vec<SsNom>>,
    #[serde(default)]
    pub systeme: Option<SsSysteme>,
}

#[allow(dead_code)]
#[derive(Deserialize, Debug, Clone, Default)]
pub struct SsNom {
    #[serde(default, alias = "text")]
    pub nom: Option<String>,
    #[serde(default)]
    pub region: Option<String>,
}

#[allow(dead_code)]
#[derive(Deserialize, Debug, Clone, Default)]
pub struct SsSysteme {
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default, alias = "text")]
    pub nom: Option<String>,
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
    // Value crudo: la forma exacta del JSON varía (doc orientada a XML);
    // se convierte por elemento para diagnosticar desajustes sin romper todo.
    pub jeux: Option<Vec<serde_json::Value>>,
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
        "SWITCH" | "NINTENDO_SWITCH" => Some(225),
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

/// Enmascara credenciales (devid/devpassword/ssid/sspassword) en mensajes
/// de error y logs. Los `Err` de reqwest incluyen la URL completa con ellas.
pub fn sanitize_ss_message(msg: &str) -> String {
    let mut out = msg.to_string();
    for key in ["devid", "devpassword", "ssid", "sspassword"] {
        let mut from = 0;
        loop {
            let rest = &out[from..];
            let needle_q = format!("?{}=", key);
            let needle_a = format!("&{}=", key);
            let found = rest
                .find(needle_q.as_str())
                .map(|p| (p, needle_q.len()))
                .or_else(|| rest.find(needle_a.as_str()).map(|p| (p, needle_a.len())));
            let Some((rel, nlen)) = found else {
                break;
            };
            let val_start = from + rel + nlen;
            let tail = &out[val_start..];
            let val_end = tail
                .find(['&', ')', '"', '\'', ' '])
                .map(|p| val_start + p)
                .unwrap_or(out.len());
            out.replace_range(val_start..val_end, "***");
            from = val_start + 3;
        }
    }
    out
}

/// La estrategia directa (jeuInfos por archivo) necesita systemeid o hashes;
/// sin ambos la API devuelve 400. Saltarla ahorra la petición y cuota KO.
pub fn can_direct_lookup(sys_id: Option<u32>, crc: &Option<String>, md5: &Option<String>) -> bool {
    sys_id.is_some() || crc.is_some() || md5.is_some()
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
            // Convertir puntos, underscores y guiones a espacios
            '.' | '_' => {
                if !in_paren && !in_bracket {
                    clean.push(' ');
                }
            }
            _ => {
                if !in_paren && !in_bracket {
                    clean.push(ch);
                }
            }
        }
    }

    // Quitar palabras basura comunes en nombres de ROMs (especialmente 3DS/Switch)
    let junk_words = [
        "decrypted",
        "encrypted",
        "trimmed",
        "cia",
        "cci",
        "nsp",
        "xci",
        "nsz",
        "3ds",
        "wbfs",
        "wad",
        "v1 0",
        "v1 1",
        "v1 2",
        "v2 0",
        "rom",
        "dump",
        "rip",
    ];

    let mut result = clean.trim().to_string();
    let lower = result.to_lowercase();
    for junk in &junk_words {
        // Solo quitar si es una palabra completa al final del string
        if lower.ends_with(junk) {
            let new_len = result.len() - junk.len();
            result.truncate(new_len);
            result = result.trim_end().to_string();
        }
    }

    // Colapsar espacios múltiples
    let collapsed: String = result.split_whitespace().collect::<Vec<_>>().join(" ");

    if collapsed.is_empty() {
        name.trim().to_string()
    } else {
        collapsed
    }
}

/// Umbral mínimo para aceptar un candidato de búsqueda textual.
/// Por debajo: mejor sin video que con video ajeno.
pub const MIN_CANDIDATE_SCORE: u32 = 50;

fn normalize_candidate_title(s: &str) -> String {
    s.to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace())
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn candidate_titles(game: &SsGame) -> Vec<String> {
    game.noms
        .as_deref()
        .unwrap_or(&[])
        .iter()
        .filter_map(|n| n.nom.clone())
        .collect()
}

/// Puntúa un candidato de jeuRecherche (título 0-60 + sistema 0-40).
pub fn score_candidate(
    game: &SsGame,
    wanted_title: &str,
    platform: &str,
    system_id: Option<u32>,
) -> u32 {
    let wanted = normalize_candidate_title(&clean_game_name_for_search(wanted_title));
    if wanted.is_empty() {
        return 0;
    }
    let wanted_tokens: Vec<&str> = wanted.split(' ').collect();

    let mut title_score = 0;
    for name in candidate_titles(game) {
        let cand = normalize_candidate_title(&name);
        if cand.is_empty() {
            continue;
        }
        if cand == wanted {
            title_score = title_score.max(60);
        } else if cand.contains(&wanted) || wanted.contains(&cand) {
            title_score = title_score.max(30);
        } else {
            let overlap = cand
                .split(' ')
                .filter(|t| wanted_tokens.contains(t))
                .count();
            if overlap > 0 && overlap * 2 >= wanted_tokens.len() {
                title_score = title_score.max(15);
            }
        }
    }
    if title_score == 0 {
        return 0;
    }

    let mut system_score = 0;
    if let Some(sys) = game.systeme.as_ref() {
        // ponytail: id numérico cuando se conoce; si no (p. ej. Switch),
        // el nombre del sistema contiene a la plataforma o viceversa.
        let id_hit = matches!((system_id, sys.id.as_deref()), (Some(sid), Some(game_sid)) if game_sid == sid.to_string());
        if id_hit {
            system_score = 40;
        } else if let Some(nom) = sys.nom.as_deref() {
            let plat = normalize_candidate_title(platform);
            let sys_name = normalize_candidate_title(nom);
            if !plat.is_empty() && (sys_name.contains(&plat) || plat.contains(&sys_name)) {
                system_score = 40;
            }
        }
    }
    title_score + system_score
}

/// Mejor candidato por score; empate → orden original de la API.
/// None si ninguno supera el umbral.
pub fn pick_best_candidate(
    jeux: Vec<SsGame>,
    wanted_title: &str,
    platform: &str,
    system_id: Option<u32>,
) -> Option<SsGame> {
    let mut best: Option<(u32, SsGame)> = None;
    for game in jeux.into_iter() {
        let score = score_candidate(&game, wanted_title, platform, system_id);
        let replace = match &best {
            None => score >= MIN_CANDIDATE_SCORE,
            Some((best_score, _)) => score > *best_score,
        };
        if replace {
            best = Some((score, game));
        }
    }
    best.map(|(_, game)| game)
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

    // Diagnóstico (sin URLs: contendrían credenciales). Se vuelca en errors.log
    // solo si ambas estrategias fallan, al final de la función.
    let mut s1 = "omitida_sin_identificadores".to_string();
    if can_direct_lookup(sys_id, &crc32, &md5) {
        s1 = "sin_respuesta".to_string();
        if let Ok(resp) = client.get(&url1).send() {
            let status = resp.status();
            if status.is_success() {
                if let Ok(parsed) = resp.json::<SsJeuInfosResponse>() {
                    if let Some(data) = parsed.response {
                        if let Some(jeu) = data.jeu {
                            let urls = extract_media_urls(&jeu);
                            s1 = format!(
                                "http={} video={} logo={}",
                                status.as_u16(),
                                urls.video_url.is_some(),
                                urls.logo_url.is_some()
                            );
                            if urls.video_url.is_some() || urls.logo_url.is_some() {
                                return Ok(urls);
                            }
                        } else {
                            s1 = format!("http={} sin_jeu", status.as_u16());
                        }
                    } else {
                        s1 = format!("http={} sin_response", status.as_u16());
                    }
                } else {
                    s1 = format!("http={} json_invalido", status.as_u16());
                }
            } else {
                s1 = format!("http={}", status.as_u16());
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

    let search_resp = client.get(&url2).send().map_err(|e| {
        sanitize_ss_message(&format!("Error buscando juego en ScreenScraper: {}", e))
    })?;

    let mut s2 = format!("http={}", search_resp.status().as_u16());
    if search_resp.status().is_success() {
        if let Ok(parsed) = search_resp.json::<SsRechercheResponse>() {
            if let Some(data) = parsed.response {
                if let Some(raw_jeux) = data.jeux {
                    s2 = format!("{} candidatos={}", s2, raw_jeux.len());
                    let jeux: Vec<SsGame> = raw_jeux
                        .iter()
                        .filter_map(|v| serde_json::from_value(v.clone()).ok())
                        .collect();
                    // scoring en vez de primer resultado a ciegas: evita videos
                    // de ediciones/regiones/sistemas equivocados.
                    let best = pick_best_candidate(jeux, game_name, platform, sys_id);
                    if best.is_none() {
                        // Diagnóstico de forma real del JSON (solo claves/tipos, sin valores).
                        if let Some(first) = raw_jeux.first().and_then(|v| v.as_object()) {
                            let mut keys: Vec<&String> = first.keys().collect();
                            keys.sort();
                            let shape_of = |k: &str| {
                                first
                                    .get(k)
                                    .map(|v| {
                                        if v.is_array() {
                                            "array"
                                        } else if v.is_object() {
                                            "object"
                                        } else {
                                            "otro"
                                        }
                                    })
                                    .unwrap_or("ausente")
                            };
                            // Forma anidada: claves del primer elemento de noms y de systeme.
                            let nested_keys = |k: &str| {
                                first
                                    .get(k)
                                    .and_then(|v| {
                                        if let Some(arr) = v.as_array() {
                                            arr.first().and_then(|e| e.as_object()).map(|o| {
                                                let mut ks: Vec<&String> = o.keys().collect();
                                                ks.sort();
                                                format!("{:?}", ks)
                                            })
                                        } else {
                                            v.as_object().map(|o| {
                                                let mut ks: Vec<&String> = o.keys().collect();
                                                ks.sort();
                                                format!("{:?}", ks)
                                            })
                                        }
                                    })
                                    .unwrap_or_else(|| "-".to_string())
                            };
                            log_error(&format!(
                                "[scrape-debug] '{}': claves={:?} noms={} systeme={} noms0={} systeme_keys={}",
                                game_name,
                                keys,
                                shape_of("noms"),
                                shape_of("systeme"),
                                nested_keys("noms"),
                                nested_keys("systeme")
                            ));
                        }
                    }
                    if let Some(best) = best {
                        let best_score = score_candidate(&best, game_name, platform, sys_id);
                        let best_title = best
                            .noms
                            .as_deref()
                            .unwrap_or(&[])
                            .iter()
                            .filter_map(|n| n.nom.clone())
                            .next()
                            .unwrap_or_default();
                        let best_sys = best
                            .systeme
                            .as_ref()
                            .and_then(|s| s.nom.clone())
                            .unwrap_or_default();
                        s2 = format!(
                            "{} mejor={} '{}' [{}]",
                            s2, best_score, best_title, best_sys
                        );
                        if let Some(game_id) = best.id {
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
                                                let urls = extract_media_urls(&detail_jeu);
                                                s2 = format!(
                                                    "{} detalle_video={} detalle_logo={}",
                                                    s2,
                                                    urls.video_url.is_some(),
                                                    urls.logo_url.is_some()
                                                );
                                                if urls.video_url.is_some()
                                                    || urls.logo_url.is_some()
                                                {
                                                    return Ok(urls);
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    s2 = format!(
                                        "{} detalle_http={}",
                                        s2,
                                        detail_resp.status().as_u16()
                                    );
                                }
                            } else {
                                s2 = format!("{} detalle_sin_respuesta", s2);
                            }
                        } else {
                            s2 = format!("{} mejor_sin_id", s2);
                        }
                    } else {
                        s2 = format!("{} sin_candidato_fiable", s2);
                    }
                } else {
                    s2 = format!("{} sin_jeux", s2);
                }
            }
        }
    }

    log_error(&format!(
        "[scrape] '{}' [{}] busca='{}': s1={} s2={}",
        game_name, platform, search_title, s1, s2
    ));
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

#[cfg(test)]
mod screenscraper_tests {
    use super::*;

    fn sample_search_json() -> &'static str {
        r#"{
            "response": {
                "jeux": [
                    {"id": "1", "noms": [{"nom": "Sonic the Hedgehog", "region": "us"}], "systeme": {"id": "1", "nom": "Megadrive"}},
                    {"id": "2", "noms": [{"nom": "Sonic the Hedgehog", "region": "us"}], "systeme": {"id": "4", "nom": "Super Nintendo"}},
                    {"id": "3", "noms": [{"nom": "Sonic Spinball", "region": "us"}], "systeme": {"id": "1", "nom": "Megadrive"}}
                ]
            }
        }"#
    }

    fn parse_candidates() -> Vec<SsGame> {
        serde_json::from_str::<SsRechercheResponse>(sample_search_json())
            .unwrap()
            .response
            .unwrap()
            .jeux
            .unwrap()
            .iter()
            .filter_map(|v| serde_json::from_value(v.clone()).ok())
            .collect()
    }

    #[test]
    fn prefers_same_system_over_wrong_system() {
        let jeux = parse_candidates();
        let best = pick_best_candidate(jeux, "Sonic the Hedgehog", "MEGA_DRIVE", Some(1)).unwrap();
        assert_eq!(best.id.as_deref(), Some("1"));
    }

    #[test]
    fn switch_matches_by_system_name_without_numeric_id() {
        let jeux = vec![SsGame {
            id: Some("9".into()),
            medias: None,
            noms: Some(vec![SsNom {
                nom: Some("The Legend of Zelda Breath of the Wild".into()),
                region: None,
            }]),
            systeme: Some(SsSysteme {
                id: None,
                nom: Some("Nintendo Switch".into()),
            }),
        }];
        let best = pick_best_candidate(jeux, "Zelda Breath of the Wild", "SWITCH", None).unwrap();
        assert_eq!(best.id.as_deref(), Some("9"));
    }

    #[test]
    fn rejects_garbage_below_threshold() {
        let jeux = parse_candidates();
        assert!(pick_best_candidate(jeux, "Mario Kart 64", "N64", Some(14)).is_none());
        assert!(
            score_candidate(&parse_candidates()[2], "Mario Kart 64", "N64", Some(14))
                < MIN_CANDIDATE_SCORE
        );
    }

    #[test]
    fn tie_keeps_api_order() {
        let jeux = vec![
            SsGame {
                id: Some("a".into()),
                medias: None,
                noms: Some(vec![SsNom {
                    nom: Some("Same Game".into()),
                    region: None,
                }]),
                systeme: Some(SsSysteme {
                    id: Some("1".into()),
                    nom: Some("Megadrive".into()),
                }),
            },
            SsGame {
                id: Some("b".into()),
                medias: None,
                noms: Some(vec![SsNom {
                    nom: Some("Same Game".into()),
                    region: None,
                }]),
                systeme: Some(SsSysteme {
                    id: Some("1".into()),
                    nom: Some("Megadrive".into()),
                }),
            },
        ];
        let best = pick_best_candidate(jeux, "Same Game", "MEGA_DRIVE", Some(1)).unwrap();
        assert_eq!(best.id.as_deref(), Some("a"));
    }

    #[test]
    fn sanitize_masks_credentials() {
        let msg = "error sending request for url (https://api.screenscraper.fr/api2/jeuRecherche.php?devid=newGamePlus&devpassword=Secret123&softname=X&ssid=user1&sspassword=Pass1&recherche=sonic)";
        let clean = sanitize_ss_message(msg);
        assert!(!clean.contains("Secret123"));
        assert!(!clean.contains("Pass1"));
        assert!(!clean.contains("newGamePlus"));
        assert!(!clean.contains("user1"));
        assert!(clean.contains("recherche=sonic"));
        assert!(clean.contains("devid=***"));
        // Sin credenciales: intacto
        assert_eq!(sanitize_ss_message("plain error"), "plain error");
    }

    #[test]
    fn skips_direct_lookup_without_identifiers() {
        // Switch: sin systemeid ni hashes → la API devuelve 400, no pedir
        assert!(!can_direct_lookup(None, &None, &None));
        // Con systemeid o hashes sí compensa intentarlo
        assert!(can_direct_lookup(Some(4), &None, &None));
        assert!(can_direct_lookup(None, &Some("ABC".into()), &None));
        assert!(can_direct_lookup(None, &None, &Some("DEF".into())));
    }
}
