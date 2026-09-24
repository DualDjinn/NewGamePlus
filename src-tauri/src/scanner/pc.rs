use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

#[derive(Deserialize)]
struct SteamAppDetailsWrapper {
    success: bool,
    data: Option<SteamAppData>,
}

#[derive(Deserialize)]
struct SteamAppData {
    name: Option<String>,
    developers: Option<Vec<String>>,
    publishers: Option<Vec<String>>,
    genres: Option<Vec<SteamGenre>>,
    release_date: Option<SteamReleaseDate>,
}

#[derive(Deserialize)]
struct SteamGenre {
    description: Option<String>,
}

#[derive(Deserialize)]
struct SteamReleaseDate {
    date: Option<String>,
}

pub struct PcGameMetadata {
    pub display_name: Option<String>,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub genre: Option<String>,
    pub release_year: Option<i32>,
    pub cover_url: Option<String>,
    pub hero_url: Option<String>,
    pub logo_url: Option<String>,
}

/// Nombres de carpeta que se consideran contenedores de juegos de PC
pub fn is_pc_folder_name(name: &str) -> bool {
    let lower = name.to_lowercase();
    lower == "pc"
        || lower == "pc games"
        || lower == "pcgames"
        || lower == "juegos pc"
        || lower == "juegos_pc"
        || lower == "juegos de pc"
        || lower == "windows"
        || lower == "win"
        || lower == "pcroms"
        || lower == "pc_roms"
}

/// Verifica si una ruta está dentro de un directorio de PC
pub fn is_pc_path(path: &Path) -> bool {
    let path_str = path.to_string_lossy().to_lowercase();
    path_str.contains(r"\pc\")
        || path_str.contains("/pc/")
        || path_str.contains(r"\pc games\")
        || path_str.contains("/pc games/")
        || path_str.contains(r"\juegos pc\")
        || path_str.contains("/juegos pc/")
        || path_str.contains(r"\windows\")
        || path_str.contains("/windows/")
        || path.parent().is_some_and(|p| {
            p.file_name()
                .is_some_and(|n| is_pc_folder_name(&n.to_string_lossy()))
        })
}

/// Filtra ejecutables que NO son el juego principal (redistribuibles, instaladores, crash handlers, etc.)
pub fn is_blacklisted_exe(name_lower: &str) -> bool {
    name_lower.contains("crashhandler")
        || name_lower.contains("unitycrashhandler")
        || name_lower.contains("crashreport")
        || name_lower.contains("reporter")
        || name_lower.contains("bugreport")
        || name_lower.starts_with("unins")
        || name_lower.contains("uninstall")
        || name_lower.contains("vcredist")
        || name_lower.contains("vc_redist")
        || name_lower.contains("dxsetup")
        || name_lower.contains("directx")
        || name_lower.contains("dotnet")
        || name_lower.contains("oalinst")
        || name_lower.contains("setup")
        || name_lower.contains("patcher")
        || name_lower.contains("updater")
        || name_lower.contains("config")
        || name_lower.contains("settings")
        || name_lower.contains("watchdog")
}

/// Limpia el nombre de la carpeta quitando etiquetas tipo [GOG], (v1.0), release groups, etc.
pub fn clean_folder_title(folder_name: &str) -> String {
    let mut cleaned = folder_name.to_string();

    // 1. Quitar corchetes y paréntesis: [FitGirl Repack], (v1.0), [GOG], etc.
    if let Ok(re) = regex::Regex::new(r"(?i)\[.*?\]|\(.*?\)") {
        cleaned = re.replace_all(&cleaned, "").to_string();
    }

    // 2. Quitar sufijos de versión antes de reemplazar puntos: e.g. .v1.5.78, _v1.4, -v1.0, v1.2.3, Build.1234
    if let Ok(re) = regex::Regex::new(r"(?i)[._ -]+v?\d+(\.\d+)+(?:[._ -].*)?$") {
        cleaned = re.replace_all(&cleaned, "").to_string();
    }
    if let Ok(re) = regex::Regex::new(r"(?i)[._ -]+(?:v\d+|build[._ -]*\d+)(?:[._ -].*)?$") {
        cleaned = re.replace_all(&cleaned, "").to_string();
    }

    // 3. Quitar release groups al final: -GOG, -CODEX, _FLT, -FitGirl, etc.
    if let Ok(re) = regex::Regex::new(
        r"(?i)[._ -]+(gog|repack|flt|codex|skidrow|cpi|fitgirl|dodi|razor1911|plaza|hoodlum|tinyiso)(?:[._ -].*)?$",
    ) {
        cleaned = re.replace_all(&cleaned, "").to_string();
    }

    // 4. Si tiene puntos como separadores de palabras (ej. Hollow.Knight), cambiarlos por espacios
    if cleaned.contains('.') && !cleaned.contains(' ') {
        cleaned = cleaned.replace('.', " ");
    }

    // 5. Normalizar guiones bajos y múltiples espacios
    cleaned = cleaned.replace('_', " ");
    cleaned = cleaned
        .trim_matches(|c: char| !c.is_alphanumeric())
        .trim()
        .to_string();

    cleaned
}

/// Busca si existe un manifiesto de GOG (`goggame-*.info`) en la carpeta del juego para extraer el título comercial oficial
pub fn find_gog_game_title(game_dir: &Path) -> Option<String> {
    let mut check_dirs = vec![game_dir.to_path_buf()];
    if let Some(p) = game_dir.parent() {
        check_dirs.push(p.to_path_buf());
    }

    for dir in check_dirs {
        if let Ok(entries) = fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_file() {
                    if let Some(name) = p.file_name().and_then(|s| s.to_str()) {
                        if name.starts_with("goggame-") && name.ends_with(".info") {
                            if let Ok(content) = fs::read_to_string(&p) {
                                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content)
                                {
                                    if let Some(game_name) =
                                        val.get("name").and_then(|v| v.as_str())
                                    {
                                        let trimmed = game_name.trim();
                                        if !trimmed.is_empty() {
                                            return Some(trimmed.to_string());
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
    None
}

/// Busca recursivamente (hasta 7 niveles) un archivo `steam_appid.txt` para extraer el AppID de Steam
pub fn find_steam_appid(game_dir: &Path) -> Option<u32> {
    for entry in walkdir::WalkDir::new(game_dir)
        .max_depth(7)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.path().is_file() {
            if let Some(file_name) = entry.path().file_name().and_then(|s| s.to_str()) {
                if file_name.eq_ignore_ascii_case("steam_appid.txt") {
                    if let Ok(content) = fs::read_to_string(entry.path()) {
                        let trimmed = content.trim();
                        if let Ok(id) = trimmed.parse::<u32>() {
                            return Some(id);
                        }
                    }
                } else if file_name.eq_ignore_ascii_case("steam_emu.ini")
                    || file_name.eq_ignore_ascii_case("SmartSteamEmu.ini")
                    || file_name.eq_ignore_ascii_case("hlm.ini")
                    || file_name.eq_ignore_ascii_case("valve.ini")
                {
                    if let Ok(content) = fs::read_to_string(entry.path()) {
                        for line in content.lines() {
                            let trimmed = line.trim();
                            if trimmed.starts_with('#') || trimmed.starts_with(';') {
                                continue;
                            }
                            let lower = trimmed.to_lowercase();
                            if lower.starts_with("appid") {
                                if let Some((_, val)) = trimmed.split_once('=') {
                                    if let Ok(id) = val.trim().parse::<u32>() {
                                        return Some(id);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    None
}

/// Busca carátulas locales dentro de la carpeta del juego
pub fn find_local_cover(game_dir: &Path) -> Option<PathBuf> {
    let cover_names = [
        "cover.jpg",
        "cover.png",
        "cover.webp",
        "poster.jpg",
        "poster.png",
        "poster.webp",
        "boxart.jpg",
        "boxart.png",
        "folder.jpg",
        "folder.png",
    ];

    for name in &cover_names {
        let p = game_dir.join(name);
        if p.exists() {
            return Some(p);
        }
    }

    // Probar mayúsculas o variaciones
    if let Ok(entries) = fs::read_dir(game_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let file_name = entry.file_name().to_string_lossy().to_lowercase();
            if file_name.starts_with("cover.")
                || file_name.starts_with("poster.")
                || file_name.starts_with("boxart.")
                || file_name == "folder.jpg"
                || file_name == "folder.png"
            {
                return Some(entry.path());
            }
        }
    }

    None
}

/// Encuentra el ejecutable principal del juego dentro de su directorio
pub fn find_primary_pc_game_exe(game_dir: &Path) -> Option<PathBuf> {
    let folder_stem = game_dir
        .file_name()
        .map(|n| n.to_string_lossy().to_lowercase())
        .unwrap_or_default();
    let clean_folder: String = folder_stem
        .chars()
        .filter(|c| c.is_alphanumeric())
        .collect();

    // 1. Buscar en la raíz del directorio del juego
    let mut root_candidates: Vec<PathBuf> = Vec::new();
    if let Ok(entries) = fs::read_dir(game_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }
            let ext = path
                .extension()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_lowercase();
            if ext != "exe" && ext != "lnk" {
                continue;
            }
            let name_lower = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_lowercase();

            if is_blacklisted_exe(&name_lower) {
                continue;
            }

            root_candidates.push(path);
        }
    }

    if !root_candidates.is_empty() {
        // Ordenar candidatos por puntuación de similitud con el nombre de la carpeta
        root_candidates.sort_by_key(|p| {
            let stem = p
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_lowercase();
            let clean_stem: String = stem.chars().filter(|c| c.is_alphanumeric()).collect();

            let score = if clean_stem == clean_folder {
                100
            } else if clean_folder.contains(&clean_stem) && !clean_stem.is_empty() {
                80 + clean_stem.len() as i32
            } else if clean_stem.contains(&clean_folder) && !clean_folder.is_empty() {
                75
            } else if clean_stem == "game" || clean_stem == "app" || clean_stem == "start" {
                50
            } else if clean_stem.contains("launcher") {
                20
            } else {
                40
            };

            // sort_by_key es ascendente, invertimos para que el mayor puntaje quede primero
            -score
        });

        return root_candidates.into_iter().next();
    }

    // 2. Si no hay en raíz, buscar en subdirectorios tipo Binaries/Win64, bin, etc. (Unreal Engine u otros)
    let mut nested_candidates: Vec<PathBuf> = Vec::new();
    for entry in walkdir::WalkDir::new(game_dir)
        .min_depth(1)
        .max_depth(3)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if !entry.path().is_file() {
            continue;
        }
        let ext = entry
            .path()
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase();
        if ext != "exe" {
            continue;
        }
        let name_lower = entry
            .path()
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase();
        let path_lower = entry.path().to_string_lossy().to_lowercase();

        // Evitar carpetas internas de soporte/redist
        if path_lower.contains("_data")
            || path_lower.contains("monobleedingedge")
            || path_lower.contains("burstdebuginformation")
            || path_lower.contains("redist")
            || path_lower.contains("support")
            || path_lower.contains("engine")
        {
            continue;
        }

        if is_blacklisted_exe(&name_lower) {
            continue;
        }

        nested_candidates.push(entry.path().to_path_buf());
    }

    if !nested_candidates.is_empty() {
        nested_candidates.sort_by_key(|p| {
            let stem = p
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_lowercase();
            let mut score = 0;
            if stem.ends_with("-win64-shipping") || stem.ends_with("-win32-shipping") {
                score += 100;
            }
            let clean_stem: String = stem.chars().filter(|c| c.is_alphanumeric()).collect();
            if clean_folder.contains(&clean_stem) && !clean_stem.is_empty() {
                score += 50;
            }
            -score
        });
        return nested_candidates.into_iter().next();
    }

    None
}

/// Procesa las carpetas de juegos de PC y devuelve:
/// 1. El conjunto de ejecutables de juegos de PC válidos (para que sean detectados como juego)
/// 2. El conjunto de archivos secundarios de esas carpetas (para ser ignorados por el scanner)
pub fn process_pc_games(base_path: &Path) -> (HashSet<PathBuf>, HashSet<PathBuf>) {
    let mut valid_pc_games: HashSet<PathBuf> = HashSet::new();
    let mut ignored_pc_files: HashSet<PathBuf> = HashSet::new();

    // Determinar si base_path es en sí mismo una carpeta de PC o contiene carpetas de PC
    let is_base_pc = is_pc_folder_name(
        &base_path
            .file_name()
            .map(|n| n.to_string_lossy())
            .unwrap_or_default(),
    );

    let pc_dirs: Vec<PathBuf> = if is_base_pc {
        vec![base_path.to_path_buf()]
    } else {
        let mut dirs = Vec::new();
        if let Ok(entries) = fs::read_dir(base_path) {
            for entry in entries.filter_map(|e| e.ok()) {
                if entry.path().is_dir() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if is_pc_folder_name(&name) {
                        dirs.push(entry.path());
                    }
                }
            }
        }
        dirs
    };

    for pc_dir in pc_dirs {
        // 1. Archivos sueltos directamente en la carpeta PC (ej. accesos directos .lnk o ejecutables)
        if let Ok(entries) = fs::read_dir(&pc_dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                if path.is_file() {
                    let ext = path
                        .extension()
                        .and_then(|s| s.to_str())
                        .unwrap_or("")
                        .to_lowercase();
                    if ext == "exe" || ext == "lnk" {
                        let stem = path
                            .file_stem()
                            .and_then(|s| s.to_str())
                            .unwrap_or("")
                            .to_lowercase();
                        if !is_blacklisted_exe(&stem) {
                            valid_pc_games.insert(path);
                        } else {
                            ignored_pc_files.insert(path);
                        }
                    } else {
                        ignored_pc_files.insert(path);
                    }
                }
            }
        }

        // 2. Subcarpetas donde cada subcarpeta es un juego de PC
        if let Ok(entries) = fs::read_dir(&pc_dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let game_dir = entry.path();
                if !game_dir.is_dir() {
                    continue;
                }

                if let Some(primary_exe) = find_primary_pc_game_exe(&game_dir) {
                    valid_pc_games.insert(primary_exe.clone());

                    // Ignorar todos los demás archivos dentro de esta carpeta de juego
                    for file_entry in walkdir::WalkDir::new(&game_dir)
                        .into_iter()
                        .filter_map(|e| e.ok())
                    {
                        if file_entry.path().is_file() && file_entry.path() != primary_exe {
                            ignored_pc_files.insert(file_entry.path().to_path_buf());
                        }
                    }
                } else {
                    // Si no se encontró ejecutable válido, ignorar los archivos de la carpeta
                    for file_entry in walkdir::WalkDir::new(&game_dir)
                        .into_iter()
                        .filter_map(|e| e.ok())
                    {
                        if file_entry.path().is_file() {
                            ignored_pc_files.insert(file_entry.path().to_path_buf());
                        }
                    }
                }
            }
        }
    }

    (valid_pc_games, ignored_pc_files)
}

/// Resuelve el nombre y carátula local de un juego de PC
pub fn resolve_pc_game_info(rom_path: &Path) -> (String, Option<String>) {
    let parent = rom_path.parent();
    let game_dir = parent.unwrap_or(rom_path);

    let local_cover = find_local_cover(game_dir).map(|p| p.to_string_lossy().to_string());

    // 1. Si existe manifiesto oficial de GOG en la carpeta, usar ese nombre comercial
    if let Some(gog_title) = find_gog_game_title(game_dir) {
        return (gog_title, local_cover);
    }

    // Nombre resuelto: si el ejecutable está en una subcarpeta (ej: F:\Roms\PC\Aethermancer\Aethermancer.exe),
    // usar el nombre de la subcarpeta limpio. Si está suelto en PC, usar el file stem.
    let is_parent_pc = parent
        .and_then(|p| p.file_name())
        .is_some_and(|n| is_pc_folder_name(&n.to_string_lossy()));

    let title = if is_parent_pc {
        rom_path
            .file_stem()
            .map(|s| clean_folder_title(&s.to_string_lossy()))
            .unwrap_or_else(|| "PC Game".to_string())
    } else {
        // Si el ejecutable está en un subdirectorio tipo Binaries/Win64, subir hasta la carpeta del juego
        let mut curr = game_dir;
        while let Some(p) = curr.parent() {
            if let Some(p_name) = p.file_name() {
                if is_pc_folder_name(&p_name.to_string_lossy()) {
                    break;
                }
            }
            curr = p;
        }
        let folder_name = curr
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();
        clean_folder_title(&folder_name)
    };

    (title, local_cover)
}

/// Descarga un archivo por HTTP y lo guarda en dest_path
pub fn download_file_to(url: &str, dest_path: &Path) -> bool {
    let client = match reqwest::blocking::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .timeout(std::time::Duration::from_secs(4))
        .build()
    {
        Ok(c) => c,
        Err(_) => return false,
    };

    if let Ok(resp) = client.get(url).send() {
        if resp.status().is_success() {
            if let Ok(bytes) = resp.bytes() {
                let temp_path = dest_path.with_extension("tmp");
                if let Ok(mut f) = fs::File::create(&temp_path) {
                    if f.write_all(&bytes).is_ok() {
                        let _ = fs::rename(&temp_path, dest_path);
                        return true;
                    }
                }
                let _ = fs::remove_file(&temp_path);
            }
        }
    }
    false
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SteamStoreSearchResult {
    pub id: u32,
    pub name: String,
    pub tiny_image: Option<String>,
}

#[derive(Deserialize)]
struct SteamStoreSearchItem {
    id: u32,
    name: String,
    #[serde(default)]
    tiny_image: Option<String>,
    #[serde(rename = "type", default)]
    item_type: Option<String>,
}

#[derive(Deserialize)]
struct SteamStoreSearchResponse {
    #[allow(dead_code)]
    #[serde(default)]
    total: u32,
    #[serde(default)]
    items: Option<Vec<SteamStoreSearchItem>>,
}

/// Consulta la API pública de búsqueda de Steam Store por término
pub fn search_steam_store(query: &str) -> Vec<SteamStoreSearchResult> {
    let clean_query = query.trim();
    if clean_query.is_empty() {
        return Vec::new();
    }

    let url = format!(
        "https://store.steampowered.com/api/storesearch/?term={}&l=spanish&cc=US",
        urlencoding::encode(clean_query)
    );

    let client = match reqwest::blocking::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .timeout(std::time::Duration::from_secs(5))
        .build()
    {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };

    if let Ok(resp) = client.get(&url).send() {
        if resp.status().is_success() {
            if let Ok(parsed) = resp.json::<SteamStoreSearchResponse>() {
                if let Some(items) = parsed.items {
                    return items
                        .into_iter()
                        .filter(|it| {
                            let t = it.item_type.as_deref().unwrap_or("app").to_lowercase();
                            let n = it.name.to_lowercase();
                            t != "soundtrack"
                                && t != "dlc"
                                && !n.contains("soundtrack")
                                && !n.ends_with(" ost")
                        })
                        .map(|it| SteamStoreSearchResult {
                            id: it.id,
                            name: it.name,
                            tiny_image: it.tiny_image,
                        })
                        .collect();
                }
            }
        }
    }

    Vec::new()
}

fn normalize_for_match(s: &str) -> String {
    s.to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace())
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

/// Algoritmo de matching inteligente respetando secuelas (evita falsos positivos como Doom vs Doom Eternal)
pub fn match_best_steam_candidate(
    query_title: &str,
    candidates: &[SteamStoreSearchResult],
) -> Option<u32> {
    if candidates.is_empty() {
        return None;
    }

    let norm_query = normalize_for_match(query_title);
    if norm_query.is_empty() {
        return None;
    }

    let query_sequel = crate::metadata::libretro::sequel_number(query_title);
    let query_words: Vec<&str> = norm_query.split_whitespace().collect();

    let mut scored_candidates: Vec<(u32, i32)> = Vec::new();

    for cand in candidates {
        let norm_cand = normalize_for_match(&cand.name);
        let cand_sequel = crate::metadata::libretro::sequel_number(&cand.name);

        // 1. Chequeo estricto de secuela: si uno tiene número de secuela y el otro no (o difiere), descartar
        if query_sequel != cand_sequel {
            continue;
        }

        // 2. Coincidencia exacta
        if norm_query == norm_cand {
            return Some(cand.id);
        }

        let cand_words: Vec<&str> = norm_cand.split_whitespace().collect();
        if cand_words.is_empty() {
            continue;
        }

        // Descartar si es soundtrack / ost / dlc
        if cand_words.contains(&"soundtrack")
            || cand_words.contains(&"ost")
            || cand_words.contains(&"dlc")
        {
            continue;
        }

        // Comparar primera palabra significativa (ej. ignorando 'the', 'a', 'el', 'la')
        let first_sig_query = query_words
            .iter()
            .find(|&&w| w != "the" && w != "a" && w != "an" && w != "el" && w != "la");
        let first_sig_cand = cand_words
            .iter()
            .find(|&&w| w != "the" && w != "a" && w != "an" && w != "el" && w != "la");
        if let (Some(q), Some(c)) = (first_sig_query, first_sig_cand) {
            if q != c {
                continue;
            }
        }

        let mut matched_words = 0;
        for qw in &query_words {
            if cand_words.contains(qw) {
                matched_words += 1;
            }
        }

        let query_coverage = (matched_words as f32) / (query_words.len() as f32);
        let cand_coverage = (matched_words as f32) / (cand_words.len() as f32);
        let mut score = ((query_coverage * 60.0) + (cand_coverage * 40.0)) as i32;

        if norm_cand.starts_with(&norm_query) {
            score += 15;
        }

        if cand_words.len() > query_words.len() + 3 {
            score -= 15;
        }

        if score >= 60 {
            scored_candidates.push((cand.id, score));
        }
    }

    scored_candidates.sort_by_key(|b| std::cmp::Reverse(b.1));
    scored_candidates.first().map(|(id, _)| *id)
}

/// Resuelve el AppID de Steam ya sea por archivo local `steam_appid.txt` o mediante búsqueda por título
pub fn resolve_steam_appid(game_dir: &Path, title: &str) -> Option<u32> {
    // 1. Archivo local steam_appid.txt
    if let Some(id) = find_steam_appid(game_dir) {
        return Some(id);
    }

    // 2. Búsqueda en tienda de Steam por título
    let results = search_steam_store(title);
    if !results.is_empty() {
        if let Some(id) = match_best_steam_candidate(title, &results) {
            return Some(id);
        }
    }

    None
}

#[derive(Debug, Clone, Default)]
pub struct SteamRawDetails {
    pub name: Option<String>,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub genre: Option<String>,
    pub release_year: Option<i32>,
}

/// Consulta los metadatos textuales de un AppID en Steam Store sin descargar imágenes
pub fn fetch_steam_raw_details(appid: u32) -> Option<SteamRawDetails> {
    let url = format!(
        "https://store.steampowered.com/api/appdetails?appids={}&l=spanish",
        appid
    );

    let client = reqwest::blocking::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        .timeout(std::time::Duration::from_secs(4))
        .build()
        .ok()?;

    let resp = client.get(&url).send().ok()?;
    if !resp.status().is_success() {
        return None;
    }
    let json_val = resp.json::<serde_json::Value>().ok()?;
    let app_obj = json_val.get(appid.to_string())?;
    let details = serde_json::from_value::<SteamAppDetailsWrapper>(app_obj.clone()).ok()?;
    if !details.success {
        return None;
    }
    let data = details.data?;

    let mut year = None;
    if let Some(rd) = data.release_date.and_then(|r| r.date) {
        if let Ok(re) = regex::Regex::new(r"\b(19\d\d|20\d\d)\b") {
            if let Some(caps) = re.captures(&rd) {
                if let Some(m) = caps.get(1) {
                    year = m.as_str().parse::<i32>().ok();
                }
            }
        }
    }

    Some(SteamRawDetails {
        name: data.name,
        developer: data.developers.and_then(|v| v.into_iter().next()),
        publisher: data.publishers.and_then(|v| v.into_iter().next()),
        genre: data.genres.and_then(|v| v.into_iter().next()?.description),
        release_year: year,
    })
}

/// Consulta la API de Steam Store usando el AppID para obtener metadatos y arte oficial
pub fn fetch_steam_metadata(
    appid: u32,
    thumb_dir: &Path,
    heroes_dir: &Path,
    logos_dir: &Path,
    game_id: &str,
) -> PcGameMetadata {
    let raw = fetch_steam_raw_details(appid).unwrap_or_default();

    let mut meta = PcGameMetadata {
        display_name: raw.name,
        developer: raw.developer,
        publisher: raw.publisher,
        genre: raw.genre,
        release_year: raw.release_year,
        cover_url: None,
        hero_url: None,
        logo_url: None,
    };

    // Intentar descargar carátula vertical 600x900 desde CDN de Steam
    let cover_dest = thumb_dir.join(format!("{}.png", game_id));
    if !cover_dest.exists() {
        let cover_urls = [
            format!("https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{}/library_600x900_2x.jpg", appid),
            format!("https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{}/library_600x900.jpg", appid),
            format!("https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{}/header.jpg", appid),
        ];
        for c_url in &cover_urls {
            if download_file_to(c_url, &cover_dest) {
                meta.cover_url = Some(cover_dest.to_string_lossy().to_string());
                break;
            }
        }
    } else {
        meta.cover_url = Some(cover_dest.to_string_lossy().to_string());
    }

    // Descargar Hero banner desde CDN de Steam
    let hero_dest = heroes_dir.join(format!("{}.png", game_id));
    if !hero_dest.exists() {
        let hero_url = format!("https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{}/library_hero.jpg", appid);
        if download_file_to(&hero_url, &hero_dest) {
            meta.hero_url = Some(hero_dest.to_string_lossy().to_string());
        }
    } else {
        meta.hero_url = Some(hero_dest.to_string_lossy().to_string());
    }

    // Descargar Logo transparente desde CDN de Steam
    let logo_dest = logos_dir.join(format!("{}.png", game_id));
    if !logo_dest.exists() {
        let logo_url = format!(
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{}/logo.png",
            appid
        );
        if download_file_to(&logo_url, &logo_dest) {
            meta.logo_url = Some(logo_dest.to_string_lossy().to_string());
        }
    } else {
        meta.logo_url = Some(logo_dest.to_string_lossy().to_string());
    }

    meta
}
