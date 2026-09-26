use crate::emulator::launch_game_runner;
use crate::metadata::{self, GameMetadata};
use crate::platforms;
use crate::state::lock_state;
use crate::state::models::{ControllerMapping, Game};
use crate::state::storage::save_state;
use std::fs;
use std::path::Path;

fn base64_encode(data: &[u8]) -> String {
    const TABLE: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::with_capacity(data.len().div_ceil(3) * 4);
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let triple = (b0 << 16) | (b1 << 8) | b2;
        result.push(TABLE[((triple >> 18) & 0x3F) as usize] as char);
        result.push(TABLE[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            result.push(TABLE[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
        if chunk.len() > 2 {
            result.push(TABLE[(triple & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
    }
    result
}

#[tauri::command]
pub fn get_games() -> Result<Vec<Game>, String> {
    let state = lock_state();
    let current_profile = &state.settings.current_profile;
    let profile = state
        .settings
        .profiles
        .iter()
        .find(|p| &p.name == current_profile);

    let games = state
        .games
        .iter()
        .map(|g| {
            let mut game = g.clone();
            game.favorite = profile.is_some_and(|p| p.favorites.contains(&g.id));
            game.last_played = profile.and_then(|p| p.last_played.get(&g.id).cloned());
            game.play_time_secs = profile.and_then(|p| p.play_time_secs.get(&g.id).copied());
            game
        })
        .collect();

    Ok(games)
}

#[tauri::command]
pub fn toggle_favorite(game_id: String) -> Result<bool, String> {
    let mut state = lock_state();
    let profile_name = state.settings.current_profile.clone();
    if let Some(profile) = state
        .settings
        .profiles
        .iter_mut()
        .find(|p| p.name == profile_name)
    {
        let was_fav = profile.favorites.contains(&game_id);
        if was_fav {
            profile.favorites.remove(&game_id);
        } else {
            profile.favorites.insert(game_id.clone());
        }
        if let Some(g) = state.games.iter_mut().find(|g| g.id == game_id) {
            g.favorite = !was_fav;
        }
        save_state(&state);
        Ok(!was_fav)
    } else {
        Err("Profile not found".into())
    }
}

#[tauri::command]
pub fn get_favorites_list() -> Result<Vec<String>, String> {
    let state = lock_state();
    let profile = state
        .settings
        .profiles
        .iter()
        .find(|p| p.name == state.settings.current_profile);
    Ok(profile
        .map(|p| p.favorites.iter().cloned().collect())
        .unwrap_or_default())
}

#[tauri::command]
pub fn update_game_core(game_id: String, core_name: String) -> Result<(), String> {
    let mut state = lock_state();
    if let Some(g) = state.games.iter_mut().find(|g| g.id == game_id) {
        g.core_name = core_name;
        save_state(&state);
        Ok(())
    } else {
        Err("Game not found".into())
    }
}

#[tauri::command]
pub fn launch_game(app: tauri::AppHandle, rom_path: String) -> Result<String, String> {
    launch_game_runner(app, rom_path)
}

#[tauri::command]
pub fn get_cover_data_uri(path: String) -> Option<String> {
    // Solo dentro de data/ o binaries/: sin oráculo de lectura arbitraria.
    // ponytail: starts_with léxico (sin canonicalize, que falla si el archivo
    // se borra entre medias); basta porque el llamante es nuestro frontend.
    let p = Path::new(&path);
    let data = crate::state::storage::get_data_dir();
    let bins = crate::state::storage::get_binaries_dir();
    if !(p.starts_with(&data) || p.starts_with(&bins)) {
        return None;
    }
    // Tope 10 MB: una carátula nunca debería pesar eso.
    if p.metadata()
        .map(|m| m.len() > 10 * 1024 * 1024)
        .unwrap_or(true)
    {
        return None;
    }
    let data = fs::read(&path).ok()?;
    let mime = if data.starts_with(b"\x89PNG") {
        "image/png"
    } else if data.starts_with(&[0xFF, 0xD8, 0xFF]) {
        "image/jpeg"
    } else if data.starts_with(b"RIFF") && data.len() > 12 && &data[8..12] == b"WEBP" {
        "image/webp"
    } else if data.starts_with(b"GIF87a") || data.starts_with(b"GIF89a") {
        "image/gif"
    } else {
        let ext = Path::new(&path)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("png");
        match ext.to_lowercase().as_str() {
            "jpg" | "jpeg" => "image/jpeg",
            "webp" => "image/webp",
            "gif" => "image/gif",
            _ => "image/png",
        }
    };
    Some(format!("data:{};base64,{}", mime, base64_encode(&data)))
}

#[tauri::command]
pub fn get_game_metadata(rom_path: String) -> Result<Option<GameMetadata>, String> {
    let path = Path::new(&rom_path);
    if !path.exists() {
        return Err(format!("ROM no encontrada: {}", rom_path));
    }

    let (persisted_game, target_name) = {
        let state = lock_state();
        let g = state.games.iter().find(|g| g.rom_path == rom_path).cloned();
        let name = g
            .as_ref()
            .and_then(|game| game.display_name.clone())
            .unwrap_or_else(|| {
                let platform = platforms::detect_platform(&rom_path)
                    .map(|i| i.platform)
                    .unwrap_or("");
                if platform == "PS3" {
                    platforms::resolve_ps3_game_info(path).0
                } else {
                    path.file_stem()
                        .map(|s| s.to_string_lossy().to_string())
                        .unwrap_or_default()
                }
            });
        (g, name)
    };

    let guard = metadata::libretro::SHARED_META_CONN.lock().unwrap();
    let mut meta = metadata::lookup_metadata(&guard, path, &target_name);

    if let Some(pg) = persisted_game {
        if pg.developer.is_some()
            || pg.publisher.is_some()
            || pg.release_year.is_some()
            || pg.genre.is_some()
            || pg.display_name.is_some()
            || pg.region.is_some()
        {
            let mut m = meta.unwrap_or(GameMetadata {
                display_name: None,
                release_year: None,
                release_month: None,
                developer: None,
                publisher: None,
                genre: None,
                franchise: None,
                region: None,
                rating: None,
            });
            if pg.display_name.is_some() {
                m.display_name = pg.display_name;
            }
            if pg.release_year.is_some() {
                m.release_year = pg.release_year;
            }
            if pg.developer.is_some() {
                m.developer = pg.developer;
            }
            if pg.publisher.is_some() {
                m.publisher = pg.publisher;
            }
            if pg.genre.is_some() {
                m.genre = pg.genre;
            }
            if pg.region.is_some() {
                m.region = pg.region;
            }
            meta = Some(m);
        }
    }

    Ok(meta)
}

#[tauri::command]
pub fn update_game_title(
    app: tauri::AppHandle,
    game_id: String,
    new_title: String,
) -> Result<Game, String> {
    use tauri::Emitter;
    let mut state = lock_state();
    let game = state
        .games
        .iter_mut()
        .find(|g| g.id == game_id)
        .ok_or_else(|| format!("Juego con ID {} no encontrado", game_id))?;

    let trimmed = new_title.trim();
    if trimmed.is_empty() {
        game.display_name = None;
        game.custom_title = Some(false);
    } else {
        game.display_name = Some(trimmed.to_string());
        game.custom_title = Some(true);
    }

    let updated = game.clone();
    save_state(&state);
    let _ = app.emit("covers-updated", ());
    Ok(updated)
}

#[tauri::command]
pub fn save_slot(slot_num: u8) -> Result<crate::emulator::SaveSlot, String> {
    crate::emulator::save_slot(slot_num)
}

#[tauri::command]
pub fn load_slot(game_id: String, file: String) -> Result<String, String> {
    crate::emulator::load_slot(game_id, file)
}

#[tauri::command]
pub fn list_slots(game_id: String) -> Result<Vec<crate::emulator::SaveSlot>, String> {
    crate::emulator::list_slots(game_id)
}

#[tauri::command]
pub fn delete_slot(game_id: String, file: String) -> Result<(), String> {
    crate::emulator::delete_slot(game_id, file)
}

#[tauri::command]
pub fn running_game() -> Result<Option<crate::emulator::RunningGameInfo>, String> {
    crate::emulator::running_game()
}

#[tauri::command]
pub fn is_game_running() -> Result<bool, String> {
    crate::emulator::is_game_running()
}

#[tauri::command]
pub fn ingame_continue(app: tauri::AppHandle) -> Result<(), String> {
    crate::emulator::ingame_continue(app)
}

#[tauri::command]
pub fn ingame_quit(app: tauri::AppHandle) -> Result<String, String> {
    crate::emulator::ingame_quit(app)
}

#[tauri::command]
pub fn ingame_volume(steps: i32) -> Result<(), String> {
    crate::emulator::ingame_volume(steps)
}

#[tauri::command]
pub fn ingame_mute() -> Result<(), String> {
    crate::emulator::ingame_mute()
}

#[tauri::command]
pub fn get_controller_mapping() -> Result<ControllerMapping, String> {
    let state = lock_state();
    Ok(state.settings.controller_mapping.clone())
}

#[tauri::command]
pub fn save_controller_mapping(mapping: ControllerMapping) -> Result<(), String> {
    let mut state = lock_state();
    state.settings.controller_mapping = mapping;
    save_state(&state);
    Ok(())
}

pub fn resolve_game_video(rom_path: &str, game_id: &str, video_folders: &[String]) -> Option<String> {
    let p = Path::new(rom_path);
    let exts = ["mp4", "webm", "mkv", "avi"];

    if let (Some(parent), Some(stem)) = (p.parent(), p.file_stem()) {
        let stem_str = stem.to_string_lossy();

        // 1. Same directory as ROM: <rom_dir>/<stem>.<ext>
        for ext in &exts {
            let candidate = parent.join(format!("{}.{}", stem_str, ext));
            if candidate.is_file() {
                return Some(candidate.to_string_lossy().to_string());
            }
        }

        // 2. Subfolders "videos", "video", "snaps", "snap", "media"
        let subdirs = ["videos", "video", "snaps", "snap", "media"];
        for sub in &subdirs {
            for ext in &exts {
                let candidate = parent.join(sub).join(format!("{}.{}", stem_str, ext));
                if candidate.is_file() {
                    return Some(candidate.to_string_lossy().to_string());
                }
            }
        }

        // 3. Custom video folders configured in AppSettings:
        for vf in video_folders {
            let vf_path = Path::new(vf);
            for ext in &exts {
                let candidate = vf_path.join(format!("{}.{}", stem_str, ext));
                if candidate.is_file() {
                    return Some(candidate.to_string_lossy().to_string());
                }
                if let Some(platform_dir) = parent.file_name() {
                    let sub_candidate = vf_path.join(platform_dir).join(format!("{}.{}", stem_str, ext));
                    if sub_candidate.is_file() {
                        return Some(sub_candidate.to_string_lossy().to_string());
                    }
                }
            }
        }
    }

    // 4. NewGame+ data directory: data/videos/<game_id>.<ext>
    let data_dir = crate::state::storage::get_data_dir().join("videos");
    for ext in &exts {
        let candidate = data_dir.join(format!("{}.{}", game_id, ext));
        if candidate.is_file() {
            return Some(candidate.to_string_lossy().to_string());
        }
    }

    None
}

#[tauri::command]
pub fn find_game_video(rom_path: String, game_id: String) -> Option<String> {
    let video_folders = {
        let state = crate::state::lock_state();
        state.settings.video_folders.clone()
    };
    resolve_game_video(&rom_path, &game_id, &video_folders)
}

#[tauri::command]
pub fn scan_local_videos() -> Result<crate::state::models::LocalVideoStats, String> {
    let state = crate::state::lock_state();
    let total_games = state.games.len();
    let video_folders = state.settings.video_folders.clone();
    let mut games_with_video = 0;

    for game in &state.games {
        if resolve_game_video(&game.rom_path, &game.id, &video_folders).is_some() {
            games_with_video += 1;
        }
    }

    let games_missing_video = total_games.saturating_sub(games_with_video);
    Ok(crate::state::models::LocalVideoStats {
        total_games,
        games_with_video,
        games_missing_video,
    })
}

