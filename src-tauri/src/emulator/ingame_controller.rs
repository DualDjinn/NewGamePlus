use crate::state::lock_state;
use crate::state::storage::get_data_dir;
use std::fs;
use std::net::UdpSocket;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime};
use tauri::{AppHandle, Manager};

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct SaveSlot {
    pub file: String,
    pub thumbnail: Option<String>,
    pub modified: u64,
    pub size: u64,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct RunningGameInfo {
    pub rom_path: String,
    pub game_id: String,
    pub game_name: String,
}

pub struct RunningGame {
    pub port: u16,
    pub rom_path: String,
    pub pid: u32,
    pub game_id: String,
    pub game_name: String,
}

pub static RUNNING: Mutex<Option<RunningGame>> = Mutex::new(None);
pub static PAUSED: Mutex<bool> = Mutex::new(false);
pub static RETROARCH_PID: AtomicU32 = AtomicU32::new(0);
static SLOT_BUSY: Mutex<()> = Mutex::new(());

fn base64_encode(data: &[u8]) -> String {
    const TABLE: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::with_capacity(data.len().div_ceil(3) * 4);
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let triple = (b0 << 16) | (b1 << 8) | b2;
        result.push(TABLE[((triple >> 18) & 0x3F) as usize] as char);
        result.push(TABLE[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            result.push(TABLE[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
        if chunk.len() > 2 {
            result.push(TABLE[(triple & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
    }
    result
}

/// UDP sender to RetroArch Network Control Interface
pub fn ra_send(cmd: &str, port: u16) -> Result<(), String> {
    let socket = UdpSocket::bind("127.0.0.1:0").map_err(|e| format!("Error binding UDP: {}", e))?;
    socket
        .set_write_timeout(Some(Duration::from_millis(300)))
        .map_err(|e| e.to_string())?;

    let addr = format!("127.0.0.1:{}", port);
    let packet_nl = format!("{}\n", cmd);
    let _ = socket.send_to(packet_nl.as_bytes(), &addr);
    let _ = socket.send_to(cmd.as_bytes(), &addr);
    Ok(())
}

/// Track and set pause state (UDP PAUSE_TOGGLE is blind; only toggle if state changes)
pub fn set_paused(port: u16, paused: bool) -> Result<(), String> {
    let mut p = PAUSED.lock().unwrap();
    if *p != paused {
        ra_send("PAUSE_TOGGLE", port)?;
        *p = paused;
    }
    Ok(())
}

fn check_slot_filename(file: &str) -> Result<(), String> {
    if !file.ends_with(".state") || file.contains("..") || file.contains('/') || file.contains('\\') {
        return Err("Nombre de archivo de slot inválido".into());
    }
    Ok(())
}

pub fn slot_path_for_rom(rom_path: &str) -> PathBuf {
    let p = Path::new(rom_path);
    let stem = p.file_stem().and_then(|s| s.to_str()).unwrap_or("game");
    get_data_dir().join("ra_states").join(format!("{}.state", stem))
}

fn find_fresh_slot(stem: &str, before: SystemTime) -> Option<(PathBuf, Option<PathBuf>)> {
    let ra_states_dir = get_data_dir().join("ra_states");
    let state_file = ra_states_dir.join(format!("{}.state", stem));

    // 1. Direct flat file in ra_states
    if state_file.is_file() {
        if let Ok(meta) = state_file.metadata() {
            if let Ok(mtime) = meta.modified() {
                if mtime >= before && meta.len() > 0 {
                    let png_file = ra_states_dir.join(format!("{}.state.png", stem));
                    let png_opt = if png_file.is_file() { Some(png_file) } else { None };
                    return Some((state_file, png_opt));
                }
            }
        }
    }

    // 2. Check one subdirectory level down if core created a folder
    if let Ok(entries) = fs::read_dir(&ra_states_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let sub_state = path.join(format!("{}.state", stem));
                if sub_state.is_file() {
                    if let Ok(meta) = sub_state.metadata() {
                        if let Ok(mtime) = meta.modified() {
                            if mtime >= before && meta.len() > 0 {
                                let sub_png = path.join(format!("{}.state.png", stem));
                                let png_opt = if sub_png.is_file() { Some(sub_png) } else { None };
                                return Some((sub_state, png_opt));
                            }
                        }
                    }
                }
            }
        }
    }

    None
}

pub fn save_slot(slot_num: u8) -> Result<SaveSlot, String> {
    if !(1..=5).contains(&slot_num) {
        return Err("El slot debe estar entre 1 y 5".into());
    }

    let _guard = SLOT_BUSY
        .try_lock()
        .map_err(|_| "Operación de guardado en curso".to_string())?;

    let (port, rom_path, game_id) = {
        let r = RUNNING.lock().unwrap();
        match &*r {
            Some(g) => (g.port, g.rom_path.clone(), g.game_id.clone()),
            None => return Err("No hay ningún juego en ejecución".into()),
        }
    };

    let stem = Path::new(&rom_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("game");

    let before = SystemTime::now()
        .checked_sub(Duration::from_millis(500))
        .unwrap_or_else(SystemTime::now);

    ra_send("SAVE_STATE", port)?;

    // Poll up to 6 seconds for fresh save state file
    let start_wait = std::time::Instant::now();
    let mut detected = None;
    while start_wait.elapsed() < Duration::from_secs(6) {
        std::thread::sleep(Duration::from_millis(200));
        if let Some(res) = find_fresh_slot(stem, before) {
            detected = Some(res);
            break;
        }
    }

    let (fresh_state, fresh_png) = detected.ok_or_else(|| {
        "RetroArch no generó el archivo de guardado a tiempo.".to_string()
    })?;

    // Wait a brief moment to ensure write flush
    std::thread::sleep(Duration::from_millis(100));

    let dest_dir = get_data_dir().join("savestates").join(&game_id);
    fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;

    let dest_state = dest_dir.join(format!("slot_{}.state", slot_num));
    fs::copy(&fresh_state, &dest_state).map_err(|e| e.to_string())?;

    let dest_png = dest_dir.join(format!("slot_{}.png", slot_num));
    let mut thumbnail_b64 = None;
    if let Some(png_path) = fresh_png {
        let _ = fs::copy(&png_path, &dest_png);
        if let Ok(bytes) = fs::read(&dest_png) {
            thumbnail_b64 = Some(format!("data:image/png;base64,{}", base64_encode(&bytes)));
        }
    } else if dest_png.exists() {
        let _ = fs::remove_file(&dest_png);
    }

    let meta = dest_state.metadata().map_err(|e| e.to_string())?;
    let modified = meta
        .modified()
        .unwrap_or_else(|_| SystemTime::now())
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    Ok(SaveSlot {
        file: format!("slot_{}.state", slot_num),
        thumbnail: thumbnail_b64,
        modified,
        size: meta.len(),
    })
}

pub fn load_slot(game_id: String, file: String) -> Result<String, String> {
    check_slot_filename(&file)?;

    let src = get_data_dir()
        .join("savestates")
        .join(&game_id)
        .join(&file);

    if !src.exists() {
        return Err(format!("El archivo de guardado {} no existe.", file));
    }

    let is_running = {
        let r = RUNNING.lock().unwrap();
        r.as_ref().map(|g| (g.port, g.rom_path.clone()))
    };

    if let Some((port, rom_path)) = is_running {
        // Hot load: copy to active path and send LOAD_STATE
        let dest = slot_path_for_rom(&rom_path);
        if let Some(parent) = dest.parent() {
            let _ = fs::create_dir_all(parent);
        }
        fs::copy(&src, &dest).map_err(|e| e.to_string())?;
        ra_send("LOAD_STATE", port)?;
        Ok("loaded".into())
    } else {
        // Cold load: game is stopped. Copy as {stem}.state.auto so savestate_auto_load restores it on start
        let rom_path = {
            let state = lock_state();
            state
                .games
                .iter()
                .find(|g| g.id == game_id)
                .map(|g| g.rom_path.clone())
        }
        .ok_or_else(|| "Juego no encontrado en la biblioteca".to_string())?;

        let stem = Path::new(&rom_path)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("game");

        let dest = get_data_dir()
            .join("ra_states")
            .join(format!("{}.state.auto", stem));

        if let Some(parent) = dest.parent() {
            let _ = fs::create_dir_all(parent);
        }
        fs::copy(&src, &dest).map_err(|e| e.to_string())?;
        Ok("staged".into())
    }
}

pub fn list_slots(game_id: String) -> Result<Vec<SaveSlot>, String> {
    let dir = get_data_dir().join("savestates").join(&game_id);
    if !dir.exists() {
        return Ok(Vec::new());
    }

    let mut slots = Vec::new();
    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                if name.ends_with(".state") && !name.ends_with(".auto") {
                    let meta = path.metadata().ok();
                    let size = meta.as_ref().map(|m| m.len()).unwrap_or(0);
                    let modified = meta
                        .and_then(|m| m.modified().ok())
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs())
                        .unwrap_or(0);

                    let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
                    let png_path = dir.join(format!("{}.png", stem));
                    let thumbnail = if png_path.exists() {
                        fs::read(&png_path)
                            .ok()
                            .map(|b| format!("data:image/png;base64,{}", base64_encode(&b)))
                    } else {
                        None
                    };

                    slots.push(SaveSlot {
                        file: name.to_string(),
                        thumbnail,
                        modified,
                        size,
                    });
                }
            }
        }
    }

    slots.sort_by(|a, b| a.file.cmp(&b.file));
    Ok(slots)
}

pub fn delete_slot(game_id: String, file: String) -> Result<(), String> {
    check_slot_filename(&file)?;
    let dir = get_data_dir().join("savestates").join(&game_id);
    let state_path = dir.join(&file);
    if state_path.exists() {
        let _ = fs::remove_file(&state_path);
    }

    let stem = Path::new(&file)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    let png_path = dir.join(format!("{}.png", stem));
    if png_path.exists() {
        let _ = fs::remove_file(&png_path);
    }
    Ok(())
}

pub fn running_game() -> Result<Option<RunningGameInfo>, String> {
    let r = RUNNING.lock().unwrap();
    Ok(r.as_ref().map(|g| RunningGameInfo {
        rom_path: g.rom_path.clone(),
        game_id: g.game_id.clone(),
        game_name: g.game_name.clone(),
    }))
}

pub fn is_game_running() -> Result<bool, String> {
    Ok(RUNNING.lock().unwrap().is_some())
}

pub fn ingame_continue(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("ingame") {
        let _ = win.hide();
    }
    if let Some(running) = RUNNING.lock().unwrap().as_ref() {
        let _ = set_paused(running.port, false);
    }
    Ok(())
}

pub fn ingame_quit(app: AppHandle) -> Result<String, String> {
    if let Some(win) = app.get_webview_window("ingame") {
        let _ = win.hide();
    }

    let (port, pid) = {
        let r = RUNNING.lock().unwrap();
        match &*r {
            Some(g) => (g.port, g.pid),
            None => return Ok("no_game".into()),
        }
    };

    let _ = set_paused(port, false);

    // Sequence per saveState.md §5:
    // 1. QUIT -> wait 800ms
    let _ = ra_send("QUIT", port);
    std::thread::sleep(Duration::from_millis(800));

    // 2. If still alive, second QUIT
    if is_process_alive(pid) {
        let _ = ra_send("QUIT", port);
    }

    // 3. Wait up to 3s polling every 200ms
    let start_wait = std::time::Instant::now();
    while start_wait.elapsed() < Duration::from_secs(3) {
        if !is_process_alive(pid) {
            break;
        }
        std::thread::sleep(Duration::from_millis(200));
    }

    // 4. Force kill if stubbornly still alive
    if is_process_alive(pid) {
        kill_process(pid);
    }

    Ok("ok".into())
}

pub fn ingame_volume(steps: i32) -> Result<(), String> {
    let port = RUNNING
        .lock()
        .unwrap()
        .as_ref()
        .map(|g| g.port)
        .unwrap_or(55355);

    if steps > 0 {
        for _ in 0..steps.min(50) {
            let _ = ra_send("VOLUME_UP", port);
        }
    } else if steps < 0 {
        for _ in 0..(-steps).min(50) {
            let _ = ra_send("VOLUME_DOWN", port);
        }
    }
    Ok(())
}

pub fn ingame_mute() -> Result<(), String> {
    let port = RUNNING
        .lock()
        .unwrap()
        .as_ref()
        .map(|g| g.port)
        .unwrap_or(55355);
    ra_send("MUTE", port)
}

#[cfg(target_os = "windows")]
pub fn is_process_alive(pid: u32) -> bool {
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};
    unsafe {
        if let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
            let _ = CloseHandle(handle);
            true
        } else {
            false
        }
    }
}

#[cfg(not(target_os = "windows"))]
pub fn is_process_alive(pid: u32) -> bool {
    let output = std::process::Command::new("kill")
        .args(["-0", &pid.to_string()])
        .output();
    output.map(|o| o.status.success()).unwrap_or(false)
}

pub fn kill_process(pid: u32) {
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/F"])
            .output();
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = std::process::Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output();
    }
}

pub fn toggle_ingame_overlay(app: &AppHandle) -> Result<(), String> {
    let running_info = {
        let r = RUNNING.lock().unwrap();
        r.as_ref().map(|g| (g.port, g.pid))
    };

    let (port, _pid) = match running_info {
        Some(info) => info,
        None => return Ok(()),
    };

    if let Some(ingame_win) = app.get_webview_window("ingame") {
        let is_visible = ingame_win.is_visible().unwrap_or(false);
        if is_visible {
            let _ = ingame_win.hide();
            set_paused(port, false)?;
        } else {
            set_paused(port, true)?;
            let _ = ingame_win.show();
            let _ = ingame_win.set_focus();
        }
    }

    Ok(())
}

/// Global hotkey listener for F9 and controller (Guide button, L3+R3, Back+Start)
pub fn start_global_hotkey_listener(app: AppHandle, stop_flag: Arc<AtomicBool>) {
    std::thread::spawn(move || {
        #[cfg(target_os = "windows")]
        {
            use windows::Win32::UI::Input::XboxController::{
                XInputGetState, XINPUT_GAMEPAD_BACK, XINPUT_GAMEPAD_LEFT_THUMB,
                XINPUT_GAMEPAD_RIGHT_THUMB, XINPUT_GAMEPAD_START, XINPUT_STATE,
            };

            let mut was_pressed = false;
            let mut last_toggle = std::time::Instant::now();

            while !stop_flag.load(Ordering::Relaxed) {
                // Check Gamepad combos (Guide button 0x0400, L3+R3, or Back+Start)
                let mut is_gamepad_down = false;
                for i in 0..4 {
                    let mut xs = XINPUT_STATE::default();
                    let ret = unsafe { XInputGetState(i, &mut xs) };
                    if ret == 0 {
                        let btns = xs.Gamepad.wButtons.0;
                        let thumb_combo =
                            XINPUT_GAMEPAD_LEFT_THUMB.0 | XINPUT_GAMEPAD_RIGHT_THUMB.0;
                        let menu_combo = XINPUT_GAMEPAD_BACK.0 | XINPUT_GAMEPAD_START.0;
                        let guide_btn = 0x0400u16;

                        if (btns & guide_btn) == guide_btn
                            || (btns & thumb_combo) == thumb_combo
                            || (btns & menu_combo) == menu_combo
                        {
                            is_gamepad_down = true;
                            break;
                        }
                    }
                }

                if is_gamepad_down && !was_pressed && last_toggle.elapsed() > Duration::from_millis(600) {
                    last_toggle = std::time::Instant::now();
                    let _ = toggle_ingame_overlay(&app);
                }

                was_pressed = is_gamepad_down;
                std::thread::sleep(Duration::from_millis(40));
            }
        }
    });
}
