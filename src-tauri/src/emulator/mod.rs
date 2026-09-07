pub mod downloader;
pub mod ingame_controller;
pub mod retroarch;
pub mod standalone;

pub use downloader::*;
pub use ingame_controller::*;
pub use retroarch::*;
pub use standalone::*;

use std::path::Path;
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{Emitter, Manager};
use crate::platforms;
use crate::state::storage::{now_str, save_state, log_error};
use crate::state::STATE;

pub fn launch_game_runner(app: tauri::AppHandle, rom_path: String) -> Result<String, String> {
    if !Path::new(&rom_path).exists() {
        return Err(format!("ROM no encontrada: {}", rom_path));
    }
    let info = platforms::detect_platform(&rom_path)
        .ok_or_else(|| format!("Plataforma no soportada: {}", rom_path))?;

    // Use platform-level core override if set, else platform default
    let (core_name, profile_name) = {
        let state = STATE.lock().unwrap();
        let core = state.settings.platform_cores
            .get(info.platform)
            .cloned()
            .unwrap_or_else(|| info.core_name.to_string());
        let prof = state.settings.current_profile.clone();
        (core, prof)
    };

    // Mark as last played in active profile
    {
        let mut state = STATE.lock().unwrap();
        let timestamp = now_str();
        if let Some(game) = state.games.iter().find(|g| g.rom_path == rom_path) {
            let game_id = game.id.clone();
            if let Some(profile) = state.settings.profiles.iter_mut().find(|p| p.name == profile_name) {
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
    let stop_listener = Arc::new(AtomicBool::new(false));

    if is_retroarch {
        GAME_RUNNING.store(true, Ordering::Relaxed);
        OVERLAY_OPEN.store(false, Ordering::Relaxed);
        start_global_hotkey_listener(app.clone(), Arc::clone(&stop_listener));
    }

    let status = if !is_retroarch {
        launch_standalone(&core_name, &rom_path)?
    } else {
        let core_path = ensure_core(&core_name)?;
        let (ra_exe, cfg_path) = ensure_retroarch(&profile_name)?;
        let mut child = Command::new(&ra_exe)
            .args([
                "-c", cfg_path.to_str().unwrap_or(""),
                "-L", core_path.to_str().unwrap_or(""),
                &rom_path,
            ])
            .spawn()
            .map_err(|e| e.to_string())?;

        RETROARCH_PID.store(child.id(), Ordering::SeqCst);
        let s = child.wait().map_err(|e| e.to_string())?;
        RETROARCH_PID.store(0, Ordering::SeqCst);
        s
    };

    if is_retroarch {
        stop_listener.store(true, Ordering::Relaxed);
        GAME_RUNNING.store(false, Ordering::SeqCst);
        OVERLAY_OPEN.store(false, Ordering::SeqCst);
    }

    let elapsed_secs = start_instant.elapsed().as_secs();

    // Accumulate play time in active profile
    {
        let mut state = STATE.lock().unwrap();
        let profile_name = state.settings.current_profile.clone();
        if let Some(game) = state.games.iter().find(|g| g.rom_path == rom_path) {
            let game_id = game.id.clone();
            if let Some(profile) = state.settings.profiles.iter_mut().find(|p| p.name == profile_name) {
                let current_time = profile.play_time_secs.entry(game_id).or_insert(0);
                *current_time += elapsed_secs;
            }
        }
        save_state(&state);
    }

    // Show main window again immediately without waiting for any background tasks
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_always_on_top(false);
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }

    // Notify frontend that RetroArch exited
    let _ = app.emit("retroarch-exited", &rom_path);

    // Invalidate and refresh RetroAchievements progress cache in background thread (non-blocking)
    let rom_path_bg = rom_path.clone();
    std::thread::spawn(move || {
        let _ = crate::commands::achievements::refresh_game_achievements(rom_path_bg);
    });

    if status.success() {
        Ok("Game exited cleanly".into())
    } else {
        let err_msg = format!("RetroArch exited with status: {}", status);
        log_error(&err_msg);
        Err(err_msg)
    }
}
