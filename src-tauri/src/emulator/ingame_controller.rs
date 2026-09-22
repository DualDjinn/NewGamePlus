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

/// Pauses RetroArch, captures a frame screenshot, hides RetroArch window, and shows NewGame+ pause cards
#[allow(dead_code)]
pub fn pause_in_game(app: &AppHandle) -> Result<(), String> {
    // 1. Pause RetroArch emulation
    let _ = send_retroarch_command("PAUSE_TOGGLE");
    OVERLAY_OPEN.store(true, Ordering::SeqCst);

    // 2. Allow RetroArch frame presentation to settle
    std::thread::sleep(Duration::from_millis(120));

    // 3. Capture screenshot of paused game frame
    let screenshot_path = capture_screen_to_bmp().ok();

    // 4. Hide RetroArch window completely so NewGame+ has uninterrupted display ownership
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::UI::WindowsAndMessaging::{ShowWindow, SW_HIDE};
        if let Some(ra_hwnd) = get_retroarch_hwnd() {
            unsafe {
                let _ = ShowWindow(ra_hwnd, SW_HIDE);
            }
        }
    }

    // 5. Show and focus main NewGame+ window at full screen
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.set_always_on_top(true);
        let _ = window.show();
        let _ = window.set_focus();
    }

    // 6. Notify frontend to mount InGameOverlayModal with captured frame
    let _ = app.emit("in-game-pause-open", screenshot_path);

    Ok(())
}

/// Resumes RetroArch, restoring its full screen presentation and unpausing
pub fn resume_in_game(app: &AppHandle) -> Result<(), String> {
    OVERLAY_OPEN.store(false, Ordering::SeqCst);

    let _ = app.emit("in-game-pause-close", ());

    // 1. Hide NewGame+ main window again
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_always_on_top(false);
        let _ = window.hide();
    }

    // 2. Restore and elevate RetroArch window
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::UI::WindowsAndMessaging::{
            SetForegroundWindow, ShowWindow, SW_RESTORE, SW_SHOW,
        };
        if let Some(hwnd) = get_retroarch_hwnd() {
            unsafe {
                let _ = ShowWindow(hwnd, SW_SHOW);
                let _ = ShowWindow(hwnd, SW_RESTORE);
                let _ = SetForegroundWindow(hwnd);
            }
        }
    }

    // 3. Unpause RetroArch
    std::thread::sleep(Duration::from_millis(100));
    let _ = send_retroarch_command("PAUSE_TOGGLE");

    Ok(())
}

/// Quits RetroArch cleanly and returns to NewGame+
pub fn quit_in_game(app: &AppHandle) -> Result<(), String> {
    OVERLAY_OPEN.store(false, Ordering::SeqCst);
    GAME_RUNNING.store(false, Ordering::SeqCst);

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
