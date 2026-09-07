mod achievements;
mod commands;
mod emulator;
mod metadata;
mod platforms;
mod scanner;
mod state;
mod steamgriddb;

#[cfg(test)]
mod tests;

use std::path::Path;
use tauri::{Emitter, Manager};

use emulator::get_retroarch_exe;
use state::storage::{load_state, migrate_legacy_saves, save_state};
use state::STATE;

fn main() {
    // 1. Cargar estado persistente al iniciar
    let mut initial = load_state();

    // Migrar last_played heredado al perfil activo si el perfil aún no tiene ninguno
    let profile_name = initial.settings.current_profile.clone();
    if let Some(profile) = initial.settings.profiles.iter_mut().find(|p| p.name == profile_name) {
        if profile.last_played.is_empty() {
            for game in &initial.games {
                if let Some(ts) = &game.last_played {
                    profile.last_played.insert(game.id.clone(), ts.clone());
                }
            }
        }
    }

    // Migrar saves compartidos al perfil activo
    migrate_legacy_saves(&profile_name, &get_retroarch_exe());

    // Migrar cores antiguos de MAME a fbneo
    for game in &mut initial.games {
        if game.platform == "MAME" && (game.core_name == "mame2003_plus" || game.core_name == "mame") {
            game.core_name = "fbneo".into();
        }
    }
    if let Some(mame_core) = initial.settings.platform_cores.get_mut("MAME") {
        if mame_core == "mame2003_plus" || mame_core == "mame" {
            *mame_core = "fbneo".into();
        }
    }

    save_state(&initial);
    {
        let mut state = STATE.lock().unwrap();
        *state = initial;
    }

    // 2. Iniciar Tauri Application
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let state = STATE.lock().unwrap();
            if state.settings.kiosk_mode {
                let handle = app.handle();
                if let Some(window) = handle.get_webview_window("main") {
                    let _ = window.set_fullscreen(true);
                    let _ = window.set_decorations(false);
                }
            }
            drop(state);

            // Resuelve en segundo plano cualquier carátula faltante
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                let (games_to_check, meta_conn) = {
                    let state = STATE.lock().unwrap();
                    let games = state.games.clone();
                    let meta_conn = metadata::libretro::get_metadata_connection();
                    (games, meta_conn)
                };

                let steamgrid_key = {
                    let state = STATE.lock().unwrap();
                    let profile_name = &state.settings.current_profile;
                    state.settings.profiles.iter()
                        .find(|p| &p.name == profile_name)
                        .and_then(|p| p.steamgriddb_api_key.clone())
                };

                let mut updated = false;
                let mut new_games = Vec::with_capacity(games_to_check.len());

                for mut g in games_to_check {
                    let has_valid_cover = g.cover_path.as_ref().map(|cp| Path::new(cp).exists()).unwrap_or(false);
                    let path = Path::new(&g.rom_path);
                    let rom_name = path.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_else(|| g.name.clone());

                    let new_display_name = if g.display_name.is_none() {
                        platforms::arcade_display_name(&rom_name).map(|s| s.to_string())
                    } else {
                        g.display_name.clone()
                    };
                    if new_display_name != g.display_name {
                        g.display_name = new_display_name;
                        updated = true;
                    }

                    if !has_valid_cover {
                        if let Some(new_cover) = metadata::ensure_thumbnail(
                            &g.platform,
                            &rom_name,
                            g.display_name.as_deref(),
                            meta_conn.as_ref(),
                            steamgrid_key.as_deref(),
                            &state::storage::get_thumbnails_dir(),
                            false,
                        ) {
                            g.cover_path = Some(new_cover);
                            updated = true;
                        }
                    }
                    new_games.push(g);
                }

                if updated {
                    {
                        let mut state = STATE.lock().unwrap();
                        state.games = new_games;
                        save_state(&state);
                    }
                    let _ = app_handle.emit("covers-updated", ());
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::launch_game,
            commands::scan_and_fetch_cores,
            commands::get_games,
            commands::toggle_favorite,
            commands::check_core,
            commands::check_retroarch,
            commands::check_rpcs3,
            commands::get_cover_data_uri,
            commands::get_favorites_list,
            commands::get_settings,
            commands::save_settings,
            commands::set_kiosk_mode,
            commands::update_game_core,
            commands::create_profile,
            commands::delete_profile,
            commands::switch_profile,
            commands::export_library,
            commands::import_library,
            commands::get_error_logs,
            commands::get_game_metadata,
            commands::save_platform_cores,
            commands::save_bios_folder,
            commands::get_bios_folder,
            commands::save_bios_folders,
            commands::get_bios_folders,
            commands::set_theme,
            commands::set_layout_style,
            commands::save_ra_credentials,
            commands::get_ra_credentials,
            commands::clear_ra_credentials,
            commands::set_cheevos_hardcore,
            commands::get_game_achievements,
            commands::refresh_game_achievements,
            commands::save_steamgriddb_key,
            commands::get_steamgriddb_key,
            commands::clear_steamgriddb_key,
            commands::search_steamgriddb_heroes,
            commands::set_game_hero,
            commands::remove_game_hero,
            commands::search_steamgriddb_logos,
            commands::set_game_logo,
            commands::remove_game_logo,
            commands::get_graphics_settings,
            commands::save_graphics_settings,
            commands::get_audio_output_devices,
            commands::get_music_tracks,
            commands::open_music_folder,
            commands::save_music_volume,
            commands::get_music_volume,
            commands::save_music_folders,
            commands::get_music_folders,
            commands::fix_match_search,
            commands::fix_match_get_covers,
            commands::apply_fix_match,
            commands::update_game_title,
            commands::get_cast_network_info,
            commands::open_wireless_display,
            commands::discover_lan_devices,
            commands::check_sunshine_status,
            commands::start_sunshine,
            commands::stop_sunshine,
            commands::download_sunshine_portable,
            commands::pair_moonlight_pin,
            commands::in_game_resume,
            commands::in_game_save_state,
            commands::in_game_load_state,
            commands::in_game_set_volume,
            commands::in_game_quit
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
