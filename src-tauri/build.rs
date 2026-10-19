fn main() {
    // Kill any existing gameflix.exe before building (Windows file lock fix)
    if cfg!(target_os = "windows") {
        let _ = std::process::Command::new("taskkill")
            .args(["/F", "/IM", "gameflix.exe"])
            .output();
    }
    tauri_build::build()
}
