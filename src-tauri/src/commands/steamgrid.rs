use crate::state::lock_state;
use crate::state::models::Game;
use crate::state::secrets;
use crate::state::storage::{get_data_dir, get_thumbnails_dir, save_state};
use crate::steamgriddb::{self, FixMatchCandidate, SGDBGrid, SGDBHero, SGDBLogo};
use std::fs;
use std::path::Path;
use tauri::Emitter;

/// Key del perfil activo, descifrada. Unico punto de lectura.
fn active_sgdb_key() -> Result<String, String> {
    let state = lock_state();
    let profile_name = &state.settings.current_profile;
    state
        .settings
        .profiles
        .iter()
        .find(|p| &p.name == profile_name)
        .and_then(|p| secrets::reveal_opt(&p.steamgriddb_api_key))
        .filter(|k| !k.trim().is_empty())
        .ok_or_else(|| {
            "No hay API Key de SteamGridDB configurada. Agrégala en Configuración.".into()
        })
}

#[tauri::command]
pub fn save_steamgriddb_key(api_key: String) -> Result<(), String> {
    let valid = steamgriddb::validate_api_key(&api_key)?;
    if !valid {
        return Err("API Key de SteamGridDB inválida. Verificá tu clave en steamgriddb.com/profile/preferences/api".into());
    }
    let mut state = lock_state();
    let profile_name = state.settings.current_profile.clone();
    if let Some(profile) = state
        .settings
        .profiles
        .iter_mut()
        .find(|p| p.name == profile_name)
    {
        profile.steamgriddb_api_key = Some(secrets::protect(api_key.trim())?);
    }
    save_state(&state);
    Ok(())
}

#[tauri::command]
pub fn get_steamgriddb_key() -> Result<bool, String> {
    // Solo presencia: la key nunca sale al frontend.
    Ok(active_sgdb_key().is_ok())
}

#[tauri::command]
pub fn clear_steamgriddb_key() -> Result<(), String> {
    let mut state = lock_state();
    let profile_name = state.settings.current_profile.clone();
    if let Some(profile) = state
        .settings
        .profiles
        .iter_mut()
        .find(|p| p.name == profile_name)
    {
        profile.steamgriddb_api_key = None;
    }
    save_state(&state);
    Ok(())
}

#[tauri::command]
pub fn search_steamgriddb_heroes(game_name: String) -> Result<Vec<SGDBHero>, String> {
    let api_key = active_sgdb_key()?;

    steamgriddb::search_heroes(&api_key, &game_name)
}

/// Solo arte remoto por HTTPS: el WebView muestra estas imágenes y el
/// backend las descarga a disco. Sin http://, file:// ni data:.
fn require_https_art(url: &str) -> Result<(), String> {
    let u = url.trim();
    if u.len() > 2048 {
        return Err("URL de imagen demasiado larga".into());
    }
    if u.to_ascii_lowercase().starts_with("https://") {
        Ok(())
    } else {
        Err("Solo se permiten imágenes remotas por HTTPS".into())
    }
}

#[tauri::command]
pub fn set_game_hero(game_id: String, hero_url: String) -> Result<String, String> {
    require_https_art(&hero_url)?;
    let heroes_dir = steamgriddb::get_heroes_dir(&get_data_dir());
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let dest_path = heroes_dir.join(format!("{}_{}.png", game_id, timestamp));

    steamgriddb::download_hero(&hero_url, &dest_path)?;

    let hero_path_str = dest_path.to_string_lossy().to_string();
    {
        let mut state = lock_state();
        if let Some(game) = state.games.iter_mut().find(|g| g.id == game_id) {
            game.hero_path = Some(hero_path_str.clone());
        }
        save_state(&state);
    }

    if let Ok(entries) = fs::read_dir(&heroes_dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
                if (name == format!("{}.png", game_id)
                    || name.starts_with(&format!("{}_", game_id)))
                    && p != dest_path
                {
                    let _ = fs::remove_file(&p);
                }
            }
        }
    }

    Ok(hero_path_str)
}

#[tauri::command]
pub fn remove_game_hero(game_id: String) -> Result<(), String> {
    let mut state = lock_state();
    if let Some(game) = state.games.iter_mut().find(|g| g.id == game_id) {
        if let Some(path_str) = &game.hero_path {
            let p = Path::new(path_str);
            if p.exists() {
                let _ = fs::remove_file(p);
            }
        }
        let heroes_dir = steamgriddb::get_heroes_dir(&get_data_dir());
        if let Ok(entries) = fs::read_dir(&heroes_dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
                    if name == format!("{}.png", game_id)
                        || name.starts_with(&format!("{}_", game_id))
                    {
                        let _ = fs::remove_file(&p);
                    }
                }
            }
        }
        game.hero_path = None;
    }
    save_state(&state);
    Ok(())
}

#[tauri::command]
pub fn search_steamgriddb_logos(game_name: String) -> Result<Vec<SGDBLogo>, String> {
    let api_key = active_sgdb_key()?;

    steamgriddb::search_logos(&api_key, &game_name)
}

#[tauri::command]
pub fn set_game_logo(game_id: String, logo_url: String) -> Result<String, String> {
    require_https_art(&logo_url)?;
    let logos_dir = steamgriddb::get_logos_dir(&get_data_dir());
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let dest_path = logos_dir.join(format!("{}_{}.png", game_id, timestamp));

    steamgriddb::download_logo(&logo_url, &dest_path)?;

    let logo_path_str = dest_path.to_string_lossy().to_string();
    {
        let mut state = lock_state();
        if let Some(game) = state.games.iter_mut().find(|g| g.id == game_id) {
            game.logo_path = Some(logo_path_str.clone());
        }
        save_state(&state);
    }

    if let Ok(entries) = fs::read_dir(&logos_dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
                if (name == format!("{}.png", game_id)
                    || name.starts_with(&format!("{}_", game_id)))
                    && p != dest_path
                {
                    let _ = fs::remove_file(&p);
                }
            }
        }
    }

    Ok(logo_path_str)
}

#[tauri::command]
pub fn remove_game_logo(game_id: String) -> Result<(), String> {
    let mut state = lock_state();
    if let Some(game) = state.games.iter_mut().find(|g| g.id == game_id) {
        if let Some(path_str) = &game.logo_path {
            let p = Path::new(path_str);
            if p.exists() {
                let _ = fs::remove_file(p);
            }
        }
        let logos_dir = steamgriddb::get_logos_dir(&get_data_dir());
        if let Ok(entries) = fs::read_dir(&logos_dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
                    if name == format!("{}.png", game_id)
                        || name.starts_with(&format!("{}_", game_id))
                    {
                        let _ = fs::remove_file(&p);
                    }
                }
            }
        }
        game.logo_path = None;
    }
    save_state(&state);
    Ok(())
}

fn platform_db_name(platform: &str) -> Option<&'static str> {
    crate::metadata::libretro::db_platform_name(platform).or_else(|| {
        match platform.to_uppercase().as_str() {
            "GBA" | "GAME BOY ADVANCE" => Some("Game Boy Advance"),
            "SNES" | "SUPER NINTENDO" => Some("Super Nintendo Entertainment System"),
            "NES" => Some("Nintendo Entertainment System"),
            "N64" => Some("Nintendo 64"),
            "GBC" | "GAME BOY COLOR" => Some("Game Boy Color"),
            "GB" | "GAME BOY" => Some("Game Boy"),
            "NDS" | "NINTENDO DS" => Some("Nintendo DS"),
            "3DS" | "NINTENDO 3DS" => Some("Nintendo 3DS"),
            "PS1" | "PSX" | "PLAYSTATION" => Some("PlayStation"),
            "PS2" | "PLAYSTATION 2" => Some("PlayStation 2"),
            "PS3" | "PLAYSTATION 3" => Some("PlayStation 3"),
            "PSP" | "PLAYSTATION PORTABLE" => Some("PlayStation Portable"),
            "GAMECUBE" => Some("GameCube"),
            "MEGA_DRIVE" | "GENESIS" => Some("Mega Drive - Genesis"),
            "SMS" => Some("Master System - Mark III"),
            "GAME_GEAR" => Some("Game Gear"),
            _ => None,
        }
    })
}

fn platform_to_thumb_dirs(plat: &str) -> &'static [&'static str] {
    let dirs = crate::platforms::thumbnail_dirs(plat);
    if !dirs.is_empty() {
        return dirs;
    }
    match plat {
        "Game Boy Advance" => crate::platforms::thumbnail_dirs("GBA"),
        "Super Nintendo Entertainment System" => crate::platforms::thumbnail_dirs("SNES"),
        "Nintendo Entertainment System" => crate::platforms::thumbnail_dirs("NES"),
        "Nintendo 64" => crate::platforms::thumbnail_dirs("N64"),
        "Game Boy Color" => crate::platforms::thumbnail_dirs("GBC"),
        "Game Boy" => crate::platforms::thumbnail_dirs("GB"),
        "Nintendo DS" => crate::platforms::thumbnail_dirs("NDS"),
        "Nintendo 3DS" => crate::platforms::thumbnail_dirs("3DS"),
        "PlayStation" => crate::platforms::thumbnail_dirs("PS1"),
        "PlayStation 2" => crate::platforms::thumbnail_dirs("PS2"),
        "PlayStation 3" => crate::platforms::thumbnail_dirs("PS3"),
        "PlayStation Portable" => crate::platforms::thumbnail_dirs("PSP"),
        "GameCube" => crate::platforms::thumbnail_dirs("GAMECUBE"),
        "Mega Drive - Genesis" => crate::platforms::thumbnail_dirs("MEGA_DRIVE"),
        "Master System - Mark III" => crate::platforms::thumbnail_dirs("SMS"),
        "Game Gear" => crate::platforms::thumbnail_dirs("GAME_GEAR"),
        "Virtual Boy" => crate::platforms::thumbnail_dirs("VB"),
        _ => &[],
    }
}

#[allow(clippy::too_many_arguments)]
fn run_libretro_query(
    conn: &rusqlite::Connection,
    candidates_map: &mut std::collections::HashMap<u64, (FixMatchCandidate, i32)>,
    sql: &str,
    params: &[&dyn rusqlite::ToSql],
    base_score: i32,
    platform: Option<&str>,
    expected_plat: Option<&str>,
    year: Option<i32>,
    clean: &str,
) {
    if let Ok(mut stmt) = conn.prepare(sql) {
        if let Ok(rows) = stmt.query_map(params, |row| {
            let id: u64 = row.get(0)?;
            let display_name: Option<String> = row.get(1)?;
            let full_name: Option<String> = row.get(2)?;
            let rel_year: Option<i32> = row.get(3)?;
            let plat_name: Option<String> = row.get(4)?;
            let genre_name: Option<String> = row.get(5)?;
            let dev_name: Option<String> = row.get(6)?;
            let pub_name: Option<String> = row.get(7)?;
            let reg_name: Option<String> = row.get(8)?;
            Ok((
                id,
                display_name,
                full_name,
                rel_year,
                plat_name,
                genre_name,
                dev_name,
                pub_name,
                reg_name,
            ))
        }) {
            for item in rows.flatten() {
                let (
                    id,
                    display_name,
                    full_name,
                    rel_year,
                    plat_name,
                    genre_name,
                    dev_name,
                    pub_name,
                    reg_name,
                ) = item;
                let display_str = display_name.as_deref().unwrap_or("");
                let full_str = full_name.as_deref().unwrap_or(display_str);
                let target_name = if !full_str.is_empty() {
                    full_str
                } else {
                    display_str
                };

                let target_plat = plat_name.as_deref().or(platform).unwrap_or("");
                let thumb_dirs = platform_to_thumb_dirs(target_plat);
                let cover_url = thumb_dirs.first().map(|dir| {
                    crate::platforms::thumbnail_url_with_category_and_dir(
                        dir,
                        target_name,
                        "Named_Boxarts",
                    )
                });

                let mut score = base_score;
                if let (Some(exp), Some(act)) = (expected_plat, plat_name.as_deref()) {
                    if exp.eq_ignore_ascii_case(act) {
                        score += 50;
                    }
                }
                if let (Some(ty), Some(ry)) = (year, rel_year) {
                    if ty == ry {
                        score += 30;
                    } else if (ty - ry).abs() <= 2 {
                        score += 15;
                    }
                }
                if target_name.eq_ignore_ascii_case(clean)
                    || display_str.eq_ignore_ascii_case(clean)
                {
                    score += 40;
                }
                // Boost candidates that have richer metadata
                if genre_name.is_some() {
                    score += 5;
                }
                if dev_name.is_some() {
                    score += 5;
                }

                let cand = FixMatchCandidate {
                    id,
                    name: target_name.to_string(),
                    release_year: rel_year,
                    cover_thumb: cover_url.clone(),
                    cover_url,
                    genre: genre_name,
                    developer: dev_name,
                    publisher: pub_name,
                    platform: plat_name,
                    region: reg_name,
                };

                candidates_map
                    .entry(id)
                    .and_modify(|(existing, s)| {
                        // Keep the entry with richer metadata
                        let new_richer = cand.genre.is_some() && existing.genre.is_none();
                        if score > *s || (score == *s && new_richer) {
                            *existing = cand.clone();
                            *s = score;
                        } else {
                            *s = (*s).max(score);
                        }
                    })
                    .or_insert((cand, score));
            }
        }
    }
}

fn search_libretro_fix_match(
    title: &str,
    platform: Option<&str>,
    year: Option<i32>,
) -> Vec<FixMatchCandidate> {
    let clean = title.trim();
    if clean.is_empty() {
        return Vec::new();
    }

    let conn = match crate::metadata::libretro::get_metadata_connection() {
        Some(c) => c,
        None => return Vec::new(),
    };

    let expected_plat = platform.and_then(platform_db_name);

    // Tokens significativos
    let tokens: Vec<String> = clean
        .split(|c: char| !c.is_alphanumeric())
        .map(|w| w.trim().to_lowercase())
        .filter(|w| w.len() >= 2)
        .collect();

    let mut candidates_map: std::collections::HashMap<u64, (FixMatchCandidate, i32)> =
        std::collections::HashMap::new();

    // Base SQL con JOINs de metadata completa
    const METADATA_SELECT: &str =
        "SELECT g.id, g.display_name, g.full_name, g.release_year, p.name, \
         gn.name, d.name, pb.name, r.name \
         FROM games g \
         LEFT JOIN platforms p ON g.platform_id = p.id \
         LEFT JOIN genres gn ON g.genre_id = gn.id \
         LEFT JOIN developers d ON g.developer_id = d.id \
         LEFT JOIN publishers pb ON g.publisher_id = pb.id \
         LEFT JOIN regions r ON g.region_id = r.id";

    // Estrategia 1: Coincidencia de subcadena completa en display_name o full_name
    let pattern = format!("%{}%", clean);
    run_libretro_query(
        &conn,
        &mut candidates_map,
        &format!(
            "{} WHERE (g.display_name LIKE ?1 OR g.full_name LIKE ?1) \
                  ORDER BY (d.name IS NOT NULL) DESC, (gn.name IS NOT NULL) DESC \
                  LIMIT 30",
            METADATA_SELECT
        ),
        &[&pattern],
        100,
        platform,
        expected_plat,
        year,
        clean,
    );

    // Estrategia 2: Coincidencia de todas las palabras clave (AND)
    if tokens.len() > 1 {
        let mut conditions = Vec::new();
        let mut param_values: Vec<String> = Vec::new();
        for (i, tok) in tokens.iter().enumerate() {
            conditions.push(format!(
                "(g.display_name LIKE ?{} OR g.full_name LIKE ?{})",
                i + 1,
                i + 1
            ));
            param_values.push(format!("%{}%", tok));
        }
        let sql = format!(
            "{} WHERE {} \
             ORDER BY (d.name IS NOT NULL) DESC, (gn.name IS NOT NULL) DESC \
             LIMIT 30",
            METADATA_SELECT,
            conditions.join(" AND ")
        );
        let params_refs: Vec<&dyn rusqlite::ToSql> = param_values
            .iter()
            .map(|s| s as &dyn rusqlite::ToSql)
            .collect();
        run_libretro_query(
            &conn,
            &mut candidates_map,
            &sql,
            &params_refs,
            80,
            platform,
            expected_plat,
            year,
            clean,
        );
    }

    // Estrategia 3: Si hay pocos resultados, buscar por tokens individuales
    if candidates_map.len() < 5 && !tokens.is_empty() {
        let sig_tokens: Vec<&String> = tokens
            .iter()
            .filter(|t| t.len() >= 3 && !matches!(t.as_str(), "edition" | "edicion" | "version"))
            .collect();
        for tok in sig_tokens {
            let pat = format!("%{}%", tok);
            run_libretro_query(
                &conn,
                &mut candidates_map,
                &format!(
                    "{} WHERE (g.display_name LIKE ?1 OR g.full_name LIKE ?1) \
                          ORDER BY (d.name IS NOT NULL) DESC, (gn.name IS NOT NULL) DESC \
                          LIMIT 20",
                    METADATA_SELECT
                ),
                &[&pat],
                40,
                platform,
                expected_plat,
                year,
                clean,
            );
        }
    }

    let mut ranked: Vec<(FixMatchCandidate, i32)> = candidates_map.into_values().collect();
    ranked.sort_by_key(|b| std::cmp::Reverse(b.1));
    ranked.into_iter().take(30).map(|(c, _)| c).collect()
}

fn search_steam_fix_match(title: &str, year: Option<i32>) -> Vec<FixMatchCandidate> {
    let results = crate::scanner::pc::search_steam_store(title);
    if results.is_empty() {
        return Vec::new();
    }

    let mut candidates = Vec::new();
    for item in results.into_iter().take(10) {
        let appid = item.id;
        let details = crate::scanner::pc::fetch_steam_raw_details(appid);

        let cand_year = details.as_ref().and_then(|d| d.release_year);
        if let (Some(target_y), Some(y)) = (year, cand_year) {
            if (target_y - y).abs() > 1 && !item.name.eq_ignore_ascii_case(title) {
                continue;
            }
        }

        let cover_thumb = format!(
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{}/library_600x900.jpg",
            appid
        );
        let cover_url = format!(
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{}/library_600x900_2x.jpg",
            appid
        );

        candidates.push(FixMatchCandidate {
            id: appid as u64,
            name: details
                .as_ref()
                .and_then(|d| d.name.clone())
                .unwrap_or(item.name),
            release_year: cand_year,
            cover_thumb: Some(cover_thumb),
            cover_url: Some(cover_url),
            genre: details.as_ref().and_then(|d| d.genre.clone()),
            developer: details.as_ref().and_then(|d| d.developer.clone()),
            publisher: details.as_ref().and_then(|d| d.publisher.clone()),
            platform: Some("PC".into()),
            region: None,
        });
    }

    candidates
}

#[tauri::command]
pub fn fix_match_search(
    title: String,
    year: Option<i32>,
    agent: Option<String>,
    platform: Option<String>,
) -> Result<Vec<FixMatchCandidate>, String> {
    let chosen_agent = agent.unwrap_or_else(|| {
        if platform.as_deref() == Some("PC") {
            "steam".into()
        } else {
            "steamgriddb".into()
        }
    });

    if chosen_agent == "steam" {
        let candidates = search_steam_fix_match(&title, year);
        if candidates.is_empty() {
            return Err("No se encontraron coincidencias en la tienda de Steam.".into());
        }
        return Ok(candidates);
    }

    if chosen_agent == "libretro" {
        let candidates = search_libretro_fix_match(&title, platform.as_deref(), year);
        if candidates.is_empty() {
            return Err("No se encontraron coincidencias en la base de datos de Libretro.".into());
        }
        return Ok(candidates);
    }

    let api_key = {
        let state = lock_state();
        let profile_name = &state.settings.current_profile;
        let profile = state
            .settings
            .profiles
            .iter()
            .find(|p| &p.name == profile_name);
        profile.and_then(|p| secrets::reveal_opt(&p.steamgriddb_api_key))
    };

    if let Some(key) = api_key {
        if !key.trim().is_empty() {
            let mut sgdb_candidates = steamgriddb::search_fix_match_candidates(&key, &title, year)?;
            if !sgdb_candidates.is_empty() {
                // Cross-reference with Libretro DB to fill in metadata if available
                if let Some(conn) = crate::metadata::libretro::get_metadata_connection() {
                    for cand in &mut sgdb_candidates {
                        let query_title = cand.name.trim();
                        let like_pat = format!("%{}%", query_title);
                        if let Ok(mut stmt) = conn.prepare(
                            "SELECT gn.name, d.name, pb.name, r.name, g.release_year, p.name \
                             FROM games g \
                             LEFT JOIN platforms p ON g.platform_id = p.id \
                             LEFT JOIN genres gn ON g.genre_id = gn.id \
                             LEFT JOIN developers d ON g.developer_id = d.id \
                             LEFT JOIN publishers pb ON g.publisher_id = pb.id \
                             LEFT JOIN regions r ON g.region_id = r.id \
                             WHERE (g.display_name = ?1 OR g.full_name = ?1 OR g.display_name LIKE ?2) \
                             ORDER BY (d.name IS NOT NULL) DESC, (gn.name IS NOT NULL) DESC \
                             LIMIT 1"
                        ) {
                            if let Ok(mut rows) = stmt.query([query_title, &like_pat]) {
                                if let Ok(Some(row)) = rows.next() {
                                    if cand.genre.is_none() { cand.genre = row.get(0).ok(); }
                                    if cand.developer.is_none() { cand.developer = row.get(1).ok(); }
                                    if cand.publisher.is_none() { cand.publisher = row.get(2).ok(); }
                                    if cand.region.is_none() { cand.region = row.get(3).ok(); }
                                    if cand.release_year.is_none() { cand.release_year = row.get(4).ok(); }
                                    if cand.platform.is_none() { cand.platform = row.get(5).ok(); }
                                }
                            }
                        }
                    }
                }
                return Ok(sgdb_candidates);
            }
        }
    }

    // Si no hay key o no devolvió resultados en SGDB, probar Libretro
    let candidates = search_libretro_fix_match(&title, platform.as_deref(), year);
    if candidates.is_empty() {
        return Err("No se encontraron coincidencias. Configura tu API Key de SteamGridDB en Ajustes o prueba con otro término.".into());
    }
    Ok(candidates)
}

#[tauri::command]
pub fn fix_match_get_covers(game_id: u64) -> Result<Vec<SGDBGrid>, String> {
    let api_key = active_sgdb_key()?;

    steamgriddb::get_grids_for_game(&api_key, game_id)
}

#[allow(clippy::too_many_arguments)]
#[tauri::command]
pub fn apply_fix_match(
    app: tauri::AppHandle,
    game_id: String,
    new_title: Option<String>,
    cover_url: Option<String>,
    release_year: Option<i32>,
    genre: Option<String>,
    developer: Option<String>,
    publisher: Option<String>,
    region: Option<String>,
    apply_metadata: bool,
    apply_cover: bool,
) -> Result<Game, String> {
    let mut cover_path_str: Option<String> = None;
    let title_for_logo = new_title.clone();

    if apply_cover {
        if let Some(ref url) = cover_url {
            if !url.trim().is_empty() {
                require_https_art(url)?;
                let thumb_dir = get_thumbnails_dir();
                let title_to_slug = new_title.as_deref().unwrap_or(&game_id);
                let safe_title =
                    title_to_slug.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");
                let timestamp = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_millis())
                    .unwrap_or(0);
                let dest_path = thumb_dir.join(format!("{}_{}.png", safe_title, timestamp));

                steamgriddb::download_cover(url, &dest_path)?;
                cover_path_str = Some(dest_path.to_string_lossy().to_string());
            }
        }
    }

    let updated_game: Game;

    {
        let mut state = lock_state();
        let api_key_opt = {
            let profile_name = &state.settings.current_profile;
            state
                .settings
                .profiles
                .iter()
                .find(|p| &p.name == profile_name)
                .and_then(|p| secrets::reveal_opt(&p.steamgriddb_api_key))
        };
        let game = state
            .games
            .iter_mut()
            .find(|g| g.id == game_id)
            .ok_or_else(|| format!("Juego con ID {} no encontrado", game_id))?;

        if apply_metadata {
            if let Some(ref t) = new_title {
                if !t.trim().is_empty() {
                    game.display_name = Some(t.clone());
                }
            }
            if let Some(y) = release_year {
                game.release_year = Some(y);
            }
            if let Some(ref g) = genre {
                if !g.is_empty() {
                    game.genre = Some(g.clone());
                }
            }
            if let Some(ref d) = developer {
                if !d.is_empty() {
                    game.developer = Some(d.clone());
                }
            }
            if let Some(ref p) = publisher {
                if !p.is_empty() {
                    game.publisher = Some(p.clone());
                }
            }
            if let Some(ref r) = region {
                if !r.is_empty() {
                    game.region = Some(r.clone());
                }
            }
        }

        if apply_cover {
            if let Some(c_path) = cover_path_str {
                game.cover_path = Some(c_path);
            }

            // Si la carátula viene de Steam, intentar descargar también hero y logo oficiales de Steam
            if let Some(ref url) = cover_url {
                if let Ok(re) = regex::Regex::new(r"apps/(\d+)/") {
                    if let Some(caps) = re.captures(url) {
                        if let Some(m) = caps.get(1) {
                            if let Ok(appid) = m.as_str().parse::<u32>() {
                                let heroes_dir = steamgriddb::get_heroes_dir(&get_data_dir());
                                let hero_dest = heroes_dir.join(format!("{}.png", game_id));
                                let hero_url = format!("https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{}/library_hero.jpg", appid);
                                if crate::scanner::pc::download_file_to(&hero_url, &hero_dest) {
                                    game.hero_path = Some(hero_dest.to_string_lossy().to_string());
                                }

                                let logos_dir = steamgriddb::get_logos_dir(&get_data_dir());
                                let logo_dest = logos_dir.join(format!("{}.png", game_id));
                                let logo_url = format!("https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{}/logo.png", appid);
                                if crate::scanner::pc::download_file_to(&logo_url, &logo_dest) {
                                    game.logo_path = Some(logo_dest.to_string_lossy().to_string());
                                }
                            }
                        }
                    }
                }
            }

            // Si aún no tiene logo y hay API Key de SteamGridDB, intentar obtenerlo de SGDB
            if game.logo_path.is_none() {
                if let Some(key) = api_key_opt {
                    let lookup_name = title_for_logo
                        .as_deref()
                        .or(game.display_name.as_deref())
                        .unwrap_or(&game.name);
                    let logos_dir = steamgriddb::get_logos_dir(&get_data_dir());
                    let logo_dest = logos_dir.join(format!("{}.png", game_id));
                    if let Some(saved) =
                        steamgriddb::fetch_steamgrid_logo(&key, lookup_name, &logo_dest)
                    {
                        game.logo_path = Some(saved);
                    }
                }
            }
        }

        updated_game = game.clone();
        save_state(&state);
    }

    if apply_cover {
        let _ = app.emit("covers-updated", ());
    }

    Ok(updated_game)
}
