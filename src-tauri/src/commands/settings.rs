use std::collections::HashMap;
use std::fs;
use crate::state::models::{AppSettings, AppState, GraphicsSettings};
use crate::state::storage::{get_logs_dir, save_state};
use crate::state::STATE;

#[tauri::command]
pub fn get_settings() -> Result<AppSettings, String> {
    let state = STATE.lock().unwrap();
    Ok(state.settings.clone())
}

#[tauri::command]
pub fn save_settings(folders: Vec<String>, kiosk_mode: Option<bool>) -> Result<(), String> {
    let mut state = STATE.lock().unwrap();
    state.settings.folders = folders;
    if let Some(km) = kiosk_mode {
        state.settings.kiosk_mode = km;
    }
    save_state(&state);
    Ok(())
}

#[tauri::command]
pub fn save_platform_cores(cores: HashMap<String, String>) -> Result<(), String> {
    let mut state = STATE.lock().unwrap();
    state.settings.platform_cores = cores;
    save_state(&state);
    Ok(())
}

#[tauri::command]
pub fn save_bios_folder(folder: Option<String>) -> Result<(), String> {
    let mut state = STATE.lock().unwrap();
    let opt = folder.map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    if let Some(ref f) = opt {
        if !state.settings.bios_folders.contains(f) {
            state.settings.bios_folders.push(f.clone());
        }
    }
    state.settings.bios_folder = opt;
    save_state(&state);
    Ok(())
}

#[tauri::command]
pub fn save_bios_folders(folders: Vec<String>) -> Result<(), String> {
    let mut state = STATE.lock().unwrap();
    let cleaned: Vec<String> = folders
        .into_iter()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    state.settings.bios_folder = cleaned.first().cloned();
    state.settings.bios_folders = cleaned;
    save_state(&state);
    Ok(())
}

#[tauri::command]
pub fn get_bios_folders() -> Result<Vec<String>, String> {
    let state = STATE.lock().unwrap();
    if state.settings.bios_folders.is_empty() {
        if let Some(ref legacy) = state.settings.bios_folder {
            return Ok(vec![legacy.clone()]);
        }
    }
    Ok(state.settings.bios_folders.clone())
}

#[tauri::command]
pub fn get_bios_folder() -> Result<Option<String>, String> {
    let state = STATE.lock().unwrap();
    Ok(state.settings.bios_folder.clone())
}

#[tauri::command]
pub fn set_kiosk_mode(enabled: bool) -> Result<(), String> {
    let mut state = STATE.lock().unwrap();
    state.settings.kiosk_mode = enabled;
    save_state(&state);
    Ok(())
}

#[tauri::command]
pub fn set_theme(theme: String) -> Result<(), String> {
    let mut state = STATE.lock().unwrap();
    let current_profile = state.settings.current_profile.clone();
    if let Some(p) = state.settings.profiles.iter_mut().find(|p| p.name == current_profile) {
        p.theme = theme.clone();
    }
    state.settings.theme = theme;
    save_state(&state);
    Ok(())
}

#[tauri::command]
pub fn set_layout_style(style: String) -> Result<(), String> {
    let mut state = STATE.lock().unwrap();
    let current_profile = state.settings.current_profile.clone();
    if let Some(p) = state.settings.profiles.iter_mut().find(|p| p.name == current_profile) {
        p.layout_style = style.clone();
    }
    state.settings.layout_style = style;
    save_state(&state);
    Ok(())
}

#[tauri::command]
pub fn get_graphics_settings() -> Result<GraphicsSettings, String> {
    let state = STATE.lock().unwrap();
    Ok(state.settings.graphics.clone())
}

#[tauri::command]
pub fn save_graphics_settings(graphics: GraphicsSettings) -> Result<(), String> {
    let mut state = STATE.lock().unwrap();
    state.settings.graphics = graphics;
    save_state(&state);
    Ok(())
}

#[tauri::command]
pub fn get_audio_output_devices() -> Result<Vec<String>, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let output = std::process::Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-PnpDevice -Class AudioEndpoint -Status OK | Where-Object InstanceId -like '*0.0.0.*' | Select-Object -ExpandProperty FriendlyName",
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("Error querying audio devices: {}", e))?;

        let text = String::from_utf8_lossy(&output.stdout);
        let mut devices: Vec<String> = text
            .lines()
            .map(|l| l.trim().to_string())
            .filter(|l| !l.is_empty())
            .collect();
        devices.sort();
        devices.dedup();
        Ok(devices)
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(Vec::new())
    }
}

#[tauri::command]
pub fn export_library() -> Result<String, String> {
    let state = STATE.lock().unwrap();
    serde_json::to_string_pretty(&*state).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_library(json: String) -> Result<(), String> {
    let imported: AppState = serde_json::from_str(&json).map_err(|e| format!("Invalid JSON: {}", e))?;
    let mut state = STATE.lock().unwrap();
    for g in &imported.games {
        if !state.games.iter().any(|existing| existing.rom_path == g.rom_path) {
            state.games.push(g.clone());
        }
    }
    state.favorites.extend(imported.favorites);
    save_state(&state);
    Ok(())
}

#[tauri::command]
pub fn get_error_logs() -> Result<String, String> {
    let path = get_logs_dir().join("errors.log");
    if path.exists() {
        fs::read_to_string(&path).map_err(|e| e.to_string())
    } else {
        Ok(String::new())
    }
}

#[tauri::command]
pub fn save_music_volume(volume: f32) -> Result<(), String> {
    let mut state = STATE.lock().unwrap();
    state.settings.music_volume = volume.clamp(0.0, 1.0);
    save_state(&state);
    Ok(())
}

#[tauri::command]
pub fn get_music_volume() -> Result<f32, String> {
    let state = STATE.lock().unwrap();
    Ok(state.settings.music_volume)
}

#[tauri::command]
pub fn save_music_folders(folders: Vec<String>) -> Result<(), String> {
    let mut state = STATE.lock().unwrap();
    let cleaned: Vec<String> = folders
        .into_iter()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    state.settings.music_folders = cleaned;
    save_state(&state);
    Ok(())
}

#[tauri::command]
pub fn get_music_folders() -> Result<Vec<String>, String> {
    let state = STATE.lock().unwrap();
    Ok(state.settings.music_folders.clone())
}

