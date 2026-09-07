use std::net::UdpSocket;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

// RetroArch default network commands
const RETROARCH_UDP_ADDR: &str = "127.0.0.1:55355";

pub static GAME_RUNNING: AtomicBool = AtomicBool::new(false);
pub static OVERLAY_OPEN: AtomicBool = AtomicBool::new(false);

/// Send a text command via UDP to RetroArch (e.g. "PAUSE_TOGGLE", "SAVE_STATE", "LOAD_STATE", "QUIT")
pub fn send_retroarch_command(cmd: &str) -> Result<(), String> {
    let socket = UdpSocket::bind("127.0.0.1:0").map_err(|e| format!("Error binding UDP: {}", e))?;
    socket
        .set_write_timeout(Some(Duration::from_millis(500)))
        .map_err(|e| e.to_string())?;

    let packet = format!("{}\n", cmd);
    socket
        .send_to(packet.as_bytes(), RETROARCH_UDP_ADDR)
        .map_err(|e| format!("Error enviando comando '{}' a RetroArch: {}", cmd, e))?;

    Ok(())
}

/// Sets RetroArch audio volume percentage (0 - 100)
pub fn set_retroarch_volume(pct: u32) -> Result<(), String> {
    let mut state = crate::state::STATE.lock().unwrap();
    state.settings.graphics.audio_volume = pct.clamp(0, 100);
    crate::state::storage::save_state(&state);
    Ok(())
}

/// Starts the global Escape listener thread while a game is running
pub fn start_global_hotkey_listener(app: AppHandle, stop_flag: Arc<AtomicBool>) {
    std::thread::spawn(move || {
        #[cfg(target_os = "windows")]
        {
            use windows::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_ESCAPE};

            let mut was_pressed = false;

            while !stop_flag.load(Ordering::Relaxed) {
                // Check if Escape key is pressed (bit 15 indicates key is down)
                let state = unsafe { GetAsyncKeyState(VK_ESCAPE.0 as i32) };
                let is_down = (state as u16 & 0x8000) != 0;

                if is_down && !was_pressed {
                    let is_running = GAME_RUNNING.load(Ordering::Relaxed);
                    if is_running {
                        let is_overlay = OVERLAY_OPEN.load(Ordering::Relaxed);
                        if is_overlay {
                            let _ = resume_in_game(&app);
                        } else {
                            let _ = pause_in_game(&app);
                        }
                    }
                }

                was_pressed = is_down;
                std::thread::sleep(Duration::from_millis(40));
            }
        }
    });
}

/// Pauses RetroArch and brings NewGame+ window to front with overlay active
pub fn pause_in_game(app: &AppHandle) -> Result<(), String> {
    let _ = send_retroarch_command("PAUSE_TOGGLE");

    OVERLAY_OPEN.store(true, Ordering::Relaxed);

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_always_on_top(true);
        let _ = window.set_focus();

        #[cfg(target_os = "windows")]
        {
            use windows::Win32::Foundation::HWND;
            use windows::Win32::UI::WindowsAndMessaging::{
                SetForegroundWindow, SetWindowPos, HWND_TOPMOST, SWP_NOMOVE, SWP_NOSIZE, SWP_SHOWWINDOW,
            };
            if let Ok(raw_hwnd) = window.hwnd() {
                let hwnd = HWND(raw_hwnd.0 as *mut _);
                unsafe {
                    let _ = SetWindowPos(
                        hwnd,
                        Some(HWND_TOPMOST),
                        0,
                        0,
                        0,
                        0,
                        SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW,
                    );
                    let _ = SetForegroundWindow(hwnd);
                }
            }
        }
    }

    let _ = app.emit("in-game-pause-open", ());

    Ok(())
}

/// Resumes RetroArch, unfreezing emulation and hiding the overlay
pub fn resume_in_game(app: &AppHandle) -> Result<(), String> {
    OVERLAY_OPEN.store(false, Ordering::Relaxed);

    let _ = app.emit("in-game-pause-close", ());

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_always_on_top(false);

        #[cfg(target_os = "windows")]
        {
            use windows::Win32::Foundation::HWND;
            use windows::Win32::UI::WindowsAndMessaging::{
                SetWindowPos, HWND_NOTOPMOST, SWP_NOMOVE, SWP_NOSIZE,
            };
            if let Ok(raw_hwnd) = window.hwnd() {
                let hwnd = HWND(raw_hwnd.0 as *mut _);
                unsafe {
                    let _ = SetWindowPos(
                        hwnd,
                        Some(HWND_NOTOPMOST),
                        0,
                        0,
                        0,
                        0,
                        SWP_NOMOVE | SWP_NOSIZE,
                    );
                }
            }
        }

        let _ = window.hide();
    }

    let _ = send_retroarch_command("PAUSE_TOGGLE");

    #[cfg(target_os = "windows")]
    {
        use windows::core::s;
        use windows::Win32::UI::WindowsAndMessaging::{FindWindowA, SetForegroundWindow};
        unsafe {
            if let Ok(hwnd) = FindWindowA(s!("RetroArch"), windows::core::PCSTR::null()) {
                if !hwnd.0.is_null() {
                    let _ = SetForegroundWindow(hwnd);
                }
            }
        }
    }

    Ok(())
}

/// Quits RetroArch cleanly and returns to NewGame+
pub fn quit_in_game(app: &AppHandle) -> Result<(), String> {
    OVERLAY_OPEN.store(false, Ordering::Relaxed);
    GAME_RUNNING.store(false, Ordering::Relaxed);

    let _ = send_retroarch_command("QUIT");

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_always_on_top(false);
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }

    let _ = app.emit("in-game-pause-close", ());
    Ok(())
}

