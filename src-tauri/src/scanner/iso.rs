use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

/// Busca el ejecutable de 7-Zip en rutas estándar de Windows o en el PATH
pub fn find_7z_binary() -> Option<PathBuf> {
    // 1. Probar comando directo en PATH
    let mut probe = Command::new("7z");
    #[cfg(target_os = "windows")]
    probe.creation_flags(0x08000000); // CREATE_NO_WINDOW
    if probe.arg("--help").output().is_ok() {
        return Some(PathBuf::from("7z"));
    }

    // 2. Rutas conocidas en Windows
    let candidates = [
        r"C:\Program Files\7-Zip\7z.exe",
        r"C:\Program Files (x86)\7-Zip\7z.exe",
    ];
    for c in candidates {
        let p = PathBuf::from(c);
        if p.exists() {
            return Some(p);
        }
    }

    // 3. LocalAppData de usuario
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        let p = PathBuf::from(local_app_data)
            .join("Programs")
            .join("7-Zip")
            .join("7z.exe");
        if p.exists() {
            return Some(p);
        }
    }

    // 4. Directorio de binarios de la aplicación
    let bundled = crate::state::storage::get_binaries_dir()
        .join("7z")
        .join("7z.exe");
    if bundled.exists() {
        return Some(bundled);
    }

    None
}

/// Mueve recursivamente el contenido de un directorio origen a un destino
fn move_dir_contents(src_dir: &Path, dst_dir: &Path) -> std::io::Result<()> {
    if !dst_dir.exists() {
        fs::create_dir_all(dst_dir)?;
    }
    for entry in fs::read_dir(src_dir)? {
        let entry = entry?;
        let src_path = entry.path();
        let file_name = entry.file_name();
        let dst_path = dst_dir.join(&file_name);

        if src_path.is_dir() {
            if dst_path.exists() {
                move_dir_contents(&src_path, &dst_path)?;
                let _ = fs::remove_dir(&src_path);
            } else if fs::rename(&src_path, &dst_path).is_err() {
                // Fallback copy + delete si rename entre particiones fallara
                copy_dir_recursive(&src_path, &dst_path)?;
                let _ = fs::remove_dir_all(&src_path);
            }
        } else {
            if dst_path.exists() {
                let _ = fs::remove_file(&dst_path);
            }
            if fs::rename(&src_path, &dst_path).is_err() {
                fs::copy(&src_path, &dst_path)?;
                let _ = fs::remove_file(&src_path);
            }
        }
    }
    Ok(())
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let src_p = entry.path();
        let dst_p = dst.join(entry.file_name());
        if src_p.is_dir() {
            copy_dir_recursive(&src_p, &dst_p)?;
        } else {
            fs::copy(&src_p, &dst_p)?;
        }
    }
    Ok(())
}

/// Extrae una ISO de PS3, normaliza la estructura y borra la ISO de forma segura.
/// Retorna la ruta al nuevo `EBOOT.BIN` si tiene éxito.
pub fn extract_and_cleanup_ps3_iso(
    iso_path: &Path,
    root_scan_folder: &Path,
) -> Result<PathBuf, String> {
    let seven_zip = find_7z_binary().ok_or_else(|| {
        "No se encontró 7-Zip (7z.exe). Por favor instala 7-Zip para extraer ISOs de PS3 automáticamente.".to_string()
    })?;

    // Determinar carpeta destino:
    // Si la ISO está directamente dentro de la raíz escaneada (e.g. F:\Roms\PS3\Juego.iso),
    // creamos una subcarpeta con el nombre de la ISO para no mezclar juegos.
    // Si ya está en su propia carpeta (e.g. F:\Roms\PS3\Juego\Juego.iso), usamos esa misma carpeta.
    let parent = iso_path.parent().unwrap_or(root_scan_folder);
    let target_dir = if parent == root_scan_folder {
        let stem = iso_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("PS3_Game");
        parent.join(stem)
    } else {
        parent.to_path_buf()
    };

    if !target_dir.exists() {
        fs::create_dir_all(&target_dir).map_err(|e| {
            format!(
                "No se pudo crear carpeta destino {}: {}",
                target_dir.display(),
                e
            )
        })?;
    }

    // Ejecutar 7-Zip
    let mut cmd = Command::new(&seven_zip);
    cmd.args([
        "x",
        &iso_path.to_string_lossy(),
        &format!("-o{}", target_dir.display()),
        "-y",
    ]);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

    let output = cmd
        .output()
        .map_err(|e| format!("Error iniciando 7-Zip para {}: {}", iso_path.display(), e))?;

    // 7z: código 0 es éxito, código 1 es advertencia (muy frecuente en ISOs UDF 2.50 por padding al final, datos intactos)
    if !output.status.success() && output.status.code() != Some(1) {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(format!(
            "7-Zip falló al descomprimir {} (código {:?}): {}\n{}",
            iso_path.display(),
            output.status.code(),
            stderr.trim(),
            stdout.lines().take(5).collect::<Vec<_>>().join("\n")
        ));
    }

    // Normalizar estructura:
    // Si PS3_GAME no está en la raíz de target_dir, buscar si quedó dentro de una subcarpeta (ej. target_dir/NombreJuego/PS3_GAME)
    let ps3_game_root = target_dir.join("PS3_GAME");
    if !ps3_game_root.exists() {
        if let Ok(entries) = fs::read_dir(&target_dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_dir() && p.join("PS3_GAME").exists() {
                    // Mover todo el contenido de p hacia target_dir
                    let _ = move_dir_contents(&p, &target_dir);
                    let _ = fs::remove_dir_all(&p);
                    break;
                }
            }
        }
    }

    // Verificación estricta: PS3_GAME/USRDIR/EBOOT.BIN DEBE existir antes de tocar la ISO
    let eboot_path = target_dir.join("PS3_GAME").join("USRDIR").join("EBOOT.BIN");
    if !eboot_path.exists() {
        return Err(format!(
            "Extracción finalizada pero no se encontró PS3_GAME/USRDIR/EBOOT.BIN en {}. Se conservará la ISO original.",
            target_dir.display()
        ));
    }

    // Borrado seguro de la ISO
    if let Err(e) = fs::remove_file(iso_path) {
        eprintln!(
            "Advertencia: El juego se extrajo correctamente pero no se pudo eliminar la ISO {}: {}",
            iso_path.display(),
            e
        );
    }

    Ok(eboot_path)
}
