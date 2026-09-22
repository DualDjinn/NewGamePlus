use crate::achievements::{self, RAGameProgress};
use crate::platforms;
use crate::state::lock_state;
use crate::state::storage::save_state;
use std::path::Path;

#[tauri::command]
pub fn save_ra_credentials(
    username: String,
    password: String,
    api_key: String,
) -> Result<(), String> {
    let token = achievements::ra_login(&username, &password)?;
    let valid = achievements::ra_validate_credentials(&username, &api_key)?;
    if !valid {
        return Err("API Key inválida. Verificá tu Web API Key en retroachievements.org".into());
    }

    let mut state = lock_state();
    let profile_name = state.settings.current_profile.clone();
    if let Some(profile) = state
        .settings
        .profiles
        .iter_mut()
        .find(|p| p.name == profile_name)
    {
        profile.ra_username = Some(username);
        // Cifrado en reposo (DPAPI): si falla, error en vez de plaintext silencioso.
        profile.ra_api_key = Some(crate::state::secrets::protect(&api_key)?);
        profile.ra_token = Some(crate::state::secrets::protect(&token)?);
    }
    save_state(&state);
    Ok(())
}

#[tauri::command]
pub fn get_ra_credentials() -> Result<Option<String>, String> {
    // Solo el username: la key/token nunca salen al frontend.
    let state = lock_state();
    let profile_name = &state.settings.current_profile;
    if let Some(profile) = state
        .settings
        .profiles
        .iter()
        .find(|p| &p.name == profile_name)
    {
        return Ok(profile.ra_username.clone());
    }
    Ok(None)
}

#[tauri::command]
pub fn clear_ra_credentials() -> Result<(), String> {
    let mut state = lock_state();
    let profile_name = state.settings.current_profile.clone();
    if let Some(profile) = state
        .settings
        .profiles
        .iter_mut()
        .find(|p| p.name == profile_name)
    {
        profile.ra_username = None;
        profile.ra_api_key = None;
        profile.ra_token = None;
    }
    save_state(&state);
    Ok(())
}

#[tauri::command]
pub fn set_cheevos_hardcore(enabled: bool) -> Result<(), String> {
    let mut state = lock_state();
    let profile_name = state.settings.current_profile.clone();
    if let Some(profile) = state
        .settings
        .profiles
        .iter_mut()
        .find(|p| p.name == profile_name)
    {
        profile.cheevos_hardcore = enabled;
    }
    save_state(&state);
    Ok(())
}

pub(crate) fn fetch_achievements_internal(
    rom_path: String,
    force_refresh: bool,
) -> Result<Option<RAGameProgress>, String> {
    let path = Path::new(&rom_path);
    if !path.exists() {
        return Err(format!("ROM no encontrada: {}", rom_path));
    }

    let (username, api_key, game_name, display_name) = {
        let state = lock_state();
        let profile_name = &state.settings.current_profile;
        let profile = state
            .settings
            .profiles
            .iter()
            .find(|p| &p.name == profile_name);
        let creds = match profile {
            Some(p) => match (
                &p.ra_username,
                crate::state::secrets::reveal_opt(&p.ra_api_key),
            ) {
                (Some(u), Some(k)) => (u.clone(), k),
                _ => return Ok(None),
            },
            None => return Ok(None),
        };
        let game = state.games.iter().find(|g| g.rom_path == rom_path);
        let g_name = game.map(|g| g.name.clone());
        let d_name = game.and_then(|g| g.display_name.clone());
        (creds.0, creds.1, g_name, d_name)
    };

    let platform = platforms::detect_platform(&rom_path)
        .map(|info| info.platform.to_string())
        .unwrap_or_default();

    if !achievements::ra_is_supported_platform(&platform) {
        return Ok(None);
    }

    // 1. Intento primario: hash de ROM clásico (omitido automáticamente para archivos >64MB o discos)
    let mut ra_game_id = achievements::ra_hash_rom(path, &platform)
        .ok()
        .and_then(|h| achievements::ra_resolve_game_id(&h).ok())
        .filter(|&id| id > 0);

    // 2. Fallback inteligente para plataformas de disco (PS1, PS2, PSP, etc.) o si el hash no resolvió
    if ra_game_id.is_none() {
        if let Some(console_id) = achievements::ra_get_console_id(&platform) {
            let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
            let mut candidates: Vec<&str> = Vec::new();
            if let Some(d) = display_name.as_deref() {
                candidates.push(d);
            }
            if let Some(n) = game_name.as_deref() {
                candidates.push(n);
            }
            if !stem.is_empty() && !candidates.contains(&stem) {
                candidates.push(stem);
            }

            if let Ok(console_games) =
                achievements::ra_get_console_games(&username, &api_key, console_id)
            {
                ra_game_id = achievements::ra_resolve_game_id_by_title(&candidates, &console_games);
            }
        }
    }

    let game_id = match ra_game_id {
        Some(id) if id > 0 => id,
        _ => return Ok(None),
    };

    if !force_refresh {
        if let Some(cached) = achievements::get_cached_progress(game_id) {
            return Ok(Some(cached));
        }
    }

    let progress = achievements::ra_get_game_progress(&username, &api_key, game_id, &username)?;
    achievements::save_progress_cache(game_id, &progress);
    Ok(Some(progress))
}

#[tauri::command]
pub async fn get_game_achievements(rom_path: String) -> Result<Option<RAGameProgress>, String> {
    tauri::async_runtime::spawn_blocking(move || fetch_achievements_internal(rom_path, false))
        .await
        .map_err(|e| format!("Tarea de logros falló: {}", e))?
}

#[tauri::command]
pub async fn refresh_game_achievements(rom_path: String) -> Result<Option<RAGameProgress>, String> {
    tauri::async_runtime::spawn_blocking(move || fetch_achievements_internal(rom_path, true))
        .await
        .map_err(|e| format!("Tarea de actualización de logros falló: {}", e))?
}
