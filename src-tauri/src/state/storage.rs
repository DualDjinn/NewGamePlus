use super::models::AppState;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

pub fn now_str() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| format!("{}", d.as_secs()))
        .unwrap_or_default()
}

pub fn get_data_dir() -> PathBuf {
    let dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."))
        .join("data");
    let _ = fs::create_dir_all(&dir);
    dir
}

pub fn state_file_path() -> PathBuf {
    get_data_dir().join("newgameplus.json")
}

pub fn load_state() -> AppState {
    let path = state_file_path();
    let mut state: AppState = if path.exists() {
        let data = fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str(&data).unwrap_or_default()
    } else {
        let legacy = get_data_dir().join("gameflix.json");
        if legacy.exists() {
            let data = fs::read_to_string(&legacy).unwrap_or_default();
            serde_json::from_str(&data).unwrap_or_default()
        } else {
            AppState::default()
        }
    };
    // Migración automática: XAudio2 es el motor más estable y universal para auriculares USB/Bluetooth y parlantes en Windows
    if state.settings.graphics.audio_driver.is_empty() || state.settings.graphics.audio_driver == "wasapi" {
        state.settings.graphics.audio_driver = "xaudio".into();
    }
    state
}

pub fn save_state(state: &AppState) {
    let data_dir = get_data_dir();
    let _ = fs::create_dir_all(&data_dir);
    if let Ok(json) = serde_json::to_string_pretty(state) {
        let final_path = state_file_path();
        let tmp_path = data_dir.join("newgameplus.json.tmp");
        if fs::write(&tmp_path, json).is_ok() {
            let _ = fs::rename(&tmp_path, &final_path);
        }
    }
}

pub fn get_logs_dir() -> PathBuf {
    let dir = get_data_dir().join("logs");
    let _ = fs::create_dir_all(&dir);
    dir
}

pub fn log_error(msg: &str) {
    let path = get_logs_dir().join("errors.log");
    let timestamp = now_str();
    if let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(&path) {
        let _ = writeln!(file, "[{}] {}", timestamp, msg);
    }
}

pub fn get_binaries_dir() -> PathBuf {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));
    let direct = exe_dir.join("binaries");
    if direct.exists() {
        return direct;
    }
    if let Some(parent) = exe_dir.parent() {
        let parent_bin = parent.join("binaries");
        if parent_bin.exists() {
            return parent_bin;
        }
    }
    let cwd_bin = PathBuf::from("binaries");
    if cwd_bin.exists() {
        return cwd_bin;
    }
    let tauri_bin = PathBuf::from("src-tauri").join("binaries");
    if tauri_bin.exists() {
        return tauri_bin;
    }
    direct
}

pub fn get_thumbnails_dir() -> PathBuf {
    let dir = get_data_dir().join("thumbnails");
    let _ = fs::create_dir_all(&dir);
    dir
}

pub fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(&entry.path(), &dst.join(entry.file_name()))?;
        } else {
            let dst_file = dst.join(entry.file_name());
            if !dst_file.exists() {
                fs::copy(entry.path(), dst_file)?;
            }
        }
    }
    Ok(())
}

pub fn migrate_legacy_saves(target_profile: &str, retroarch_exe: &Path) {
    let ra_dir = retroarch_exe.parent().map(|p| p.to_path_buf()).unwrap_or_default();
    let legacy_saves = ra_dir.join("saves");
    let legacy_states = ra_dir.join("states");

    let safe_profile = target_profile.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");
    let target_saves = get_data_dir().join("saves").join(&safe_profile);
    let target_states = get_data_dir().join("states").join(&safe_profile);

    if legacy_saves.exists() {
        let _ = copy_dir_all(&legacy_saves, &target_saves);
        let _ = fs::remove_dir_all(&legacy_saves);
    }
    if legacy_states.exists() {
        let _ = copy_dir_all(&legacy_states, &target_states);
        let _ = fs::remove_dir_all(&legacy_states);
    }
}
