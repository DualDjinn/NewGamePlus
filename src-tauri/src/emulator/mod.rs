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
    let current_game_id = {
        let mut state = lock_state();
        let timestamp = now_str();
        let mut gid = None;
        if let Some(game) = state.games.iter().find(|g| g.rom_path == rom_path) {
            let game_id = game.id.clone();
            gid = Some(game_id.clone());
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
        gid
    };
    set_active_game_id(current_game_id);

    // Hide main window before launching emulator
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }

    let start_instant = std::time::Instant::now();
    let is_retroarch = !platforms::is_standalone_emulator(&core_name);

    let status = if !is_retroarch {
        let s = launch_standalone(&core_name, &rom_path);
        set_active_game_id(None);
        s?
    } else {
        let core_path = ensure_core(&core_name)?;
        let (ra_exe, cfg_path) = ensure_retroarch(&profile_name)?;
        let mut child = Command::new(&ra_exe)
            .args([
                "-c",
                cfg_path.to_str().unwrap_or(""),
                "-L",
                core_path.to_str().unwrap_or(""),
                &rom_path,
            ])
            .spawn()
            .map_err(|e| e.to_string())?;

        GAME_RUNNING.store(true, Ordering::SeqCst);
        RETROARCH_PID.store(child.id(), Ordering::SeqCst);
        let stop_hotkeys = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        start_global_hotkey_listener(app.clone(), stop_hotkeys.clone());

        let s = child.wait().map_err(|e| e.to_string())?;

        stop_hotkeys.store(true, Ordering::SeqCst);
        GAME_RUNNING.store(false, Ordering::SeqCst);
        OVERLAY_OPEN.store(false, Ordering::SeqCst);
        RETROARCH_PID.store(0, Ordering::SeqCst);
        set_active_game_id(None);
        s
    };

    let elapsed_secs = start_instant.elapsed().as_secs();

    // Show main window again immediately without waiting for any disk I/O or background tasks
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_always_on_top(false);
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }

    // Notify frontend immediately that emulator exited
    let _ = app.emit("retroarch-exited", &rom_path);

    // Persist playtime and refresh RetroAchievements in background thread (completely non-blocking)
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
        let err_msg = format!("RetroArch exited with status: {}", status);
        log_error(&err_msg);
        Err(err_msg)
    }
}
