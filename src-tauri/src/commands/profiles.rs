use crate::state::lock_state;
use crate::state::models::Profile;
use crate::state::storage::save_state;
use std::collections::{HashMap, HashSet};

#[tauri::command]
pub fn create_profile(name: String) -> Result<(), String> {
    let mut state = lock_state();
    if state.settings.profiles.iter().any(|p| p.name == name) {
        return Err("Profile already exists".into());
    }
    let current_theme = state.settings.theme.clone();
    let current_style = state.settings.layout_style.clone();
    state.settings.profiles.push(Profile {
        name,
        favorites: HashSet::new(),
        last_played: HashMap::new(),
        play_time_secs: HashMap::new(),
        theme: current_theme,
        layout_style: current_style,
        ra_username: None,
        ra_api_key: None,
        ra_token: None,
        cheevos_hardcore: false,
        steamgriddb_api_key: None,
    });
    save_state(&state);
    Ok(())
}

#[tauri::command]
pub fn delete_profile(name: String) -> Result<(), String> {
    let mut state = lock_state();
    if state.settings.profiles.len() <= 1 {
        return Err("Cannot delete the last profile".into());
    }
    state.settings.profiles.retain(|p| p.name != name);
    if state.settings.current_profile == name {
        state.settings.current_profile = state.settings.profiles[0].name.clone();
        state.settings.theme = state.settings.profiles[0].theme.clone();
        state.settings.layout_style = state.settings.profiles[0].layout_style.clone();
    }
    save_state(&state);
    Ok(())
}

#[tauri::command]
pub fn switch_profile(name: String) -> Result<(), String> {
    let mut state = lock_state();
    let (theme, layout_style) =
        if let Some(p) = state.settings.profiles.iter().find(|p| p.name == name) {
            (p.theme.clone(), p.layout_style.clone())
        } else {
            return Err("Profile not found".into());
        };
    state.settings.current_profile = name;
    state.settings.theme = theme;
    state.settings.layout_style = layout_style;
    save_state(&state);
    Ok(())
}
