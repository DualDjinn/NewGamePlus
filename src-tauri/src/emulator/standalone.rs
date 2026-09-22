use crate::state::storage::get_binaries_dir;
use std::path::{Path, PathBuf};
use std::process::Command;

pub fn get_rpcs3_exe() -> PathBuf {
    // 1. Emulador bundleado en binaries/RPCS3/rpcs3.exe
    let bundled = get_binaries_dir().join("RPCS3").join("rpcs3.exe");
    if bundled.exists() {
        return bundled;
    }
    // 2. Ruta directa local en F:\Emuladores\PS3\rpcs3.exe
    let f_path = PathBuf::from(r"F:\Emuladores\PS3\rpcs3.exe");
    if f_path.exists() {
        return f_path;
    }
    // 3. Ubicaciones estándar en otras unidades
    let common = [
        r"C:\RPCS3\rpcs3.exe",
        r"D:\RPCS3\rpcs3.exe",
        r"E:\RPCS3\rpcs3.exe",
    ];
    for p in common {
        let pb = PathBuf::from(p);
        if pb.exists() {
            return pb;
        }
    }
    bundled
}

pub fn check_rpcs3() -> Result<bool, String> {
    let exe = get_rpcs3_exe();
    if exe.exists() {
        Ok(true)
    } else {
        Err(
            "RPCS3 no encontrado. Verifica que esté en binaries/RPCS3 o en F:\\Emuladores\\PS3."
                .into(),
        )
    }
}

pub fn get_azahar_exe() -> PathBuf {
    // 1. Emulador bundleado en binaries/Azahar/azahar.exe o azahar-qt.exe
    let bundled = get_binaries_dir().join("Azahar").join("azahar.exe");
    if bundled.exists() {
        return bundled;
    }
    let bundled_qt = get_binaries_dir().join("Azahar").join("azahar-qt.exe");
    if bundled_qt.exists() {
        return bundled_qt;
    }
    let tauri_bin = PathBuf::from("src-tauri")
        .join("binaries")
        .join("Azahar")
        .join("azahar.exe");
    if tauri_bin.exists() {
        return tauri_bin;
    }
    // 2. Ruta directa local en F:\Emuladores\3DS o carpetas comunes
    let common = [
        r"F:\Emuladores\3DS\azahar.exe",
        r"F:\Emuladores\3DS\azahar-qt.exe",
        r"F:\Emuladores\Azahar\azahar.exe",
        r"F:\Emuladores\Azahar\azahar-qt.exe",
        r"C:\Azahar\azahar.exe",
        r"C:\Azahar\azahar-qt.exe",
        r"D:\Azahar\azahar.exe",
        r"E:\Azahar\azahar.exe",
        // Fallbacks existentes en tu equipo mientras instalas Azahar
        r"F:\Emuladores\3DS\citra-qt.exe",
        r"F:\Emuladores\3DS\citra.exe",
    ];
    for p in common {
        let pb = PathBuf::from(p);
        if pb.exists() {
            return pb;
        }
    }
    bundled
}

pub fn check_azahar() -> Result<bool, String> {
    let exe = get_azahar_exe();
    if exe.exists() {
        Ok(true)
    } else {
        Err(
            "Azahar no encontrado. Verifica que esté en binaries/Azahar o en F:\\Emuladores\\3DS."
                .into(),
        )
    }
}

pub fn launch_standalone(
    core_name: &str,
    rom_path: &str,
) -> Result<std::process::ExitStatus, String> {
    match core_name {
        "rpcs3" => {
            let exe = get_rpcs3_exe();
            if !exe.exists() {
                return Err(
                    "RPCS3 no encontrado. Verifica la instalación o ejecuta setup-rpcs3.ps1".into(),
                );
            }
            let mut cmd = Command::new(&exe);
            if let Some(parent) = exe.parent() {
                cmd.current_dir(parent);
            }
            cmd.args(["--no-gui", rom_path])
                .status()
                .map_err(|e| format!("Error lanzando RPCS3: {}", e))
        }
        "azahar" => {
            let exe = get_azahar_exe();
            if !exe.exists() {
                return Err(
                    "Azahar no encontrado. Verifica la instalación o ejecuta setup-azahar.ps1"
                        .into(),
                );
            }
            let mut cmd = Command::new(&exe);
            if let Some(parent) = exe.parent() {
                cmd.current_dir(parent);
            }
            // Launch directly in fullscreen mode
            cmd.args(["-f", rom_path])
                .status()
                .map_err(|e| format!("Error lanzando Azahar: {}", e))
        }
        "pc" | "native" | "windows" => {
            let exe_path = Path::new(rom_path);
            if !exe_path.exists() {
                return Err(format!("Juego de PC no encontrado en: {}", rom_path));
            }
            if exe_path
                .extension()
                .map_or(false, |ext| ext.eq_ignore_ascii_case("lnk"))
            {
                // Sin cmd.exe: Start-Process -LiteralPath no re-parsea ni
                // interpreta metacaracteres (& ^ % ! ") del path.
                let escaped = rom_path.replace('\'', "''");
                let mut cmd = Command::new("powershell");
                if let Some(parent) = exe_path.parent() {
                    cmd.current_dir(parent);
                }
                cmd.args([
                    "-NoProfile",
                    "-NonInteractive",
                    "-Command",
                    &format!("Start-Process -LiteralPath '{}' -Wait", escaped),
                ])
                .status()
                .map_err(|e| format!("Error lanzando acceso directo de PC: {}", e))
            } else {
                let mut cmd = Command::new(exe_path);
                if let Some(parent) = exe_path.parent() {
                    cmd.current_dir(parent);
                }
                cmd.status()
                    .map_err(|e| format!("Error lanzando juego de PC: {}", e))
            }
        }
        _ => Err(format!("Emulador standalone no soportado: {}", core_name)),
    }
}
