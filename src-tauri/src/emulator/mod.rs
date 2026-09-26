pub mod downloader;
pub mod ingame_controller;
pub mod retroarch;
pub mod standalone;
pub mod updater;
pub mod versions;

pub use downloader::*;
pub use ingame_controller::*;
pub use retroarch::*;
pub use standalone::*;

use crate::platforms;
use crate::state::lock_state;
use crate::state::storage::{log_error, now_str, save_state};
use std::path::Path;
use std::process::Command;
use std::sync::atomic::Ordering;
use tauri::{Emitter, Manager};

pub fn launch_game_runner(app: tauri::AppHandle, rom_path: String) -> Result<String, String> {
    if RUNNING.lock().unwrap().is_some() {
        log_error("Intento de lanzar juego cuando ya hay un emulador activo");
        return Err("Ya hay un juego en ejecución.".into());
    }

    if !Path::new(&rom_path).exists() {
        return Err(format!("ROM no encontrada: {}", rom_path));
    }
    // Solo se ejecuta lo que está en la biblioteca escaneada: el frontend
    // nunca debe poder pedir binarios arbitrarios.
    let known = {
        let state = lock_state();
        state.games.iter().any(|g| g.rom_path == rom_path)
    };
    if !known {
        return Err("El juego no está en la biblioteca. Escanéalo primero.".into());
    }
    let info = platforms::detect_platform(&rom_path)
        .ok_or_else(|| format!("Plataforma no soportada: {}", rom_path))?;

    // Use platform-level core override if set, else platform default
    let (core_name, profile_name) = {
        let state = lock_state();
        let core = state
            .settings
            .platform_cores
            .get(info.platform)
            .cloned()
            .unwrap_or_else(|| info.core_name.to_string());
        let prof = state.settings.current_profile.clone();
        (core, prof)
    };

    // Mark as last played in active profile
    {
        let mut state = lock_state();
        let timestamp = now_str();
        if let Some(game) = state.games.iter().find(|g| g.rom_path == rom_path) {
            let game_id = game.id.clone();
            if let Some(profile) = state
                .settings
                .profiles
                .iter_mut()
                .find(|p| p.name == profile_name)
            {
                profile.last_played.insert(game_id, timestamp);
            }
        }
        save_state(&state);
    }

    // Hide main window before launching emulator
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }

    let start_instant = std::time::Instant::now();
    let is_retroarch = !platforms::is_standalone_emulator(&core_name);

    let (game_id, game_name) = {
        let state = lock_state();
        let g = state.games.iter().find(|g| g.rom_path == rom_path);
        (
            g.map(|x| x.id.clone()).unwrap_or_default(),
            g.map(|x| x.display_name.clone().unwrap_or_else(|| x.name.clone())).unwrap_or_default(),
        )
    };

    if !is_retroarch {
        let status = launch_standalone(&core_name, &rom_path)?;
        let elapsed_secs = start_instant.elapsed().as_secs();

        if let Some(window) = app.get_webview_window("main") {
            let is_kiosk = lock_state().settings.kiosk_mode;
            let _ = window.set_always_on_top(false);
            let _ = window.set_fullscreen(is_kiosk);
            if !is_kiosk {
                let _ = window.maximize();
            }
            let _ = window.unminimize();
            let _ = window.show();
            let _ = window.set_focus();
        }

        let _ = app.emit("retroarch-exited", &rom_path);

        let rom_path_bg = rom_path.clone();
        std::thread::spawn(move || {
            {
                let mut state = lock_state();
                let profile_name = state.settings.current_profile.clone();
                if let Some(game) = state.games.iter().find(|g| g.rom_path == rom_path_bg) {
                    let game_id = game.id.clone();
                    if let Some(profile) = state
                        .settings
                        .profiles
                        .iter_mut()
                        .find(|p| p.name == profile_name)
                    {
                        let current_time = profile.play_time_secs.entry(game_id).or_insert(0);
                        *current_time += elapsed_secs;
                    }
                }
                save_state(&state);
            }
            let _ = crate::commands::achievements::fetch_achievements_internal(rom_path_bg, true);
        });

        if status.success() {
            Ok("Game exited cleanly".into())
        } else {
            let err_msg = format!("Standalone emulator exited with status: {}", status);
            log_error(&err_msg);
            Err(err_msg)
        }
    } else {
        let p = Path::new(&rom_path);
        let stem = p.file_stem().and_then(|s| s.to_str()).unwrap_or("game");
        let auto_state = crate::state::storage::get_data_dir()
            .join("ra_states")
            .join(format!("{}.state.auto", stem));

        let core_path = ensure_core(&core_name)?;
        let (ra_exe, cfg_path) = ensure_retroarch(&profile_name)?;
        let mut child = Command::new(&ra_exe)
            .args([
                "-c",
                cfg_path.to_str().unwrap_or(""),
                "-L",
                core_path.to_str().unwrap_or(""),
                &rom_path,
                "--fullscreen",
            ])
            .spawn()
            .map_err(|e| e.to_string())?;

        let pid = child.id();

        {
            let mut r = RUNNING.lock().unwrap();
            *r = Some(RunningGame {
                port: 55355,
                rom_path: rom_path.clone(),
                pid,
                game_id: game_id.clone(),
                game_name: game_name.clone(),
            });
        }
        RETROARCH_PID.store(pid, Ordering::SeqCst);
        {
            let mut p = PAUSED.lock().unwrap();
            *p = false;
        }

        let stop_hotkeys = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        start_global_hotkey_listener(app.clone(), stop_hotkeys.clone());

        let app_clone = app.clone();
        let rom_path_clone = rom_path.clone();
        let auto_state_clone = auto_state.clone();
        std::thread::spawn(move || {
            let _ = child.wait();
            stop_hotkeys.store(true, Ordering::Relaxed);
            RETROARCH_PID.store(0, Ordering::SeqCst);
            {
                let mut r = RUNNING.lock().unwrap();
                *r = None;
            }
            {
                let mut p = PAUSED.lock().unwrap();
                *p = false;
            }

            // Hide ingame overlay window if it was open
            if let Some(ingame_win) = app_clone.get_webview_window("ingame") {
                let _ = ingame_win.hide();
            }

            // Remove staged .auto state if it existed so next launch starts from scratch
            if auto_state_clone.exists() {
                let _ = std::fs::remove_file(&auto_state_clone);
            }

            let elapsed_secs = start_instant.elapsed().as_secs();

            // Show main window again immediately without waiting for any disk I/O or background tasks
            if let Some(window) = app_clone.get_webview_window("main") {
                let is_kiosk = lock_state().settings.kiosk_mode;
                let _ = window.set_always_on_top(false);
                let _ = window.set_fullscreen(is_kiosk);
                if !is_kiosk {
                    let _ = window.maximize();
                }
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }

            // Notify frontend immediately that emulator exited
            let _ = app_clone.emit("retroarch-exited", &rom_path_clone);

            // Persist playtime and refresh RetroAchievements in background thread (completely non-blocking)
            let rom_path_bg = rom_path_clone.clone();
            std::thread::spawn(move || {
                {
                    let mut state = lock_state();
                    let profile_name = state.settings.current_profile.clone();
                    if let Some(game) = state.games.iter().find(|g| g.rom_path == rom_path_bg) {
                        let game_id = game.id.clone();
                        if let Some(profile) = state
                            .settings
                            .profiles
                            .iter_mut()
                            .find(|p| p.name == profile_name)
                        {
                            let current_time = profile.play_time_secs.entry(game_id).or_insert(0);
                            *current_time += elapsed_secs;
                        }
                    }
                    save_state(&state);
                }

                let _ = crate::commands::achievements::fetch_achievements_internal(rom_path_bg, true);
            });
        });

        Ok("Juego iniciado".into())
    }
}
