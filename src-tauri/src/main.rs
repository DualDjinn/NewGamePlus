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
use state::lock_state;
use state::storage::{load_state, migrate_legacy_saves, save_state};

fn main() {
    // 1. Cargar estado persistente al iniciar
    let mut initial = load_state();

    // Migrar last_played heredado al perfil activo si el perfil aún no tiene ninguno
    let profile_name = initial.settings.current_profile.clone();
    if let Some(profile) = initial
        .settings
        .profiles
        .iter_mut()
        .find(|p| p.name == profile_name)
    {
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

    // Limpiar autosaves residuales al arrancar la aplicación
    crate::emulator::clear_stale_autos();

    save_state(&initial);
    {
        let mut state = lock_state();
        *state = initial;
    }

    // 2. Iniciar Tauri Application
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // F9: Menú in-game (overlay para guardar y cargar estados)
            use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
            let handle_f9 = app.handle().clone();
            if let Err(e) = app.global_shortcut().on_shortcut("F9", move |_app, _shortcut, event| {
                if event.state() == ShortcutState::Pressed {
                    let _ = crate::emulator::toggle_ingame_overlay(&handle_f9);
                }
            }) {
                eprintln!("Global shortcut F9 failed: {}", e);
            }

            let state = lock_state();
            if state.settings.kiosk_mode {
                let handle = app.handle();
                if let Some(window) = handle.get_webview_window("main") {
                    let _ = window.set_fullscreen(true);
                    let _ = window.set_decorations(false);
                }
            }
            drop(state);

            // Auto-check de actualizaciones de emuladores cada 4 días (no intrusivo)
            let update_handle = app.handle().clone();
            std::thread::spawn(move || {
                crate::commands::updates::maybe_auto_check_updates(&update_handle);
            });

            // Resuelve en segundo plano cualquier carátula faltante
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                let (games_to_check, meta_conn) = {
                    let state = lock_state();
                    let games = state.games.clone();
                    let meta_conn = metadata::libretro::get_metadata_connection();
                    (games, meta_conn)
                };

                let steamgrid_key = {
                    let state = lock_state();
                    let profile_name = &state.settings.current_profile;
                    state
                        .settings
                        .profiles
                        .iter()
                        .find(|p| &p.name == profile_name)
                        .and_then(|p| crate::state::secrets::reveal_opt(&p.steamgriddb_api_key))
                };

                let mut updated = false;
                let mut new_games = Vec::with_capacity(games_to_check.len());

                for mut g in games_to_check {
                    let has_valid_cover = g
                        .cover_path
                        .as_ref()
                        .map(|cp| Path::new(cp).exists())
                        .unwrap_or(false);
                    let path = Path::new(&g.rom_path);
                    let rom_name = path
                        .file_stem()
                        .map(|s| s.to_string_lossy().to_string())
                        .unwrap_or_else(|| g.name.clone());

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
                        let mut state = lock_state();
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
            commands::check_azahar,
            commands::get_cover_data_uri,
            commands::get_favorites_list,
            commands::get_settings,
            commands::save_settings,
            commands::set_kiosk_mode,
            commands::set_auto_update_check,
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
            commands::save_slot,
            commands::load_slot,
            commands::list_slots,
            commands::delete_slot,
            commands::running_game,
            commands::is_game_running,
            commands::ingame_continue,
            commands::ingame_quit,
            commands::ingame_volume,
            commands::ingame_mute,
            commands::get_controller_mapping,
            commands::save_controller_mapping,
            commands::get_emulator_versions,
            commands::check_emulator_updates,
            commands::update_emulator,
            commands::update_all_cores,
            commands::find_game_video,
            commands::save_screenscraper_config,
            commands::get_screenscraper_config,
            commands::clear_screenscraper_config,
            commands::scrape_game_video,
            commands::save_video_folders,
            commands::get_video_folders,
            commands::scan_local_videos,
            commands::scrape_library_videos,
            commands::cancel_scrape_library_videos
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
