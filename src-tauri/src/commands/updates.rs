use crate::emulator::updater;
use crate::emulator::versions::{self, EmulatorInfo, FOUR_DAYS_SECS};
use crate::state::lock_state;
use crate::state::storage::save_state;
use tauri::Emitter;

#[tauri::command]
pub fn get_emulator_versions() -> Vec<EmulatorInfo> {
    versions::detect_installed()
}

#[tauri::command]
pub fn check_emulator_updates(app: tauri::AppHandle) -> Result<Vec<EmulatorInfo>, String> {
    // Comando sync: corre en el pool de Tauri, el HTTP bloqueante no toca el runtime async.
    let infos = versions::check_all();
    let news: Vec<&EmulatorInfo> = infos.iter().filter(|i| i.update_available).collect();
    if !news.is_empty() {
        let _ = app.emit("emulator-updates-available", &infos);
    }
    Ok(infos)
}

#[tauri::command]
pub fn update_emulator(app: tauri::AppHandle, id: String) -> Result<String, String> {
    match id.as_str() {
        "retroarch" => updater::update_retroarch(&app),
        "rpcs3" | "azahar" | "sunshine" => updater::update_standalone(&app, &id),
        _ => Err(format!("Emulador no soportado: {}", id)),
    }
}

#[tauri::command]
pub fn update_all_cores(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    updater::update_all_cores(&app)
}

/// Auto-check cada 4 días. Llamado desde un hilo en segundo plano al iniciar.
/// Devuelve true si encontró actualizaciones (y ya emitió el evento).
pub fn maybe_auto_check_updates(app: &tauri::AppHandle) -> bool {
    let (enabled, due) = {
        let state = lock_state();
        let last = state.settings.last_emulator_check_secs;
        let enabled = state.settings.auto_update_check;
        (
            enabled,
            versions::now_secs().saturating_sub(last) >= FOUR_DAYS_SECS,
        )
    };
    if !enabled || !due {
        return false;
    }
    let infos = versions::check_all();
    {
        let mut state = lock_state();
        state.settings.last_emulator_check_secs = versions::now_secs();
        save_state(&state);
    }
    if infos.iter().any(|i| i.update_available) {
        let _ = app.emit("emulator-updates-available", &infos);
        true
    } else {
        false
    }
}
