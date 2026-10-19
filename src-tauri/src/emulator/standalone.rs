use crate::state::storage::{get_binaries_dir, get_data_dir};
use serde::Serialize;
use std::fs;
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

pub fn get_eden_exe() -> PathBuf {
    // 1. Emulador bundleado en binaries/Eden/eden.exe
    let bundled = get_binaries_dir().join("Eden").join("eden.exe");
    if bundled.exists() {
        return bundled;
    }
    // 2. Rutas locales habituales
    let common = [
        r"F:\Emuladores\Switch\eden.exe",
        r"F:\Emuladores\Eden\eden.exe",
        r"C:\Eden\eden.exe",
        r"D:\Eden\eden.exe",
        r"E:\Eden\eden.exe",
    ];
    for p in common {
        let pb = PathBuf::from(p);
        if pb.exists() {
            return pb;
        }
    }
    bundled
}

pub fn check_eden() -> Result<bool, String> {
    let exe = get_eden_exe();
    if exe.exists() {
        Ok(true)
    } else {
        Err(
            "Eden no encontrado. Verifica que esté en binaries/Eden o en F:\\Emuladores\\Switch."
                .into(),
        )
    }
}

#[derive(Serialize, Clone, Debug)]
pub struct EdenRequirements {
    pub has_prod_keys: bool,
    pub has_firmware: bool,
    pub keys_dir: String,
    pub firmware_dir: String,
}

/// Carpeta portable `user/` junto al exe (layout heredado de Yuzu):
/// `user/keys/prod.keys`, firmware en `user/nand/system/Contents/registered/`.
pub fn eden_user_dir_for(exe_dir: &Path) -> PathBuf {
    exe_dir.join("user")
}

/// Requisitos de Eden sobre un dir base (testeable; `base` = dir del exe).
pub fn eden_requirements_in(base: &Path) -> EdenRequirements {
    let keys_dir = base.join("user").join("keys");
    let has_prod_keys = keys_dir.join("prod.keys").is_file();
    let registered = base
        .join("user")
        .join("nand")
        .join("system")
        .join("Contents")
        .join("registered");
    // Heurística: firmware instalado si hay al menos un archivo registrado.
    let has_firmware = fs::read_dir(&registered)
        .map(|mut entries| entries.next().is_some())
        .unwrap_or(false);
    EdenRequirements {
        has_prod_keys,
        has_firmware,
        keys_dir: keys_dir.to_string_lossy().to_string(),
        firmware_dir: registered.to_string_lossy().to_string(),
    }
}

pub fn check_eden_keys() -> EdenRequirements {
    match get_eden_exe().parent() {
        Some(dir) => eden_requirements_in(dir),
        None => eden_requirements_in(Path::new("")),
    }
}

/// Crea `<user>/keys` y la abre en el explorador para soltar `prod.keys`.
pub fn open_eden_keys_folder_impl() -> Result<(), String> {
    let exe_dir = get_eden_exe()
        .parent()
        .map(|p| p.to_path_buf())
        .ok_or_else(|| "No se pudo resolver la carpeta de Eden".to_string())?;
    let keys_dir = eden_user_dir_for(&exe_dir).join("keys");
    fs::create_dir_all(&keys_dir).map_err(|e| e.to_string())?;
    Command::new("explorer")
        .arg(&keys_dir)
        .spawn()
        .map_err(|e| format!("Error al abrir carpeta de keys: {}", e))?;
    Ok(())
}

/// Crea `user/nand/.../registered` y la abre para verificar el firmware.
pub fn open_eden_firmware_folder_impl() -> Result<(), String> {
    let exe_dir = get_eden_exe()
        .parent()
        .map(|p| p.to_path_buf())
        .ok_or_else(|| "No se pudo resolver la carpeta de Eden".to_string())?;
    let registered = eden_user_dir_for(&exe_dir)
        .join("nand")
        .join("system")
        .join("Contents")
        .join("registered");
    fs::create_dir_all(&registered).map_err(|e| e.to_string())?;
    Command::new("explorer")
        .arg(&registered)
        .spawn()
        .map_err(|e| format!("Error al abrir carpeta de firmware: {}", e))?;
    Ok(())
}

fn eden_exe_dir_or_err() -> Result<PathBuf, String> {
    if !get_eden_exe().exists() {
        return Err("Eden no está instalado.".into());
    }
    get_eden_exe()
        .parent()
        .map(|p| p.to_path_buf())
        .ok_or_else(|| "No se pudo resolver la carpeta de Eden".to_string())
}

/// Copia `prod.keys` (+ `title.keys` si existe) desde `src_dir` a `base/user/keys`.
/// Testeable; `base` = dir del exe.
pub fn import_eden_keys_in(src_dir: &Path, base: &Path) -> Result<EdenRequirements, String> {
    if !src_dir.is_dir() {
        return Err("Selecciona una carpeta válida.".into());
    }
    let prod = src_dir.join("prod.keys");
    if !prod.is_file() {
        return Err("Esa carpeta no contiene prod.keys.".into());
    }
    let keys_dir = base.join("user").join("keys");
    fs::create_dir_all(&keys_dir).map_err(|e| e.to_string())?;
    fs::copy(&prod, keys_dir.join("prod.keys")).map_err(|e| e.to_string())?;
    let title = src_dir.join("title.keys");
    if title.is_file() {
        fs::copy(&title, keys_dir.join("title.keys")).map_err(|e| e.to_string())?;
    }
    Ok(eden_requirements_in(base))
}

pub fn import_eden_keys_from(src_dir: String) -> Result<EdenRequirements, String> {
    let exe_dir = eden_exe_dir_or_err()?;
    import_eden_keys_in(Path::new(&src_dir), &exe_dir)
}

fn copy_files_overwrite(src: &Path, dst: &Path, count: &mut usize) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        // ponytail: file_type() no sigue symlinks; quedan ignorados y no escapan del destino.
        if ty.is_dir() {
            copy_files_overwrite(&entry.path(), &dst.join(entry.file_name()), count)?;
        } else if ty.is_file() {
            fs::copy(entry.path(), dst.join(entry.file_name()))?;
            *count += 1;
        }
    }
    Ok(())
}

/// Copia el contenido de `src_dir` en `base/user/nand/.../registered/`.
pub fn import_eden_firmware_in(src_dir: &Path, base: &Path) -> Result<EdenRequirements, String> {
    if !src_dir.is_dir() {
        return Err("Selecciona una carpeta válida.".into());
    }
    let registered = base
        .join("user")
        .join("nand")
        .join("system")
        .join("Contents")
        .join("registered");
    let mut count = 0;
    copy_files_overwrite(src_dir, &registered, &mut count).map_err(|e| e.to_string())?;
    if count == 0 {
        return Err("Esa carpeta no contiene archivos de firmware.".into());
    }
    Ok(eden_requirements_in(base))
}

pub fn import_eden_firmware_from(src_dir: String) -> Result<EdenRequirements, String> {
    let exe_dir = eden_exe_dir_or_err()?;
    import_eden_firmware_in(Path::new(&src_dir), &exe_dir)
}

#[derive(Serialize, Clone, Debug)]
pub struct EdenDlcStatus {
    pub installed_entries: usize,
    pub staging_count: usize,
    pub staging_dir: String,
}

/// Updates/DLC instalados viven en la NAND de usuario (no en la de sistema).
pub fn eden_nand_user_registered(base: &Path) -> PathBuf {
    base.join("user")
        .join("nand")
        .join("user")
        .join("Contents")
        .join("registered")
}

/// Carpeta de staging global (dir de datos del usuario, nunca en git).
pub fn eden_staging_dir() -> PathBuf {
    get_data_dir().join("eden_staging")
}

fn count_files(dir: &Path) -> usize {
    fs::read_dir(dir)
        .map(|entries| {
            entries
                .flatten()
                .filter(|e| e.file_type().map(|t| t.is_file()).unwrap_or(false))
                .count()
        })
        .unwrap_or(0)
}

pub fn eden_dlc_status_in(base: &Path, staging: &Path) -> EdenDlcStatus {
    EdenDlcStatus {
        installed_entries: count_files(&eden_nand_user_registered(base)),
        staging_count: count_files(staging),
        staging_dir: staging.to_string_lossy().to_string(),
    }
}

pub fn eden_dlc_status() -> EdenDlcStatus {
    let base = get_eden_exe()
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_default();
    eden_dlc_status_in(&base, &eden_staging_dir())
}

const EDEN_UPDATE_EXTS: &[&str] = &["nsp", "xci", "nsz", "xcz"];

/// Copia archivos de update/DLC al staging. Testeable.
pub fn stage_eden_files_in(
    files: &[String],
    base: &Path,
    staging: &Path,
) -> Result<EdenDlcStatus, String> {
    fs::create_dir_all(staging).map_err(|e| e.to_string())?;
    for f in files {
        let src = Path::new(f);
        let ext = src
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();
        if !EDEN_UPDATE_EXTS.contains(&ext.as_str()) {
            return Err(format!(
                "Archivo no válido para update/DLC: {}",
                src.display()
            ));
        }
        if !src.is_file() {
            return Err(format!("Archivo no encontrado: {}", src.display()));
        }
        let name = src
            .file_name()
            .ok_or_else(|| format!("Ruta inválida: {}", src.display()))?;
        fs::copy(src, staging.join(name)).map_err(|e| e.to_string())?;
    }
    Ok(eden_dlc_status_in(base, staging))
}

pub fn stage_eden_update_files(files: Vec<String>) -> Result<EdenDlcStatus, String> {
    let base = eden_exe_dir_or_err()?;
    stage_eden_files_in(&files, &base, &eden_staging_dir())
}

/// Abre la GUI de Eden sin ROM (detached, sin ocultar la ventana principal)
/// para instalar updates/DLC vía File > Install Files to NAND.
pub fn open_eden_gui() -> Result<String, String> {
    let exe = get_eden_exe();
    if !exe.exists() {
        return Err("Eden no está instalado.".into());
    }
    let mut cmd = Command::new(&exe);
    if let Some(parent) = exe.parent() {
        cmd.current_dir(parent);
    }
    cmd.spawn()
        .map_err(|e| format!("Error abriendo Eden: {}", e))?;
    Ok("Eden abierto para instalar updates/DLC".into())
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
        "eden" => {
            let exe = get_eden_exe();
            if !exe.exists() {
                return Err(
                    "Eden no encontrado. Verifica la instalación o ejecuta setup-eden.ps1".into(),
                );
            }
            let mut cmd = Command::new(&exe);
            if let Some(parent) = exe.parent() {
                cmd.current_dir(parent);
            }
            // Eden Qt CLI (heredado de Yuzu): -g rom, -f fullscreen
            cmd.args(["-f", "-g", rom_path])
                .status()
                .map_err(|e| format!("Error lanzando Eden: {}", e))
        }
        "pc" | "native" | "windows" => {
            let exe_path = Path::new(rom_path);
            if !exe_path.exists() {
                return Err(format!("Juego de PC no encontrado en: {}", rom_path));
            }
            if exe_path
                .extension()
                .is_some_and(|ext| ext.eq_ignore_ascii_case("lnk"))
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
