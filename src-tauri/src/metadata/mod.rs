pub mod headers;
pub mod libretro;
pub mod steamgrid;

pub use libretro::GameMetadata;
pub use libretro::{base_title, sequel_number, region_tokens};
pub use libretro::download_file;

use rusqlite::Connection;
use std::fs;
use std::path::Path;
use crate::platforms;

pub fn clean_display_name_from_filename(name: &str) -> String {
    let stem = Path::new(name).file_stem().and_then(|s| s.to_str()).unwrap_or(name);
    let no_paren = stem.split(" (").next().unwrap_or(stem);
    let no_bracket = no_paren.split(" [").next().unwrap_or(no_paren);
    no_bracket.trim().to_string()
}

pub fn resolve_display_name(rom_name: &str, platform: &str, meta_display_name: Option<&str>) -> Option<String> {
    if platforms::is_arcade_platform(platform) || platforms::arcade_display_name(rom_name).is_some() {
        return platforms::arcade_display_name(rom_name)
            .map(|s| s.to_string())
            .or_else(|| meta_display_name.map(|s| s.to_string()));
    }

    if platform == "PS3" {
        return Some(rom_name.to_string());
    }

    let clean_file_title = clean_display_name_from_filename(rom_name);

    if let Some(db_name) = meta_display_name {
        let db_base = base_title(db_name);
        let file_base = base_title(rom_name);

        // 1. Evitar mismatch de secuela
        if sequel_number(&db_base) != sequel_number(&file_base) {
            return Some(clean_file_title);
        }

        // 2. Rechazar variantes en italiano u otro idioma si la ROM es en español o inglés
        let db_lower = db_name.to_lowercase();
        let rom_lower = rom_name.to_lowercase();
        let is_italian_db = db_lower.contains("versione")
            || db_lower.contains("rossa")
            || db_lower.contains("blu")
            || db_lower.contains("oro")
            || db_lower.contains("argento")
            || db_lower.contains("cristallo")
            || db_lower.contains("smeraldo")
            || db_lower.contains("rubino")
            || db_lower.contains("zaffiro");

        let is_non_italian_rom = rom_lower.contains("spain")
            || rom_lower.contains("(es)")
            || rom_lower.contains("edicion")
            || rom_lower.contains("edición")
            || rom_lower.contains("usa")
            || rom_lower.contains("version")
            || rom_lower.contains("europe");

        if is_italian_db && is_non_italian_rom && !rom_lower.contains("italy") && !rom_lower.contains("(it)") {
            return Some(clean_file_title);
        }

        // 3. Si la base coincide, usar el nombre de la BD
        if file_base == db_base || db_base.starts_with(&file_base) || file_base.starts_with(&db_base) {
            return Some(db_name.to_string());
        }

        // 4. Si el archivo ya tiene un nombre legible, conservarlo
        if !clean_file_title.is_empty() && clean_file_title.len() >= 3 {
            return Some(clean_file_title);
        }

        return Some(db_name.to_string());
    }

    if !clean_file_title.is_empty() && clean_file_title != rom_name {
        Some(clean_file_title)
    } else {
        None
    }
}

/// Cadena de resolución de metadatos:
/// 1. Extracción de cabecera binaria del cartucho / disco (Strategy Pattern)
/// 2. Consulta en base de datos local libretrodb por serial
/// 3. Búsqueda exhaustiva en libretrodb
pub fn lookup_metadata(
    meta_conn: &Option<Connection>,
    path: &Path,
    game_name: &str,
) -> Option<GameMetadata> {
    let conn = meta_conn.as_ref()?;
    let platform = platforms::detect_platform(&path.to_string_lossy())
        .map(|i| i.platform)
        .unwrap_or("");

    // 1. Intentar obtener información de la cabecera binaria (GBA, NDS, GB, N64, SNES)
    if let Some(header) = headers::extract_rom_header(platform, path) {
        if let Some(serial) = &header.serial {
            if let Some(meta) = libretro::query_metadata_by_serial(conn, serial, game_name) {
                return Some(meta);
            }
        }
        if let Some(internal_title) = &header.internal_title {
            if let Some(meta) = libretro::query_game_metadata_comprehensive(conn, internal_title, platform, path) {
                let dname = meta.display_name.as_deref().unwrap_or(internal_title);
                if libretro::plausible_match(game_name, dname) {
                    return Some(meta);
                }
            }
        }
    }

    // 2. Consulta general por nombre de archivo
    libretro::query_game_metadata_comprehensive(conn, game_name, platform, path)
}

/// Cadena de Responsabilidad para Carátulas:
/// 1. Portada local ya descargada en `thumbnails/`
/// 2. Repositorio oficial Libretro Thumbnails
/// 3. SteamGridDB Fallback (HD Boxarts 600x900)
pub fn ensure_thumbnail(
    platform: &str,
    game_name: &str,
    db_name: Option<&str>,
    meta_conn: Option<&Connection>,
    steamgrid_key: Option<&str>,
    thumb_dir: &Path,
    force_refresh: bool,
) -> Option<String> {
    let safe_name = game_name.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");
    let dest = thumb_dir.join(format!("{}.png", safe_name));
    if dest.exists() && !force_refresh {
        return Some(dest.to_string_lossy().to_string());
    }

    let start_time = std::time::Instant::now();
    const MAX_THUMBNAIL_SEARCH_DURATION: std::time::Duration = std::time::Duration::from_secs(10);

    let mut candidates: Vec<String> = Vec::new();
    let target_sequel = db_name
        .and_then(|d| sequel_number(d))
        .or_else(|| sequel_number(game_name));

    let is_arcade = platforms::is_arcade_platform(platform) || platforms::arcade_display_name(game_name).is_some();
    if is_arcade {
        candidates = platforms::arcade_thumbnail_candidates(game_name, db_name);
        if let Some(db) = db_name {
            if !candidates.contains(&db.to_string()) {
                candidates.push(db.to_string());
            }
        }
        if !candidates.contains(&game_name.to_string()) {
            candidates.push(game_name.to_string());
        }
        candidates.truncate(20);
    } else {
        // 1) Candidatos directos por nombre de archivo
        for c in libretro::thumbnail_name_candidates(game_name) {
            if sequel_number(&c) == target_sequel && !candidates.contains(&c) {
                candidates.push(c);
            }
        }

        // 2) Candidatos basados en db_name
        if let Some(db) = db_name {
            for c in libretro::thumbnail_name_candidates(db) {
                if sequel_number(&c) == target_sequel && !candidates.contains(&c) {
                    candidates.push(c);
                }
            }
        }

        // 3) Consultar nombres reales No-Intro en libretrodb
        if let Some(conn) = meta_conn {
            for search_term in [db_name, Some(game_name)].into_iter().flatten() {
                let base = base_title(search_term);
                let like = format!("%{}%", base);
                if let Ok(mut stmt) = conn.prepare("SELECT name FROM roms WHERE name LIKE ?1 LIMIT 25") {
                    if let Ok(rows) = stmt.query_map([like], |r| r.get::<_, String>(0)) {
                        for row in rows.flatten() {
                            let stem = Path::new(&row).file_stem().and_then(|s| s.to_str()).unwrap_or(&row).to_string();
                            let stem_sequel = sequel_number(&base_title(&stem));
                            if stem_sequel == target_sequel && !candidates.contains(&stem) {
                                candidates.push(stem);
                            }
                        }
                    }
                }
            }
        }

        // Ordenar candidatos por relevancia
        let file_tokens = region_tokens(game_name);
        candidates.sort_by_key(|c| {
            if c.eq_ignore_ascii_case(game_name) {
                0
            } else {
                let matches_region = region_tokens(c).into_iter().any(|t| file_tokens.contains(&t));
                if matches_region { 1 } else { 2 }
            }
        });
        candidates.truncate(12);
    }

    let target_dirs = platforms::thumbnail_dirs(platform);
    let temp_dest = thumb_dir.join(format!("{}.tmp.png", safe_name));
    let mut found: Option<String> = None;

    // --- ESLABÓN 2: Búsqueda en Libretro Thumbnails ---
    'outer: for candidate in &candidates {
        if start_time.elapsed() >= MAX_THUMBNAIL_SEARCH_DURATION {
            break 'outer;
        }
        for dir in target_dirs {
            for category in ["Named_Boxarts", "Named_Snaps", "Named_Titles"] {
                if start_time.elapsed() >= MAX_THUMBNAIL_SEARCH_DURATION {
                    break 'outer;
                }
                let url = platforms::thumbnail_url_with_category_and_dir(dir, candidate, category);
                if download_file(&url, &temp_dest).is_ok() {
                    let _ = fs::rename(&temp_dest, &dest);
                    found = Some(dest.to_string_lossy().to_string());
                    break 'outer;
                }
                if start_time.elapsed() >= MAX_THUMBNAIL_SEARCH_DURATION {
                    break 'outer;
                }
                let fb_url = platforms::thumbnail_fallback_url_with_dir(dir, candidate, category);
                if download_file(&fb_url, &temp_dest).is_ok() {
                    let _ = fs::rename(&temp_dest, &dest);
                    found = Some(dest.to_string_lossy().to_string());
                    break 'outer;
                }
            }
        }
    }
    let _ = fs::remove_file(&temp_dest);

    if found.is_some() {
        return found;
    }

    // Si el archivo ya existía previamente en disco y no encontramos nueva versión, conservarlo
    if dest.exists() {
        return Some(dest.to_string_lossy().to_string());
    }

    // --- ESLABÓN 3: Fallback a SteamGridDB si está configurada la clave ---
    if let Some(key) = steamgrid_key {
        let lookup_term = db_name.unwrap_or(game_name);
        let clean_term = clean_display_name_from_filename(lookup_term);
        if let Some(path) = steamgrid::fetch_steamgrid_boxart(key, &clean_term, &dest) {
            return Some(path);
        }
    }

    None
}
