use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RAAchievement {
    pub id: u32,
    pub title: String,
    pub description: String,
    pub points: u32,
    pub badge_name: String,
    pub date_earned: Option<String>,
    pub date_earned_hardcore: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RAGameProgress {
    pub ra_game_id: u32,
    pub game_title: String,
    pub console_name: String,
    pub icon_url: String,
    pub total: u32,
    pub unlocked: u32,
    pub unlocked_hc: u32,
    pub completion_pct: f32,
    pub achievements: Vec<RAAchievement>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[allow(dead_code)]
pub struct RAUserSummary {
    pub username: String,
    pub total_points: u32,
    pub total_points_hardcore: u32,
    pub rank: Option<u32>,
    pub total_games_played: u32,
    pub total_achievements_earned: u32,
}

fn get_data_dir() -> PathBuf {
    let dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."))
        .join("data");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

pub fn get_achievements_cache_dir() -> PathBuf {
    let dir = get_data_dir().join("achievements");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

/// Autentica con RetroAchievements y devuelve un token de sesión para cheevos_token.
/// POST con formulario: la contraseña nunca viaja en la URL (ni a logs/proxy).
/// El password solo vive en este frame: no se persiste (ver save_ra_credentials).
pub fn ra_login(username: &str, password: &str) -> Result<String, String> {
    let client = crate::emulator::downloader::get_http_client();
    let resp = client
        .post("https://retroachievements.org/dorequest.php")
        .form(&[("r", "login"), ("u", username), ("p", password)])
        .send()
        .map_err(|e| e.to_string())?;

    #[derive(Deserialize)]
    #[allow(non_snake_case)]
    struct LoginResp {
        Success: bool,
        Token: Option<String>,
    }

    let data: LoginResp = resp
        .json()
        .map_err(|e| format!("Error al parsear respuesta de login: {}", e))?;
    if data.Success {
        data.Token
            .ok_or_else(|| "Login exitoso pero no se recibió token".into())
    } else {
        Err("Usuario o contraseña incorrectos".into())
    }
}

pub fn ra_resolve_game_id(hash: &str) -> Result<u32, String> {
    let url = format!(
        "https://retroachievements.org/dorequest.php?r=gameid&m={}",
        hash
    );
    let resp = reqwest::blocking::get(&url).map_err(|e| e.to_string())?;

    #[derive(Deserialize)]
    #[allow(non_snake_case)]
    struct Resp {
        Success: bool,
        GameID: u32,
    }

    let data: Resp = resp.json().map_err(|e| e.to_string())?;
    if data.Success && data.GameID > 0 {
        // Normalización: RetroAchievements utiliza prefijos de 10 dígitos (>= 1_000_000_000)
        // para ROMs no soportadas oficialmente ("Unsupported Game Version" como 1100000724 para Pokémon Rojo)
        // o subconjuntos/variantes (como 1000000762 para Final Fantasy I & II).
        // En la Web API de logros, estos IDs devuelven listas vacías porque los logros residen en el ID base:
        // base_id = id % 1_000_000.
        let resolved = if data.GameID >= 1_000_000_000 {
            let base = data.GameID % 1_000_000;
            if base > 0 {
                base
            } else {
                data.GameID
            }
        } else {
            data.GameID
        };
        Ok(resolved)
    } else {
        Err("Game not found".into())
    }
}

pub fn ra_get_game_progress(
    username: &str,
    api_key: &str,
    ra_game_id: u32,
    target_user: &str,
) -> Result<RAGameProgress, String> {
    let url = format!(
        "https://retroachievements.org/API/API_GetGameInfoAndUserProgress.php?z={}&y={}&g={}&u={}",
        username, api_key, ra_game_id, target_user
    );
    let resp = reqwest::blocking::get(&url).map_err(|e| e.to_string())?;

    #[derive(Deserialize)]
    #[allow(non_snake_case)]
    struct ApiAch {
        ID: u32,
        Title: String,
        Description: String,
        Points: u32,
        BadgeName: String,
        DateEarned: Option<String>,
        DateEarnedHardcore: Option<String>,
    }

    #[derive(Deserialize)]
    #[allow(non_snake_case)]
    struct ApiResp {
        ID: u32,
        Title: String,
        ConsoleName: String,
        ImageIcon: String,
        NumAchievements: u32,
        NumAwardedToUser: u32,
        NumAwardedToUserHardcore: u32,
        UserCompletion: String,
        Achievements: HashMap<String, ApiAch>,
    }

    let data: ApiResp = resp.json().map_err(|e| e.to_string())?;

    let mut achievements = Vec::new();
    for (_, ach) in data.Achievements {
        achievements.push(RAAchievement {
            id: ach.ID,
            title: ach.Title,
            description: ach.Description,
            points: ach.Points,
            badge_name: ach.BadgeName,
            date_earned: ach.DateEarned,
            date_earned_hardcore: ach.DateEarnedHardcore,
        });
    }

    let completion_pct: f32 = data
        .UserCompletion
        .trim_end_matches('%')
        .parse()
        .unwrap_or(0.0);

    Ok(RAGameProgress {
        ra_game_id: data.ID,
        game_title: data.Title,
        console_name: data.ConsoleName,
        icon_url: format!("https://media.retroachievements.org{}", data.ImageIcon),
        total: data.NumAchievements,
        unlocked: data.NumAwardedToUser,
        unlocked_hc: data.NumAwardedToUserHardcore,
        completion_pct,
        achievements,
    })
}

pub fn ra_validate_credentials(username: &str, api_key: &str) -> Result<bool, String> {
    let url = format!(
        "https://retroachievements.org/API/API_GetUserSummary.php?z={}&y={}&u={}&g=0&a=0",
        username, api_key, username
    );
    let resp = reqwest::blocking::get(&url).map_err(|e| e.to_string())?;

    let json_val: serde_json::Value = resp.json().map_err(|e| e.to_string())?;

    if json_val.get("TotalPoints").is_some() || json_val.get("UserPic").is_some() {
        Ok(true)
    } else {
        Ok(false)
    }
}

pub fn ra_is_supported_platform(platform: &str) -> bool {
    matches!(
        platform.to_uppercase().as_str(),
        "NES"
            | "SNES"
            | "N64"
            | "GB"
            | "GBC"
            | "GBA"
            | "NDS"
            | "MEGA_DRIVE"
            | "SMS"
            | "GAME_GEAR"
            | "PCE"
            | "32X"
            | "PS1"
            | "PS2"
            | "PSP"
            | "NEOGEO"
            | "MAME"
            | "VB"
            | "NGP"
            | "WSWAN"
            | "LYNX"
            | "COLECOVISION"
    )
}

pub fn ra_hash_rom(path: &Path, platform: &str) -> Result<String, String> {
    if !ra_is_supported_platform(platform) {
        return Err(format!(
            "Plataforma '{}' no soportada por RetroAchievements",
            platform
        ));
    }

    let mut file = fs::File::open(path).map_err(|e| e.to_string())?;
    let plat_lower = platform.to_lowercase();

    // Consolas con procesamiento especial de cabeceras/swapping (archivos pequeños < 64MB)
    if matches!(plat_lower.as_str(), "nes" | "snes" | "n64") {
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
        if buffer.is_empty() {
            return Err("Empty file".into());
        }
        let mut context = md5::Context::new();
        match plat_lower.as_str() {
            "nes" => {
                if buffer.len() >= 16 && &buffer[0..4] == b"NES\x1a" {
                    context.consume(&buffer[16..]);
                } else {
                    context.consume(&buffer);
                }
            }
            "snes" => {
                if buffer.len() % 1024 == 512 {
                    context.consume(&buffer[512..]);
                } else {
                    context.consume(&buffer);
                }
            }
            "n64" => {
                if buffer.len() >= 4 {
                    if buffer[0] == 0x80 && buffer[1] == 0x37 {
                        context.consume(&buffer);
                    } else if buffer[0] == 0x37 && buffer[1] == 0x80 {
                        let mut swapped = buffer.clone();
                        for i in (0..swapped.len()).step_by(2) {
                            if i + 1 < swapped.len() {
                                swapped.swap(i, i + 1);
                            }
                        }
                        context.consume(&swapped);
                    } else if buffer[0] == 0x40 && buffer[1] == 0x12 {
                        let mut reversed = buffer.clone();
                        for i in (0..reversed.len()).step_by(4) {
                            if i + 3 < reversed.len() {
                                reversed.swap(i, i + 3);
                                reversed.swap(i + 1, i + 2);
                            }
                        }
                        context.consume(&reversed);
                    } else {
                        context.consume(&buffer);
                    }
                } else {
                    context.consume(&buffer);
                }
            }
            _ => context.consume(&buffer),
        }
        let hash = context.compute();
        return Ok(format!("{:x}", hash));
    }

    // Para medios de disco óptico (PS1, PS2, PSP, etc.) o archivos grandes (>64MB),
    // RetroAchievements no hashea la imagen ISO/BIN completa (usa seriales o pistas específicas).
    // Hashear gigabytes en disco satura el I/O y causa congelamientos. Omitir para ir directo a la resolución inteligente.
    let file_size = file.metadata().map(|m| m.len()).unwrap_or(0);
    if file_size > 64 * 1024 * 1024
        || matches!(
            plat_lower.as_str(),
            "ps1" | "ps2" | "psp" | "gamecube" | "dreamcast"
        )
    {
        return Err("Omitiendo hash completo de archivo grande/disco para usar resolución por título/consola".into());
    }

    // Para consolas con cartuchos medianos (< 64MB), procesar por chunks
    let mut context = md5::Context::new();
    let mut chunk = [0u8; 64 * 1024];
    let mut total_read = 0;
    loop {
        let n = file.read(&mut chunk).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        context.consume(&chunk[..n]);
        total_read += n;
    }

    if total_read == 0 {
        return Err("Empty file".into());
    }

    let hash = context.compute();
    Ok(format!("{:x}", hash))
}

pub fn get_cached_progress(ra_game_id: u32) -> Option<RAGameProgress> {
    let cache_dir = get_achievements_cache_dir();
    let file_path = cache_dir.join(format!("{}.json", ra_game_id));

    if file_path.exists() {
        if let Ok(metadata) = fs::metadata(&file_path) {
            if let Ok(modified) = metadata.modified() {
                if let Ok(duration) = SystemTime::now().duration_since(modified) {
                    if duration.as_secs() < 15 * 60 {
                        if let Ok(content) = fs::read_to_string(&file_path) {
                            if let Ok(progress) = serde_json::from_str(&content) {
                                return Some(progress);
                            }
                        }
                    }
                }
            }
        }
    }
    None
}

pub fn save_progress_cache(ra_game_id: u32, progress: &RAGameProgress) {
    let cache_dir = get_achievements_cache_dir();
    let file_path = cache_dir.join(format!("{}.json", ra_game_id));

    if let Ok(json) = serde_json::to_string(progress) {
        let _ = fs::write(file_path, json);
    }
}

/// Mapea la plataforma de GameFlix al ConsoleID oficial de RetroAchievements
pub fn ra_get_console_id(platform: &str) -> Option<u32> {
    match platform.to_uppercase().as_str() {
        "MEGA_DRIVE" => Some(1),
        "N64" => Some(2),
        "SNES" => Some(3),
        "GB" => Some(4),
        "GBA" => Some(5),
        "GBC" => Some(6),
        "NES" => Some(7),
        "PCE" => Some(8),
        "32X" => Some(10),
        "SMS" => Some(11),
        "PS1" => Some(12),
        "GAME_GEAR" => Some(14),
        "NDS" => Some(18),
        "PS2" => Some(21),
        "PSP" => Some(41),
        "NEOGEO" => Some(27),
        "VB" => Some(28),
        "NGP" => Some(39),
        "WSWAN" => Some(53),
        "LYNX" => Some(13),
        "COLECOVISION" => Some(44),
        _ => None,
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[allow(non_snake_case)]
pub struct RAGameListItem {
    pub Title: String,
    pub ID: u32,
    #[serde(default)]
    pub ConsoleID: Option<u32>,
    #[serde(default)]
    pub ConsoleName: Option<String>,
    #[serde(default)]
    pub ImageIcon: Option<String>,
    #[serde(default)]
    pub NumAchievements: u32,
    #[serde(default)]
    pub Hashes: Vec<String>,
}

/// Obtiene y cachea localmente la lista de juegos de una consola en RetroAchievements (validez 7 días)
pub fn ra_get_console_games(
    username: &str,
    api_key: &str,
    console_id: u32,
) -> Result<Vec<RAGameListItem>, String> {
    let cache_dir = get_achievements_cache_dir();
    let cache_file = cache_dir.join(format!("console_{}.json", console_id));

    // Si existe y tiene menos de 7 días, usar la versión en caché local
    if cache_file.exists() {
        if let Ok(metadata) = fs::metadata(&cache_file) {
            if let Ok(modified) = metadata.modified() {
                if let Ok(duration) = SystemTime::now().duration_since(modified) {
                    if duration.as_secs() < 7 * 24 * 3600 {
                        if let Ok(content) = fs::read_to_string(&cache_file) {
                            if let Ok(list) = serde_json::from_str::<Vec<RAGameListItem>>(&content)
                            {
                                return Ok(list);
                            }
                        }
                    }
                }
            }
        }
    }

    let url = format!(
        "https://retroachievements.org/API/API_GetGameList.php?z={}&y={}&i={}&h=1",
        username, api_key, console_id
    );
    let resp = reqwest::blocking::get(&url).map_err(|e| e.to_string())?;
    let list: Vec<RAGameListItem> = resp
        .json()
        .map_err(|e| format!("Error parseando lista de juegos: {}", e))?;

    if let Ok(json) = serde_json::to_string(&list) {
        let _ = fs::write(&cache_file, json);
    }

    Ok(list)
}

fn clean_title_for_match(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    // Normalizar diacríticos / diéresis comunes (ej. Einhänder -> Einhander)
    let s_lower = s.to_lowercase();
    let s_norm = s_lower
        .replace(['á', 'à', 'ä', 'â'], "a")
        .replace(['é', 'è', 'ë', 'ê'], "e")
        .replace(['í', 'ì', 'ï', 'î'], "i")
        .replace(['ó', 'ò', 'ö', 'ô'], "o")
        .replace(['ú', 'ù', 'ü', 'û'], "u")
        .replace('ñ', "n")
        .replace("ae", "a"); // Einhänder / Einhaender

    // Eliminar etiquetas entre paréntesis o corchetes: (USA), [PAL], [SLES-xxxx]
    let mut in_paren = 0;
    let mut in_bracket = 0;
    for c in s_norm.chars() {
        match c {
            '(' => in_paren += 1,
            ')' => {
                if in_paren > 0 {
                    in_paren -= 1
                }
            }
            '[' => in_bracket += 1,
            ']' => {
                if in_bracket > 0 {
                    in_bracket -= 1
                }
            }
            _ => {
                if in_paren == 0 && in_bracket == 0 {
                    if c.is_alphanumeric() {
                        out.push(c);
                    } else {
                        out.push(' ');
                    }
                }
            }
        }
    }

    // Colapsar espacios múltiples
    out.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn extract_sequel_num(s: &str) -> Option<&'static str> {
    let s_lower = s.to_lowercase();
    let words: Vec<&str> = s_lower
        .split(|c: char| !c.is_alphanumeric())
        .filter(|w| !w.is_empty())
        .collect();
    for w in words {
        match w {
            "2" | "ii" | "2nd" => return Some("2"),
            "3" | "iii" | "3rd" => return Some("3"),
            "4" | "iv" | "4th" => return Some("4"),
            "5" | "v" | "5th" => return Some("5"),
            "6" | "vi" | "6th" => return Some("6"),
            "7" | "vii" | "7th" => return Some("7"),
            "8" | "viii" | "8th" => return Some("8"),
            "9" | "ix" | "9th" => return Some("9"),
            "10" | "x" | "10th" => return Some("10"),
            "11" | "xi" | "11th" => return Some("11"),
            "12" | "xii" | "12th" => return Some("12"),
            _ => {}
        }
    }
    None
}

/// Resuelve el GameID de RetroAchievements comparando títulos inteligentemente
pub fn ra_resolve_game_id_by_title(
    title_candidates: &[&str],
    games_list: &[RAGameListItem],
) -> Option<u32> {
    for &raw_title in title_candidates {
        if raw_title.trim().is_empty() {
            continue;
        }

        let user_norm = clean_title_for_match(raw_title);
        let user_seq = extract_sequel_num(raw_title);

        if user_norm.is_empty() {
            continue;
        }

        // 1. Coincidencia exacta limpia directa
        for g in games_list {
            if g.Title.starts_with('~') || g.Title.contains("[Subset") {
                continue;
            }
            if clean_title_for_match(&g.Title) == user_norm {
                return Some(g.ID);
            }
        }

        // 2. Coincidencia por puntuación y palabras clave
        let mut best: Option<&RAGameListItem> = None;
        let mut best_score: i32 = -1;
        let u_words: Vec<&str> = user_norm.split(' ').filter(|w| w.len() > 1).collect();

        for g in games_list {
            if g.Title.starts_with('~') || g.Title.contains("[Subset") {
                continue;
            }

            let g_seq = extract_sequel_num(&g.Title);
            if user_seq != g_seq {
                continue; // El número de secuela (II, 2, 3, etc.) debe coincidir estrictamente
            }

            let g_norm = clean_title_for_match(&g.Title);
            let g_words: Vec<&str> = g_norm.split(' ').filter(|w| w.len() > 1).collect();

            let matched_words = u_words.iter().filter(|w| g_words.contains(w)).count();
            if matched_words == 0 {
                continue;
            }

            let mut score: i32 = (matched_words as i32) * 10
                - ((u_words.len() as i32) - (g_words.len() as i32)).abs() * 2;

            if g_norm.starts_with(&user_norm) || user_norm.starts_with(&g_norm) {
                score += 15;
            }
            if g.NumAchievements > 0 {
                score += 5; // Priorizar juegos que tienen logros activos
            }

            let min_required = std::cmp::min(2, u_words.len());
            if score > best_score && matched_words >= min_required {
                best_score = score;
                best = Some(g);
            }
        }

        if let Some(matched_game) = best {
            return Some(matched_game.ID);
        }
    }

    None
}
