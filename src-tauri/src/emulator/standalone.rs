use std::path::PathBuf;
use std::process::Command;
use crate::state::storage::get_binaries_dir;

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
        Err("RPCS3 no encontrado. Verifica que esté en binaries/RPCS3 o en F:\\Emuladores\\PS3.".into())
    }
}

pub fn launch_standalone(core_name: &str, rom_path: &str) -> Result<std::process::ExitStatus, String> {
    match core_name {
        "rpcs3" => {
            let exe = get_rpcs3_exe();
            if !exe.exists() {
                return Err("RPCS3 no encontrado. Verifica la instalación o ejecuta setup-rpcs3.ps1".into());
            }
            let mut cmd = Command::new(&exe);
            if let Some(parent) = exe.parent() {
                cmd.current_dir(parent);
            }
            cmd.args(["--no-gui", rom_path])
                .status()
                .map_err(|e| format!("Error lanzando RPCS3: {}", e))
        }
        _ => Err(format!("Emulador standalone no soportado: {}", core_name)),
    }
}
