use crate::emulator::{check_retroarch as check_ra_impl, check_rpcs3 as check_rpcs3_impl, core_exists};
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
pub fn get_music_tracks() -> Vec<MusicTrack> {
    scan_music_tracks_inner()
}

#[tauri::command]
pub fn open_music_folder() -> Result<(), String> {
    open_music_folder_impl()
}

#[tauri::command]
pub fn scan_and_fetch_cores(app: tauri::AppHandle, folders: Vec<String>) -> Result<ScanResult, String> {
    scan_and_fetch_cores_inner(app, folders)
}
