use crate::state::models::SaveSlotInfo;
use crate::state::storage::get_data_dir;
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

static ACTIVE_GAME_ID: std::sync::RwLock<Option<String>> = std::sync::RwLock::new(None);

pub fn set_active_game_id(id: Option<String>) {
    if let Ok(mut g) = ACTIVE_GAME_ID.write() {
        *g = id;
    }
}

pub fn get_active_game_id() -> Option<String> {
    ACTIVE_GAME_ID.read().ok().and_then(|g| g.clone())
}

#[derive(serde::Serialize, Clone, Debug)]
#[allow(dead_code)]
pub struct PauseOpenPayload {
    pub screenshot_path: Option<String>,
    pub game_id: Option<String>,
}

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
        .set_write_timeout(Some(Duration::from_millis(300)))
        .map_err(|e| e.to_string())?;

    let packet_nl = format!("{}\n", cmd);
    let _ = socket.send_to(packet_nl.as_bytes(), RETROARCH_UDP_ADDR);
    let _ = socket.send_to(cmd.as_bytes(), RETROARCH_UDP_ADDR);

    Ok(())
}

/// Sets RetroArch audio volume percentage (0 - 100)
pub fn set_retroarch_volume(pct: u32) -> Result<(), String> {
    let mut state = crate::state::lock_state();
    state.settings.graphics.audio_volume = pct.clamp(0, 100);
    crate::state::storage::save_state(&state);
    Ok(())
}

/// Captures the primary screen into a standard Windows BMP file and returns its path
#[cfg(target_os = "windows")]
#[allow(dead_code)]
pub fn capture_screen_to_bmp() -> Result<String, String> {
    use std::fs::File;
    use std::io::Write;
    use windows::Win32::Foundation::HWND;
    use windows::Win32::Graphics::Gdi::{
        BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC,
        GetDIBits, ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
        HBITMAP, HDC, SRCCOPY,
    };
    use windows::Win32::UI::WindowsAndMessaging::{GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN};

    unsafe {
        let screen_w = GetSystemMetrics(SM_CXSCREEN);
        let screen_h = GetSystemMetrics(SM_CYSCREEN);

        if screen_w <= 0 || screen_h <= 0 {
            return Err("Resolución de pantalla inválida".into());
        }

        let hdc_screen: HDC = GetDC(Some(HWND(std::ptr::null_mut())));
        if hdc_screen.0.is_null() {
            return Err("No se pudo obtener el contexto de pantalla".into());
        }

        let hdc_mem: HDC = CreateCompatibleDC(Some(hdc_screen));
        if hdc_mem.0.is_null() {
            let _ = ReleaseDC(Some(HWND(std::ptr::null_mut())), hdc_screen);
            return Err("No se pudo crear contexto de memoria".into());
        }

        let h_bitmap: HBITMAP = CreateCompatibleBitmap(hdc_screen, screen_w, screen_h);
        if h_bitmap.0.is_null() {
            let _ = DeleteDC(hdc_mem);
            let _ = ReleaseDC(Some(HWND(std::ptr::null_mut())), hdc_screen);
            return Err("No se pudo crear mapa de bits compatible".into());
        }

        let old_bitmap = SelectObject(hdc_mem, h_bitmap.into());

        let _ = BitBlt(
            hdc_mem,
            0,
            0,
            screen_w,
            screen_h,
            Some(hdc_screen),
            0,
            0,
            SRCCOPY,
        );

        let mut bi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: screen_w,
                biHeight: screen_h, // Bottom-up bitmap
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0,
                biSizeImage: 0,
                biXPelsPerMeter: 0,
                biYPelsPerMeter: 0,
                biClrUsed: 0,
                biClrImportant: 0,
            },
            bmiColors: [windows::Win32::Graphics::Gdi::RGBQUAD::default(); 1],
        };

        let row_stride = ((screen_w * 4 + 3) & !3) as usize;
        let image_size = row_stride * (screen_h as usize);
        let mut pixels: Vec<u8> = vec![0u8; image_size];

        GetDIBits(
            hdc_mem,
            h_bitmap,
            0,
            screen_h as u32,
            Some(pixels.as_mut_ptr() as *mut _),
            &mut bi,
            DIB_RGB_COLORS,
        );

        // Restore and free GDI objects
        let _ = SelectObject(hdc_mem, old_bitmap);
        let _ = DeleteObject(h_bitmap.into());
        let _ = DeleteDC(hdc_mem);
        let _ = ReleaseDC(Some(HWND(std::ptr::null_mut())), hdc_screen);

        // Build BMP file in temp directory
        let temp_dir = crate::state::storage::get_data_dir().join("temp");
        let _ = std::fs::create_dir_all(&temp_dir);
        let bmp_path = temp_dir.join("pause_bg.bmp");

        let file_header_size: u32 = 14;
        let info_header_size: u32 = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
        let bf_off_bits: u32 = file_header_size + info_header_size;
        let bf_size: u32 = bf_off_bits + (pixels.len() as u32);

        let mut bmp_bytes = Vec::with_capacity(bf_size as usize);
        // BITMAPFILEHEADER
        bmp_bytes.extend_from_slice(b"BM"); // bfType
        bmp_bytes.extend_from_slice(&bf_size.to_le_bytes()); // bfSize
        bmp_bytes.extend_from_slice(&0u16.to_le_bytes()); // bfReserved1
        bmp_bytes.extend_from_slice(&0u16.to_le_bytes()); // bfReserved2
        bmp_bytes.extend_from_slice(&bf_off_bits.to_le_bytes()); // bfOffBits

        // BITMAPINFOHEADER
        bmp_bytes.extend_from_slice(&info_header_size.to_le_bytes());
        bmp_bytes.extend_from_slice(&screen_w.to_le_bytes());
        bmp_bytes.extend_from_slice(&screen_h.to_le_bytes());
        bmp_bytes.extend_from_slice(&1u16.to_le_bytes()); // biPlanes
        bmp_bytes.extend_from_slice(&32u16.to_le_bytes()); // biBitCount
        bmp_bytes.extend_from_slice(&BI_RGB.0.to_le_bytes()); // biCompression
        bmp_bytes.extend_from_slice(&(pixels.len() as u32).to_le_bytes()); // biSizeImage
        bmp_bytes.extend_from_slice(&0u32.to_le_bytes()); // biXPelsPerMeter
        bmp_bytes.extend_from_slice(&0u32.to_le_bytes()); // biYPelsPerMeter
        bmp_bytes.extend_from_slice(&0u32.to_le_bytes()); // biClrUsed
        bmp_bytes.extend_from_slice(&0u32.to_le_bytes()); // biClrImportant

        // Pixel data
        bmp_bytes.extend_from_slice(&pixels);

        let mut f = File::create(&bmp_path).map_err(|e| e.to_string())?;
        f.write_all(&bmp_bytes).map_err(|e| e.to_string())?;

        Ok(bmp_path.to_string_lossy().to_string())
    }
}

#[cfg(not(target_os = "windows"))]
#[allow(dead_code)]
pub fn capture_screen_to_bmp() -> Result<String, String> {
    Err("Captura de pantalla no soportada en esta plataforma".into())
}

/// Global hotkey listener is deprecated in favor of RetroArch's native Ozone Quick Menu
#[allow(dead_code)]
pub fn start_global_hotkey_listener(_app: AppHandle, _stop_flag: Arc<AtomicBool>) {
    // Native RetroArch Ozone menu handles Escape and L3+R3 directly
}

/// Pauses RetroArch and shows NewGame+ pause cards directly on top of the game
#[allow(dead_code)]
pub fn pause_in_game(app: &AppHandle) -> Result<(), String> {
    // 1. Send pause command to RetroArch (and focus loss will also pause via pause_nonactive = true)
    let _ = send_retroarch_command("PAUSE_TOGGLE");
    OVERLAY_OPEN.store(true, Ordering::SeqCst);

    // 2. Capture screenshot synchronously for blurred background presentation
    #[cfg(target_os = "windows")]
    let screenshot_path = capture_screen_to_bmp().ok();
    #[cfg(not(target_os = "windows"))]
    let screenshot_path = None;

    // 3. Elevate and focus main NewGame+ window directly over RetroArch
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_always_on_top(true);
        let _ = window.set_fullscreen(true);
        let _ = window.unminimize();
        let _ = window.show();

        #[cfg(target_os = "windows")]
        {
            use windows::Win32::Foundation::HWND;
            use windows::Win32::System::Threading::{AttachThreadInput, GetCurrentThreadId};
            use windows::Win32::UI::WindowsAndMessaging::{
                BringWindowToTop, GetForegroundWindow, GetWindowThreadProcessId,
                SetForegroundWindow, SetWindowPos, HWND_NOTOPMOST, HWND_TOPMOST, SWP_NOACTIVATE,
                SWP_NOMOVE, SWP_NOSIZE, SWP_SHOWWINDOW,
            };

            if let Ok(tauri_hwnd) = window.hwnd() {
                let t_hwnd = HWND(tauri_hwnd.0);
                let cur_tid = unsafe { GetCurrentThreadId() };
                let fg_hwnd = unsafe { GetForegroundWindow() };
                let ra_hwnd = get_retroarch_hwnd().unwrap_or(fg_hwnd);

                unsafe {
                    // Demote RetroArch from topmost layer
                    if !ra_hwnd.0.is_null() {
                        let _ = SetWindowPos(
                            ra_hwnd,
                            Some(HWND_NOTOPMOST),
                            0,
                            0,
                            0,
                            0,
                            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
                        );
                    }

                    // Attach thread input queue to foreground to bypass Windows Foreground Lockout
                    let fg_tid = if !fg_hwnd.0.is_null() {
                        GetWindowThreadProcessId(fg_hwnd, None)
                    } else if !ra_hwnd.0.is_null() {
                        GetWindowThreadProcessId(ra_hwnd, None)
                    } else {
                        0
                    };

                    if fg_tid != 0 && fg_tid != cur_tid {
                        let _ = AttachThreadInput(cur_tid, fg_tid, true);
                    }

                    // Force NewGame+ to topmost z-order and take active foreground focus
                    let _ = SetWindowPos(
                        t_hwnd,
                        Some(HWND_TOPMOST),
                        0,
                        0,
                        0,
                        0,
                        SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW,
                    );
                    let _ = BringWindowToTop(t_hwnd);
                    let _ = SetForegroundWindow(t_hwnd);

                    if fg_tid != 0 && fg_tid != cur_tid {
                        let _ = AttachThreadInput(cur_tid, fg_tid, false);
                    }
                }
            }
        }

        let _ = window.set_focus();
    }

    // 4. Notify frontend to mount InGameOverlayModal
    let payload = PauseOpenPayload {
        screenshot_path,
        game_id: get_active_game_id(),
    };
    let _ = app.emit("in-game-pause-open", payload);

    Ok(())
}

/// Resumes RetroArch, restoring its full screen presentation and unpausing
pub fn resume_in_game(app: &AppHandle) -> Result<(), String> {
    OVERLAY_OPEN.store(false, Ordering::SeqCst);

    let _ = app.emit("in-game-pause-close", ());

    // 1. Hide NewGame+ main window
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_always_on_top(false);
        let _ = window.hide();
    }

    // 2. Restore foreground focus and topmost status directly to RetroArch
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::System::Threading::{AttachThreadInput, GetCurrentThreadId};
        use windows::Win32::UI::WindowsAndMessaging::{
            BringWindowToTop, GetWindowThreadProcessId, SetForegroundWindow, SetWindowPos,
            HWND_TOPMOST, SWP_NOMOVE, SWP_NOSIZE, SWP_SHOWWINDOW,
        };

        if let Some(hwnd) = get_retroarch_hwnd() {
            unsafe {
                let cur_tid = GetCurrentThreadId();
                let ra_tid = GetWindowThreadProcessId(hwnd, None);
                if ra_tid != 0 && cur_tid != ra_tid {
                    let _ = AttachThreadInput(cur_tid, ra_tid, true);
                }

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

                if ra_tid != 0 && cur_tid != ra_tid {
                    let _ = AttachThreadInput(cur_tid, ra_tid, false);
                }
            }
        }
    }

    // 3. Unpause RetroArch
    let _ = send_retroarch_command("PAUSE_TOGGLE");

    Ok(())
}

/// Quits RetroArch cleanly and returns to NewGame+
pub fn quit_in_game(app: &AppHandle) -> Result<(), String> {
    OVERLAY_OPEN.store(false, Ordering::SeqCst);
    GAME_RUNNING.store(false, Ordering::SeqCst);

    let _ = send_retroarch_command("QUIT");

    if let Some(window) = app.get_webview_window("main") {
        let is_kiosk = crate::state::lock_state().settings.kiosk_mode;
        let _ = window.set_always_on_top(false);
        let _ = window.set_fullscreen(is_kiosk);
        if !is_kiosk {
            let _ = window.maximize();
        }
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }

    let _ = app.emit("in-game-pause-close", ());
    Ok(())
}

pub fn get_savestate_slots_for_game(game_id: &str) -> Vec<SaveSlotInfo> {
    let slots_dir = get_data_dir().join("savestates").join(game_id);
    let _ = std::fs::create_dir_all(&slots_dir);

    (1..=5)
        .map(|slot| {
            let bmp_path = slots_dir.join(format!("slot_{}.bmp", slot));
            let json_path = slots_dir.join(format!("slot_{}.json", slot));

            let has_save = bmp_path.exists() || json_path.exists();
            let timestamp_str = if json_path.exists() {
                std::fs::read_to_string(&json_path).ok()
            } else {
                None
            };

            let screenshot_path = if bmp_path.exists() {
                Some(bmp_path.to_string_lossy().to_string())
            } else {
                None
            };

            SaveSlotInfo {
                slot,
                has_save,
                screenshot_path,
                timestamp_str,
            }
        })
        .collect()
}

pub fn save_state_slot(game_id: Option<String>, slot: u32) -> Result<String, String> {
    // 1. Send commands to RetroArch via UDP
    let _ = send_retroarch_command(&format!("STATE_SLOT {}", slot));
    send_retroarch_command("SAVE_STATE")?;

    // 2. If game_id is provided or active, copy the captured frame
    let target_gid = game_id.or_else(get_active_game_id);
    if let Some(ref gid) = target_gid {
        let slots_dir = get_data_dir().join("savestates").join(gid);
        let _ = std::fs::create_dir_all(&slots_dir);
        let dest_bmp = slots_dir.join(format!("slot_{}.bmp", slot));
        let temp_bmp = get_data_dir().join("temp").join("pause_bg.bmp");
        if temp_bmp.exists() {
            let _ = std::fs::copy(&temp_bmp, &dest_bmp);
        }

        let json_path = slots_dir.join(format!("slot_{}.json", slot));
        let now = chrono_or_simple_timestamp();
        let _ = std::fs::write(&json_path, now);
    }

    Ok(format!("Estado guardado en ranura {}", slot))
}

pub fn load_state_slot(slot: u32) -> Result<String, String> {
    let _ = send_retroarch_command(&format!("STATE_SLOT {}", slot));
    send_retroarch_command("LOAD_STATE")?;
    Ok(format!("Estado cargado de ranura {}", slot))
}

fn chrono_or_simple_timestamp() -> String {
    let now = std::time::SystemTime::now();
    let duration = now
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let secs_in_day = duration % 86400;
    let hours = (secs_in_day / 3600) % 24;
    let minutes = (secs_in_day % 3600) / 60;
    format!("{:02}:{:02}", hours, minutes)
}
