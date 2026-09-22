use rayon::prelude::*;
use rusqlite::Connection;
use std::cell::RefCell;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tauri::Emitter;

use crate::emulator::{check_azahar, check_rpcs3, core_exists, ensure_core};
use crate::metadata;
use crate::platforms;
use crate::state::lock_state;
use crate::state::models::{Game, ScanResult};
use crate::state::storage::{get_data_dir, get_thumbnails_dir, log_error, save_state};
use crate::steamgriddb;

thread_local! {
    static THREAD_DB_CONN: RefCell<Option<Connection>> = RefCell::new(
        metadata::libretro::get_metadata_connection()
    );
}

pub fn fnv1a_id(data: &str) -> u64 {
    let mut h: u64 = 0xcbf29ce484222325;
    for b in data.bytes() {
        h ^= b as u64;
        h = h.wrapping_mul(0x100000001b3);
    }
    h
}

pub fn scan_and_fetch_cores_inner(
    app: tauri::AppHandle,
    folders: Vec<String>,
) -> Result<ScanResult, String> {
    let mut all_games = Vec::new();
    let mut cores_needed: Vec<String> = Vec::new();
    let mut cores_installed: Vec<String> = Vec::new();
    let mut seen_cores: Vec<String> = Vec::new();

    let state = lock_state();
    let existing_games = state.games.clone();
    let (profile_favs, profile_last_played, profile_play_time) = state
        .settings
        .profiles
        .iter()
        .find(|p| p.name == state.settings.current_profile)
        .map(|p| {
            (
                p.favorites.clone(),
                p.last_played.clone(),
                p.play_time_secs.clone(),
            )
        })
        .unwrap_or_default();
    let steamgrid_key = state
        .settings
        .profiles
        .iter()
        .find(|p| p.name == state.settings.current_profile)
        .and_then(|p| crate::state::secrets::reveal_opt(&p.steamgriddb_api_key));
    drop(state);

    let total_folders = folders.len();
    let thumb_dir = get_thumbnails_dir();
    let heroes_dir = steamgriddb::get_heroes_dir(&get_data_dir());
    let logos_dir = steamgriddb::get_logos_dir(&get_data_dir());

    for (fi, folder) in folders.iter().enumerate() {
        let folder_name = Path::new(folder)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| folder.clone());

        let folder_path = Path::new(folder);
        let folder_roms: Vec<PathBuf> = if folder_path.exists() {
            // Fase previa: buscar ISOs de PS3 para extraer a formato carpeta y eliminar el archivo .iso
            let ps3_isos: Vec<PathBuf> = walkdir::WalkDir::new(folder_path)
                .into_iter()
                .filter_map(|e| e.ok())
                .filter(|e| {
                    if !e.path().is_file() {
                        return false;
                    }
                    let is_iso = e
                        .path()
                        .extension()
                        .map_or(false, |ext| ext.eq_ignore_ascii_case("iso"));
                    if !is_iso {
                        return false;
                    }
                    platforms::detect_platform(&e.path().to_string_lossy())
                        .map_or(false, |info| info.platform == "PS3")
                })
                .map(|e| e.path().to_path_buf())
                .collect();

            let iso_total = ps3_isos.len();
            for (iso_idx, iso_file) in ps3_isos.into_iter().enumerate() {
                let iso_name = iso_file
                    .file_stem()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_else(|| "PS3 Game".into());

                let _ = app.emit("scan-progress", serde_json::json!({
                    "phase": "roms",
                    "current": iso_idx + 1,
                    "total": iso_total,
                    "label": format!("Extrayendo PS3 ISO ({}/{}): {}", iso_idx + 1, iso_total, iso_name),
                }));

                match crate::scanner::iso::extract_and_cleanup_ps3_iso(&iso_file, folder_path) {
                    Ok(eboot) => {
                        println!("Extracción exitosa de PS3 ISO: {}", eboot.display());
                    }
                    Err(err) => {
                        crate::state::storage::log_error(&format!(
                            "Error extrayendo PS3 ISO {}: {}",
                            iso_file.display(),
                            err
                        ));
                        eprintln!("Error extrayendo PS3 ISO {}: {}", iso_file.display(), err);
                    }
                }
            }

            // Fase previa 2: buscar y unificar juegos multidisco mediante playlists .m3u
            let mut ignored_multidisc: std::collections::HashSet<PathBuf> =
                std::collections::HashSet::new();
            for entry in walkdir::WalkDir::new(folder_path)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                if entry.path().is_dir() {
                    let ignored = crate::scanner::multidisc::process_multidisc_games(entry.path());
                    ignored_multidisc.extend(ignored);
                }
            }

            // Fase previa 3: identificar juegos nativos de PC y recopilar archivos secundarios a ignorar
            let (_valid_pc_games, ignored_pc_files) =
                crate::scanner::pc::process_pc_games(folder_path);

            walkdir::WalkDir::new(folder_path)
                .into_iter()
                .filter_map(|e| e.ok())
                .filter(|e| e.path().is_file())
                .filter(|e| !ignored_multidisc.contains(e.path()))
                .filter(|e| !ignored_pc_files.contains(e.path()))
                .filter(|e| platforms::detect_platform(&e.path().to_string_lossy()).is_some())
                .map(|e| e.path().to_path_buf())
                .collect()
        } else {
            Vec::new()
        };

        let folder_count = folder_roms.len();

        let _ = app.emit(
            "scan-progress",
            serde_json::json!({
                "phase": "folders",
                "current": fi + 1,
                "total": total_folders,
                "label": folder_name,
            }),
        );

        if folder_count == 0 {
            continue;
        }

        let processed_counter = Arc::new(AtomicUsize::new(0));
        let app_handle = app.clone();

        // Procesar ROMs en paralelo utilizando todos los núcleos de CPU disponibles
        let resolved_games: Vec<Game> = folder_roms
            .par_iter()
            .filter_map(|path| {
                let current_idx = processed_counter.fetch_add(1, Ordering::Relaxed) + 1;
                let rom_path = path.to_string_lossy().to_string();

                let scan_label = if path
                    .file_name()
                    .and_then(|s| s.to_str())
                    .map_or(false, |s| s.eq_ignore_ascii_case("eboot.bin"))
                {
                    path.parent()
                        .and_then(|p| p.parent())
                        .and_then(|p| p.parent())
                        .and_then(|p| p.file_name())
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_else(|| rom_path.clone())
                } else {
                    path.file_stem()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_else(|| rom_path.clone())
                };

                // Emitir progreso por lotes para mantener UI reactiva sin saturar IPC
                if current_idx % 5 == 0 || current_idx == folder_count {
                    let _ = app_handle.emit(
                        "scan-progress",
                        serde_json::json!({
                            "phase": "roms",
                            "current": current_idx,
                            "total": folder_count,
                            "label": scan_label,
                        }),
                    );
                }

                let info = platforms::detect_platform(&rom_path)?;
                let (resolved_name, local_cover) = if info.platform == "PS3" {
                    platforms::resolve_ps3_game_info(path)
                } else if info.platform == "PC" {
                    crate::scanner::pc::resolve_pc_game_info(path)
                } else {
                    (
                        path.file_stem()
                            .map(|n| n.to_string_lossy().to_string())
                            .unwrap_or_else(|| rom_path.clone()),
                        None,
                    )
                };
                let game_name = resolved_name;
                let game_id = format!("{:x}", fnv1a_id(&rom_path));
                let is_fav = profile_favs.contains(&game_id);
                let last_played = profile_last_played.get(&game_id).cloned();
                let play_time_secs = profile_play_time.get(&game_id).copied();

                THREAD_DB_CONN.with(|cell| {
                    let meta_conn = cell.borrow();

                    if let Some(mut g) = existing_games
                        .iter()
                        .find(|eg| eg.rom_path == rom_path)
                        .cloned()
                    {
                        let rom_name = if info.platform == "PS3" {
                            game_name.clone()
                        } else {
                            Path::new(&g.rom_path)
                                .file_stem()
                                .map(|s| s.to_string_lossy().to_string())
                                .unwrap_or_else(|| g.name.clone())
                        };
                        let metadata = metadata::lookup_metadata(&*meta_conn, path, &rom_name);
                        let new_genre =
                            metadata.as_ref().and_then(|m| m.genre.clone()).or_else(|| {
                                if platforms::is_arcade_platform(info.platform) {
                                    Some("Arcade".into())
                                } else {
                                    None
                                }
                            });
                        if new_genre.is_some() {
                            g.genre = new_genre;
                        }
                        if g.developer.is_none() {
                            g.developer = metadata.as_ref().and_then(|m| m.developer.clone());
                        }
                        if g.publisher.is_none() {
                            g.publisher = metadata.as_ref().and_then(|m| m.publisher.clone());
                        }
                        if g.release_year.is_none() {
                            g.release_year = metadata.as_ref().and_then(|m| m.release_year);
                        }
                        if g.region.is_none() {
                            g.region = metadata.as_ref().and_then(|m| m.region.clone());
                        }

                        // Enriquecer juegos de PC existentes si faltan metadatos
                        if info.platform == "PC"
                            && (g.genre.is_none()
                                || g.developer.is_none()
                                || g.cover_path.is_none()
                                || g.hero_path.is_none()
                                || g.logo_path.is_none())
                        {
                            let game_dir = path.parent().unwrap_or(path);
                            let search_term = g.display_name.as_deref().unwrap_or(&g.name);
                            if let Some(appid) =
                                crate::scanner::pc::resolve_steam_appid(game_dir, search_term)
                            {
                                let steam_meta = crate::scanner::pc::fetch_steam_metadata(
                                    appid,
                                    &thumb_dir,
                                    &heroes_dir,
                                    &logos_dir,
                                    &game_id,
                                );
                                if g.display_name.is_none()
                                    || g.display_name.as_deref() == Some(&g.name)
                                {
                                    if let Some(name) = steam_meta.display_name {
                                        g.display_name = Some(name);
                                    }
                                }
                                if g.genre.is_none() {
                                    g.genre = steam_meta.genre;
                                }
                                if g.developer.is_none() {
                                    g.developer = steam_meta.developer;
                                }
                                if g.publisher.is_none() {
                                    g.publisher = steam_meta.publisher;
                                }
                                if g.release_year.is_none() {
                                    g.release_year = steam_meta.release_year;
                                }
                                if g.cover_path.is_none() {
                                    g.cover_path = steam_meta.cover_url;
                                }
                                if g.hero_path.is_none() {
                                    g.hero_path = steam_meta.hero_url;
                                }
                                if g.logo_path.is_none() {
                                    g.logo_path = steam_meta.logo_url;
                                }
                            }
                        }

                        let name_changed = if g.custom_title == Some(true) {
                            false
                        } else {
                            let new_display_name = metadata::resolve_display_name(
                                &rom_name,
                                info.platform,
                                metadata.as_ref().and_then(|m| m.display_name.as_deref()),
                            );
                            let changed = g.display_name != new_display_name;
                            g.display_name = new_display_name;
                            changed
                        };
                        let has_valid_cover = g
                            .cover_path
                            .as_ref()
                            .map(|cp| Path::new(cp).exists())
                            .unwrap_or(false);
                        if name_changed || !has_valid_cover {
                            g.cover_path = local_cover.or_else(|| {
                                metadata::ensure_thumbnail(
                                    info.platform,
                                    &rom_name,
                                    g.display_name.as_deref(),
                                    meta_conn.as_ref(),
                                    steamgrid_key.as_deref(),
                                    &thumb_dir,
                                    name_changed,
                                )
                            });
                        }

                        // Verificar si existe hero en disco
                        if g.hero_path.is_none() {
                            let hero_direct = heroes_dir.join(format!("{}.png", g.id));
                            if hero_direct.exists() {
                                g.hero_path = Some(hero_direct.to_string_lossy().to_string());
                            }
                        }

                        // Verificar si existe logo o auto-descargar si hay clave de SteamGridDB
                        if g.logo_path.is_none() {
                            let logo_direct = logos_dir.join(format!("{}.png", g.id));
                            if logo_direct.exists() {
                                g.logo_path = Some(logo_direct.to_string_lossy().to_string());
                            } else if let Some(key) = &steamgrid_key {
                                let search_term = g.display_name.as_deref().unwrap_or(&g.name);
                                if let Some(saved) = steamgriddb::fetch_steamgrid_logo(
                                    key,
                                    search_term,
                                    &logo_direct,
                                ) {
                                    g.logo_path = Some(saved);
                                }
                            }
                        }

                        Some(g)
                    } else {
                        let mut display_name = None;
                        let mut genre = None;
                        let mut developer = None;
                        let mut publisher = None;
                        let mut release_year = None;
                        let mut cover_path = local_cover;
                        let mut existing_hero_path = None;
                        let mut existing_logo_path = None;

                        // Si es juego de PC, intentar extraer metadatos oficiales vía Steam AppID o búsqueda por título
                        if info.platform == "PC" {
                            let game_dir = path.parent().unwrap_or(path);
                            if let Some(appid) =
                                crate::scanner::pc::resolve_steam_appid(game_dir, &game_name)
                            {
                                let steam_meta = crate::scanner::pc::fetch_steam_metadata(
                                    appid,
                                    &thumb_dir,
                                    &heroes_dir,
                                    &logos_dir,
                                    &game_id,
                                );
                                if steam_meta.display_name.is_some() {
                                    display_name = steam_meta.display_name;
                                }
                                if steam_meta.genre.is_some() {
                                    genre = steam_meta.genre;
                                }
                                if steam_meta.developer.is_some() {
                                    developer = steam_meta.developer;
                                }
                                if steam_meta.publisher.is_some() {
                                    publisher = steam_meta.publisher;
                                }
                                if steam_meta.release_year.is_some() {
                                    release_year = steam_meta.release_year;
                                }
                                if cover_path.is_none() && steam_meta.cover_url.is_some() {
                                    cover_path = steam_meta.cover_url;
                                }
                                if steam_meta.hero_url.is_some() {
                                    existing_hero_path = steam_meta.hero_url;
                                }
                                if steam_meta.logo_url.is_some() {
                                    existing_logo_path = steam_meta.logo_url;
                                }
                            }
                        }

                        let metadata = if genre.is_none() || developer.is_none() {
                            metadata::lookup_metadata(&*meta_conn, path, &game_name)
                        } else {
                            None
                        };

                        if genre.is_none() {
                            genre = metadata.as_ref().and_then(|m| m.genre.clone()).or_else(|| {
                                if platforms::is_arcade_platform(info.platform) {
                                    Some("Arcade".into())
                                } else {
                                    None
                                }
                            });
                        }
                        if display_name.is_none() {
                            display_name = metadata::resolve_display_name(
                                &game_name,
                                info.platform,
                                metadata.as_ref().and_then(|m| m.display_name.as_deref()),
                            );
                        }
                        if cover_path.is_none() {
                            cover_path = metadata::ensure_thumbnail(
                                info.platform,
                                &game_name,
                                display_name.as_deref(),
                                meta_conn.as_ref(),
                                steamgrid_key.as_deref(),
                                &thumb_dir,
                                false,
                            );
                        }

                        // Verificar si existe hero en disco
                        if existing_hero_path.is_none() {
                            let hero_direct = heroes_dir.join(format!("{}.png", game_id));
                            if hero_direct.exists() {
                                existing_hero_path =
                                    Some(hero_direct.to_string_lossy().to_string());
                            } else if let Ok(entries) = fs::read_dir(&heroes_dir) {
                                for entry in entries.flatten() {
                                    let p = entry.path();
                                    if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
                                        if name.starts_with(&format!("{}_", game_id))
                                            && p.extension().map_or(false, |e| e == "png")
                                        {
                                            existing_hero_path =
                                                Some(p.to_string_lossy().to_string());
                                            break;
                                        }
                                    }
                                }
                            }
                        }

                        let logo_direct = logos_dir.join(format!("{}.png", game_id));
                        // Verificar si existe logo en disco o descargar automáticamente si hay steamgrid_key
                        if existing_logo_path.is_none() {
                            if logo_direct.exists() {
                                existing_logo_path =
                                    Some(logo_direct.to_string_lossy().to_string());
                            } else if let Ok(entries) = fs::read_dir(&logos_dir) {
                                for entry in entries.flatten() {
                                    let p = entry.path();
                                    if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
                                        if name.starts_with(&format!("{}_", game_id))
                                            && p.extension().map_or(false, |e| e == "png")
                                        {
                                            existing_logo_path =
                                                Some(p.to_string_lossy().to_string());
                                            break;
                                        }
                                    }
                                }
                            }
                        }

                        if existing_logo_path.is_none() {
                            if let Some(key) = &steamgrid_key {
                                let search_term = display_name.as_deref().unwrap_or(&game_name);
                                if let Some(saved) = steamgriddb::fetch_steamgrid_logo(
                                    key,
                                    search_term,
                                    &logo_direct,
                                ) {
                                    existing_logo_path = Some(saved);
                                }
                            }
                        }

                        // Preserve metadata previously set by fix_match, or use newly found metadata
                        let existing = existing_games.iter().find(|g| g.id == game_id);
                        let final_developer = existing
                            .and_then(|g| g.developer.clone())
                            .or(developer)
                            .or_else(|| metadata.as_ref().and_then(|m| m.developer.clone()));
                        let final_publisher = existing
                            .and_then(|g| g.publisher.clone())
                            .or(publisher)
                            .or_else(|| metadata.as_ref().and_then(|m| m.publisher.clone()));
                        let final_release_year = existing
                            .and_then(|g| g.release_year)
                            .or(release_year)
                            .or_else(|| metadata.as_ref().and_then(|m| m.release_year));
                        let region = existing
                            .and_then(|g| g.region.clone())
                            .or_else(|| metadata.as_ref().and_then(|m| m.region.clone()));

                        Some(Game {
                            id: game_id,
                            name: game_name,
                            display_name,
                            platform: info.platform.into(),
                            rom_path,
                            core_name: info.core_name.into(),
                            cover_path,
                            favorite: is_fav,
                            last_played,
                            genre,
                            play_time_secs,
                            hero_path: existing_hero_path,
                            logo_path: existing_logo_path,
                            custom_title: None,
                            developer: final_developer,
                            publisher: final_publisher,
                            release_year: final_release_year,
                            region,
                        })
                    }
                })
            })
            .collect();

        // Registrar cores requeridos
        for g in &resolved_games {
            if !seen_cores.contains(&g.core_name) {
                seen_cores.push(g.core_name.clone());
                if platforms::is_standalone_emulator(&g.core_name) {
                    let installed = match g.core_name.as_str() {
                        "rpcs3" => check_rpcs3().unwrap_or(false),
                        "azahar" => check_azahar().unwrap_or(false),
                        "pc" | "native" | "windows" => true,
                        _ => false,
                    };
                    if installed {
                        cores_installed.push(g.core_name.clone());
                    }
                } else if core_exists(&g.core_name) {
                    cores_installed.push(g.core_name.clone());
                } else {
                    cores_needed.push(g.core_name.clone());
                }
            }
        }

        all_games.extend(resolved_games);
    }

    // Auto-descargar cores faltantes
    let mut downloaded = Vec::new();
    let cores_total = cores_needed.len();
    for (ci, core_name) in cores_needed.iter().enumerate() {
        let _ = app.emit(
            "scan-progress",
            serde_json::json!({
                "phase": "cores",
                "current": ci + 1,
                "total": cores_total,
                "label": core_name,
            }),
        );
        match ensure_core(core_name) {
            Ok(_) => {
                downloaded.push(core_name.clone());
                cores_installed.push(core_name.clone());
            }
            Err(e) => {
                log_error(&format!("Core download failed {}: {}", core_name, e));
                eprintln!("Failed to download core {}: {}", core_name, e);
            }
        }
    }
    cores_needed.retain(|c| !downloaded.contains(c));

    // Persistencia atómica
    {
        let mut state = lock_state();
        state.games = all_games.clone();
        state.settings.folders = folders;
        save_state(&state);
    }

    Ok(ScanResult {
        games: all_games,
        cores_installed,
        cores_needed,
    })
}
