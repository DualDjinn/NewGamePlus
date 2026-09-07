use std::net::UdpSocket;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

// RetroArch default network commands
const RETROARCH_UDP_ADDR: &str = "127.0.0.1:55355";

pub static GAME_RUNNING: AtomicBool = AtomicBool::new(false);
pub static OVERLAY_OPEN: AtomicBool = AtomicBool::new(false);
pub static RETROARCH_PID: AtomicU32 = AtomicU32::new(0);

#[cfg(target_os = "windows")]
pub fn get_retroarch_hwnd() -> Option<windows::Win32::Foundation::HWND> {
    use windows::core::BOOL;
    use windows::Win32::Foundation::{HWND, LPARAM};
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetClassNameW, GetWindowThreadProcessId, IsWindowVisible,
    };

    let target_pid = RETROARCH_PID.load(Ordering::SeqCst);
    if target_pid == 0 {
        return None;
    }

    struct EnumData {
        target_pid: u32,
        result: Option<HWND>,
    }

    let mut data = EnumData {
        target_pid,
        result: None,
    };

    unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let data = &mut *(lparam.0 as *mut EnumData);
        let mut pid = 0u32;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        if pid == data.target_pid && IsWindowVisible(hwnd).as_bool() {
            let mut class_name = [0u16; 128];
            let class_len = GetClassNameW(hwnd, &mut class_name);
            let class_str = String::from_utf16_lossy(&class_name[..class_len as usize]);
            if !class_str.contains("InputIndicator") {
                data.result = Some(hwnd);
                return BOOL(0); // Stop enumerating
            }
        }
        BOOL(1)
    }

    unsafe {
        let _ = EnumWindows(Some(enum_proc), LPARAM(&mut data as *mut _ as isize));
    }

    data.result
}

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
#[allow(dead_code)]
pub fn start_global_hotkey_listener(app: AppHandle, stop_flag: Arc<AtomicBool>) {
    std::thread::spawn(move || {
        #[cfg(target_os = "windows")]
        {
            use windows::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_ESCAPE};

            let mut was_pressed = false;
            let mut last_toggle = std::time::Instant::now() - Duration::from_secs(1);

            while !stop_flag.load(Ordering::Relaxed) {
                // Check if Escape key is pressed (bit 15 indicates key is down)
                let state = unsafe { GetAsyncKeyState(VK_ESCAPE.0 as i32) };
                let is_down = (state as u16 & 0x8000) != 0;

                if is_down && !was_pressed && last_toggle.elapsed() > Duration::from_millis(350) {
                    last_toggle = std::time::Instant::now();
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
                std::thread::sleep(Duration::from_millis(30));
            }
        }
    });
}

/// Pauses RetroArch and brings NewGame+ window to front with overlay active
#[allow(dead_code)]
pub fn pause_in_game(app: &AppHandle) -> Result<(), String> {
    let _ = send_retroarch_command("PAUSE_TOGGLE");

    OVERLAY_OPEN.store(true, Ordering::SeqCst);

    if let Some(overlay_win) = app.get_webview_window("in_game_overlay") {
        let _ = overlay_win.unminimize();
        let _ = overlay_win.show();
        let _ = overlay_win.set_always_on_top(true);
        let _ = overlay_win.set_focus();

        #[cfg(target_os = "windows")]
        {
            use windows::Win32::Foundation::HWND;
            use windows::Win32::System::Threading::{AttachThreadInput, GetCurrentThreadId};
            use windows::Win32::UI::WindowsAndMessaging::{
                BringWindowToTop, GetForegroundWindow, GetWindowThreadProcessId,
                SetForegroundWindow, SetWindowPos, HWND_NOTOPMOST, HWND_TOPMOST, SWP_NOMOVE,
                SWP_NOSIZE, SWP_SHOWWINDOW,
            };

            // Remove TOPMOST from RetroArch if it grabbed it
            if let Some(ra_hwnd) = get_retroarch_hwnd() {
                unsafe {
                    let _ = SetWindowPos(
                        ra_hwnd,
                        Some(HWND_NOTOPMOST),
                        0,
                        0,
                        0,
                        0,
                        SWP_NOMOVE | SWP_NOSIZE,
                    );
                }
            }

            if let Ok(raw_hwnd) = overlay_win.hwnd() {
                let hwnd = HWND(raw_hwnd.0 as *mut _);
                unsafe {
                    let fg_hwnd = GetForegroundWindow();
                    let fg_thread = GetWindowThreadProcessId(fg_hwnd, None);
                    let cur_thread = GetCurrentThreadId();

                    if fg_thread != 0 && fg_thread != cur_thread {
                        let _ = AttachThreadInput(cur_thread, fg_thread, true);
                        let _ = SetWindowPos(
                            hwnd,
                            Some(HWND_TOPMOST),
                            0,
                            0,
                            0,
                            0,
                            SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW,
                        );
                        let _ = BringWindowToTop(hwnd);
                        let _ = SetForegroundWindow(hwnd);
                        let _ = AttachThreadInput(cur_thread, fg_thread, false);
                    } else {
                        let _ = SetWindowPos(
                            hwnd,
                            Some(HWND_TOPMOST),
                            0,
                            0,
                            0,
                            0,
                            SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW,
                        );
                        let _ = BringWindowToTop(hwnd);
                        let _ = SetForegroundWindow(hwnd);
                    }
                }
            }
        }
    }

    let _ = app.emit("in-game-pause-open", ());

    Ok(())
}

/// Resumes RetroArch, unfreezing emulation and hiding the overlay
pub fn resume_in_game(app: &AppHandle) -> Result<(), String> {
    OVERLAY_OPEN.store(false, Ordering::SeqCst);

    let _ = app.emit("in-game-pause-close", ());

    if let Some(overlay_win) = app.get_webview_window("in_game_overlay") {
        let _ = overlay_win.set_always_on_top(false);

        #[cfg(target_os = "windows")]
        {
            use windows::Win32::Foundation::HWND;
            use windows::Win32::UI::WindowsAndMessaging::{
                SetWindowPos, HWND_NOTOPMOST, SWP_NOMOVE, SWP_NOSIZE,
            };
            if let Ok(raw_hwnd) = overlay_win.hwnd() {
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

        let _ = overlay_win.hide();
    }

    #[cfg(target_os = "windows")]
    {
        use windows::Win32::UI::WindowsAndMessaging::{SetForegroundWindow, ShowWindow, SW_RESTORE};
        if let Some(hwnd) = get_retroarch_hwnd() {
            unsafe {
                let _ = ShowWindow(hwnd, SW_RESTORE);
                let _ = SetForegroundWindow(hwnd);
            }
        }
    }

    std::thread::sleep(Duration::from_millis(50));
    let _ = send_retroarch_command("PAUSE_TOGGLE");

    Ok(())
}

/// Quits RetroArch cleanly and returns to NewGame+
pub fn quit_in_game(app: &AppHandle) -> Result<(), String> {
    OVERLAY_OPEN.store(false, Ordering::SeqCst);
    GAME_RUNNING.store(false, Ordering::SeqCst);

    if let Some(overlay_win) = app.get_webview_window("in_game_overlay") {
        let _ = overlay_win.set_always_on_top(false);
        let _ = overlay_win.hide();
    }

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

