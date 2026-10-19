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
    #[cfg(target_os = "windows")]
    {
        let base = std::env::var("APPDATA")
            .map(PathBuf::from)
            .unwrap_or_else(|_| {
                std::env::current_exe()
                    .ok()
                    .and_then(|p| p.parent().map(|p| p.to_path_buf()))
                    .unwrap_or_else(|| PathBuf::from("."))
            })
            .join("NewGame+");
        let _ = fs::create_dir_all(&base);
        base
    }
    #[cfg(not(target_os = "windows"))]
    {
        let base = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()))
            .unwrap_or_else(|| PathBuf::from("."))
            .join("data");
        let _ = fs::create_dir_all(&base);
        base
    }
}

fn legacy_data_dir() -> Option<PathBuf> {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.join("data")))
        .filter(|p| p.exists())
}

fn migrate_legacy_data_dir_if_needed() {
    let new_data = get_data_dir();
    if let Some(old_data) = legacy_data_dir() {
        if old_data != new_data && old_data.exists() {
            log_error(&format!(
                "Iniciando migración de datos: {} -> {}",
                old_data.display(),
                new_data.display()
            ));

            // Try rename first (atomic, fast)
            let rename_result = fs::rename(&old_data, &new_data);

            let migrated = match rename_result {
                Ok(()) => {
                    log_error("Migración completada con rename atómico");
                    true
                }
                Err(e) => {
                    log_error(&format!(
                        "Rename falló ({}), intentando copia recursiva...",
                        e
                    ));
                    // Fallback: copy recursively, skipping existing files
                    match copy_dir_all(&old_data, &new_data) {
                        Ok(()) => {
                            log_error("Copia recursiva completada, limpiando origen...");
                            let _ = fs::remove_dir_all(&old_data);
                            true
                        }
                        Err(e) => {
                            log_error(&format!("ERROR: Migración falló completamente: {}", e));
                            false
                        }
                    }
                }
            };

            if migrated {
                log_error("Migración de datos legacy completada con éxito");
            }
        }
    }
}

pub fn state_file_path() -> PathBuf {
    get_data_dir().join("newgameplus.json")
}

pub fn load_state() -> AppState {
    migrate_legacy_data_dir_if_needed();

    let path = state_file_path();
    let mut state: AppState = if path.exists() {
        let data = fs::read(&path).unwrap_or_default();
        serde_json::from_slice(&data).unwrap_or_default()
    } else {
        let legacy = get_data_dir().join("gameflix.json");
        if legacy.exists() {
            let data = fs::read(&legacy).unwrap_or_default();
            serde_json::from_slice(&data).unwrap_or_default()
        } else {
            AppState::default()
        }
    };
    let mut migrated_legacy_profile = false;
    for profile in &mut state.settings.profiles {
        if profile.name == "Por defecto" {
            profile.name = "Perfil 1".into();
            migrated_legacy_profile = true;
        }
        super::secrets::migrate_profile_secrets(profile);
    }
    if state.settings.current_profile == "Por defecto" {
        state.settings.current_profile = "Perfil 1".into();
        migrated_legacy_profile = true;
    }
    if state.settings.profiles.is_empty() {
        state.settings.profiles.push(super::models::Profile {
            name: "Perfil 1".into(),
            favorites: std::collections::HashSet::new(),
            last_played: std::collections::HashMap::new(),
            play_time_secs: std::collections::HashMap::new(),
            theme: super::models::default_theme(),
            layout_style: super::models::default_layout_style(),
            ra_username: None,
            ra_api_key: None,
            ra_token: None,
            cheevos_hardcore: false,
            steamgriddb_api_key: None,
            screenscraper_user: None,
            screenscraper_pass: None,
            screenscraper_dev_id: None,
            screenscraper_dev_pass: None,
        });
        state.settings.current_profile = "Perfil 1".into();
    }
    if migrated_legacy_profile {
        let base_data = get_data_dir();
        let old_saves = base_data.join("saves").join("Por defecto");
        let new_saves = base_data.join("saves").join("Perfil 1");
        if old_saves.exists() && !new_saves.exists() {
            let _ = fs::rename(old_saves, new_saves);
        }
        let old_states = base_data.join("states").join("Por defecto");
        let new_states = base_data.join("states").join("Perfil 1");
        if old_states.exists() && !new_states.exists() {
            let _ = fs::rename(old_states, new_states);
        }
    }
    if state.settings.graphics.audio_driver.is_empty()
        || state.settings.graphics.audio_driver == "wasapi"
    {
        state.settings.graphics.audio_driver = "xaudio".into();
    }
    state
        .games
        .retain(|g| g.platform != "TEKNOPARROT" && g.core_name != "teknoparrot");
    state.settings.platform_cores.remove("TEKNOPARROT");

    for game in &mut state.games {
        if game.platform == "3DS" || game.core_name == "citra" {
            game.core_name = "azahar".into();
        }
        if game.core_name == "melonDS" {
            game.core_name = "melonds".into();
        }
        if game.genre.is_none() || game.developer.is_none() || game.release_year.is_none() {
            let meta_curated =
                crate::metadata::curated::find_curated_catalog_metadata(&game.name, &game.platform)
                    .or_else(|| {
                        game.display_name.as_deref().and_then(|d| {
                            crate::metadata::curated::find_curated_catalog_metadata(
                                d,
                                &game.platform,
                            )
                        })
                    });

            if let Some(curated) = meta_curated {
                if game.display_name.is_none() || game.display_name.as_deref() == Some(&game.name) {
                    game.display_name = curated.display_name;
                }
                if game.genre.is_none() {
                    game.genre = curated.genre;
                }
                if game.developer.is_none() {
                    game.developer = curated.developer;
                }
                if game.publisher.is_none() {
                    game.publisher = curated.publisher;
                }
                if game.release_year.is_none() {
                    game.release_year = curated.release_year;
                }
            }
        }
    }
    if let Some(core) = state.settings.platform_cores.get_mut("NDS") {
        if *core == "melonDS" {
            *core = "melonds".into();
        }
    }
    state
}

pub fn save_state(state: &AppState) {
    let data_dir = get_data_dir();
    let _ = fs::create_dir_all(&data_dir);
    if let Ok(bytes) = serde_json::to_vec(state) {
        let final_path = state_file_path();
        let tmp_path = data_dir.join("newgameplus.json.tmp");
        if fs::write(&tmp_path, bytes).is_ok() {
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
    let ra_dir = retroarch_exe
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_default();
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
