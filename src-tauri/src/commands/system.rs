use crate::emulator::{
    check_azahar as check_azahar_impl, check_eden as check_eden_impl,
    check_eden_keys as check_eden_keys_impl, check_retroarch as check_ra_impl,
    check_rpcs3 as check_rpcs3_impl, core_exists, eden_dlc_status as dlc_status_impl,
    import_eden_firmware_from as import_fw_impl, import_eden_keys_from as import_keys_impl,
    open_eden_firmware_folder_impl, open_eden_gui as open_eden_gui_impl,
    open_eden_keys_folder_impl, stage_eden_update_files as stage_eden_impl, EdenDlcStatus,
    EdenRequirements,
};
use crate::scanner::music::{open_music_folder_impl, scan_music_tracks_inner, MusicTrack};
use crate::scanner::roms::scan_and_fetch_cores_inner;
use crate::state::models::ScanResult;

#[tauri::command]
pub fn check_core(core_name: String) -> Result<bool, String> {
    Ok(core_exists(&core_name))
}

#[tauri::command]
pub fn check_retroarch() -> Result<bool, String> {
    check_ra_impl()
}

#[tauri::command]
pub fn check_rpcs3() -> Result<bool, String> {
    check_rpcs3_impl()
}

#[tauri::command]
pub fn check_azahar() -> Result<bool, String> {
    check_azahar_impl()
}

#[tauri::command]
pub fn check_eden() -> Result<bool, String> {
    check_eden_impl()
}

#[tauri::command]
pub fn eden_requirements() -> EdenRequirements {
    check_eden_keys_impl()
}

#[tauri::command]
pub fn open_eden_keys_folder() -> Result<(), String> {
    open_eden_keys_folder_impl()
}

#[tauri::command]
pub fn open_eden_firmware_folder() -> Result<(), String> {
    open_eden_firmware_folder_impl()
}

#[tauri::command]
pub fn import_eden_keys_from(src_dir: String) -> Result<EdenRequirements, String> {
    import_keys_impl(src_dir)
}

#[tauri::command]
pub fn import_eden_firmware_from(src_dir: String) -> Result<EdenRequirements, String> {
    import_fw_impl(src_dir)
}

#[tauri::command]
pub fn eden_dlc_status() -> EdenDlcStatus {
    dlc_status_impl()
}

#[tauri::command]
pub fn stage_eden_update_files(files: Vec<String>) -> Result<EdenDlcStatus, String> {
    stage_eden_impl(files)
}

#[tauri::command]
pub fn open_eden_gui() -> Result<String, String> {
    open_eden_gui_impl()
}

#[tauri::command]
pub fn get_music_tracks() -> Vec<MusicTrack> {
    scan_music_tracks_inner()
}

#[tauri::command]
pub fn open_music_folder() -> Result<(), String> {
    open_music_folder_impl()
}

#[tauri::command]
pub async fn scan_and_fetch_cores(
    app: tauri::AppHandle,
    folders: Vec<String>,
) -> Result<ScanResult, String> {
    tauri::async_runtime::spawn_blocking(move || scan_and_fetch_cores_inner(app, folders))
        .await
        .map_err(|e| e.to_string())?
}
