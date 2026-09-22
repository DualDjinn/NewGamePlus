use crate::emulator::downloader::download_file;
use crate::emulator::versions::{
    fetch_latest_azahar, fetch_latest_retroarch, fetch_latest_rpcs3, fetch_latest_sunshine,
    load_manifest, now_secs, save_manifest, LatestRelease,
};
use crate::emulator::RETROARCH_PID;
use crate::state::lock_state;
use crate::state::storage::get_binaries_dir;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Emitter;

// ponytail: un solo flag global; sin colas ni workers. Un update por vez.
static UPDATE_IN_PROGRESS: AtomicBool = AtomicBool::new(false);

fn emit_status(app: &tauri::AppHandle, msg: &str) {
    let _ = app.emit("setup-status", msg);
}

fn guard_idle() -> Result<(), String> {
    if UPDATE_IN_PROGRESS.load(Ordering::SeqCst) {
        return Err("Ya hay una actualización en curso".into());
    }
    if RETROARCH_PID.load(Ordering::SeqCst) != 0 {
        return Err("Hay un juego en curso. Ciérralo antes de actualizar.".into());
    }
    Ok(())
}

fn take_guard() -> Result<UpdateGuard, String> {
    guard_idle()?;
    if UPDATE_IN_PROGRESS.swap(true, Ordering::SeqCst) {
        return Err("Ya hay una actualización en curso".into());
    }
    Ok(UpdateGuard)
}

struct UpdateGuard;
impl Drop for UpdateGuard {
    fn drop(&mut self) {
        UPDATE_IN_PROGRESS.store(false, Ordering::SeqCst);
    }
}

fn record_installed(id: &str, version: &str) {
    let mut m = load_manifest();
    m.installed.insert(id.into(), version.into());
    m.last_check_secs = now_secs();
    save_manifest(&m);
}

/// Une `dest` + entrada de zip de forma segura: rechaza rutas absolutas
/// (C:\, \\, /), normaliza `.`/`..` léxicamente y exige que el resultado
/// quede dentro de `dest`. Devuelve None si la entrada es maliciosa.
pub fn safe_zip_join(dest: &Path, name: &str) -> Option<PathBuf> {
    use std::path::Component;
    let name = name.replace('\\', "/");
    let mut out = dest.to_path_buf();
    for comp in Path::new(&name).components() {
        match comp {
            Component::Normal(part) => out.push(part),
            Component::CurDir => {}
            // .. que escape, raíces, prefijos UNC/disco: todo fuera.
            _ => return None,
        }
    }
    // Defensa en profundidad: el resultado debe colgar de dest.
    if out == *dest || !out.starts_with(dest) {
        return None;
    }
    Some(out)
}

fn extract_zip_all(zip_path: &Path, dest: &Path) -> Result<(), String> {
    let file = fs::File::open(zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("Zip inválido: {}", e))?;
    let mut wrote_any = false;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().to_string();
        // Symlinks dentro del zip: se omiten (no seguir enlaces al extraer).
        if entry.is_symlink() {
            continue;
        }
        let out = match safe_zip_join(dest, &name) {
            Some(p) => p,
            None => continue,
        };
        if entry.is_dir() {
            fs::create_dir_all(&out).map_err(|e| e.to_string())?;
        } else {
            if let Some(p) = out.parent() {
                fs::create_dir_all(p).map_err(|e| e.to_string())?;
            }
            let mut f = fs::File::create(&out).map_err(|e| e.to_string())?;
            std::io::copy(&mut entry, &mut f).map_err(|e| e.to_string())?;
            wrote_any = true;
        }
    }
    if !wrote_any {
        return Err("El paquete no contenía archivos válidos".into());
    }
    Ok(())
}

fn extract_7z(archive: &Path, dest: &Path) -> Result<(), String> {
    let seven = crate::scanner::iso::find_7z_binary()
        .ok_or_else(|| "Falta 7-Zip para extraer. Instálalo y reintenta.".to_string())?;
    fs::create_dir_all(dest).map_err(|e| e.to_string())?;
    let status = Command::new(&seven)
        .arg("x")
        .arg(archive)
        .arg(format!("-o{}", dest.to_string_lossy()))
        .arg("-y")
        .status()
        .map_err(|e| e.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("7z falló con estado: {}", status))
    }
}

/// Si el archivo extraído trae una única subcarpeta raíz con el exe, devuelve esa carpeta.
fn resolve_root(extract_dir: &Path, exe_names: &[&str]) -> PathBuf {
    if let Ok(entries) = fs::read_dir(extract_dir) {
        let dirs: Vec<PathBuf> = entries
            .flatten()
            .map(|e| e.path())
            .filter(|p| p.is_dir())
            .collect();
        if dirs.len() == 1 {
            for exe in exe_names {
                if dirs[0].join(exe).exists() {
                    return dirs[0].clone();
                }
            }
        }
    }
    extract_dir.to_path_buf()
}

/// Mueve rutas preservadas (saves/config) del backup al dir ya activado.
/// Se llama DESPUÉS del swap: si el swap falla, nada se movió y el backup
/// sigue intacto (antes se movía antes y un fallo dejaba saves huérfanos).
fn preserve_paths(bak: &Path, target: &Path, names: &[&str]) {
    for name in names {
        let src = bak.join(name);
        if src.exists() {
            let dst = target.join(name);
            if dst.exists() {
                let _ = fs::remove_dir_all(&dst);
                let _ = fs::remove_file(&dst);
            }
            if let Some(p) = dst.parent() {
                let _ = fs::create_dir_all(p);
            }
            let _ = fs::rename(&src, &dst);
        }
    }
}

/// Fusiona BIOS del usuario desde el backup al system/ ya activado:
/// copia lo que falta sin pisar archivos nuevos.
fn merge_system_dir(bak_system: &Path, target_system: &Path) {
    if !bak_system.exists() {
        return;
    }
    let _ = fs::create_dir_all(target_system);
    if let Ok(entries) = fs::read_dir(bak_system) {
        for entry in entries.flatten() {
            let src = entry.path();
            if let Some(fname) = src.file_name() {
                let dst = target_system.join(fname);
                if !dst.exists() {
                    if src.is_dir() {
                        let _ = crate::state::storage::copy_dir_all(&src, &dst);
                    } else {
                        let _ = fs::copy(&src, &dst);
                    }
                }
            }
        }
    }
}

/// Activa `fresh` como `target`: target→.bak, fresh→target.
/// Devuelve el .bak para preservar desde él y borrarlo al final.
/// Si algo falla, restaura y NO se movió nada del backup.
fn stage_swap(target: &Path, fresh: &Path) -> Result<PathBuf, String> {
    let bak = target.with_extension("bak");
    if bak.exists() {
        let _ = fs::remove_dir_all(&bak);
        let _ = fs::remove_file(&bak);
    }
    if target.exists() {
        fs::rename(target, &bak).map_err(|e| format!("Backup falló: {}", e))?;
    }
    if let Err(e) = fs::rename(fresh, target) {
        let _ = fs::rename(&bak, target);
        return Err(format!("Activación falló (se restauró backup): {}", e));
    }
    Ok(bak)
}

fn temp_workdir(prefix: &str) -> Result<PathBuf, String> {
    use std::sync::atomic::{AtomicU64, Ordering};
    static CTR: AtomicU64 = AtomicU64::new(0);
    // pid + timestamp + contador: evita colisiones y adivinación trivial.
    let dir = std::env::temp_dir().join(format!(
        "ngplus_{}_{}_{}_{}",
        prefix,
        std::process::id(),
        now_secs(),
        CTR.fetch_add(1, Ordering::SeqCst)
    ));
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

pub fn update_retroarch(app: &tauri::AppHandle) -> Result<String, String> {
    let _g = take_guard()?;
    let latest =
        fetch_latest_retroarch().ok_or("No se pudo averiguar la última versión (¿sin red?)")?;
    let exe = crate::emulator::get_retroarch_exe();
    let current = crate::emulator::versions::parse_retroarch_version(
        &crate::emulator::versions::raw_version_output(&exe),
    );
    if current.as_deref() == Some(latest.as_str()) {
        return Ok(format!("RetroArch ya está al día ({})", latest));
    }

    emit_status(app, &format!("Descargando RetroArch {}...", latest));
    let url = format!(
        "https://buildbot.libretro.com/stable/{}/windows/x86_64/RetroArch.7z",
        latest
    );
    let work = temp_workdir("retroarch")?;
    let archive = work.join("RetroArch.7z");
    download_file(&url, &archive)?;
    emit_status(app, "Extrayendo RetroArch...");
    let extracted = work.join("extracted");
    extract_7z(&archive, &extracted)?;
    let fresh = resolve_root(&extracted, &["retroarch.exe"]);
    if !fresh.join("retroarch.exe").exists() {
        return Err("El paquete no contiene retroarch.exe".into());
    }

    let target = get_binaries_dir().join("RetroArch");
    let bak = stage_swap(&target, &fresh)?;
    merge_system_dir(&bak.join("system"), &target.join("system"));
    let _ = fs::remove_dir_all(&bak);
    let _ = fs::remove_dir_all(&work);
    record_installed("retroarch", &latest);
    emit_status(app, "");
    Ok(format!("RetroArch actualizado a {}", latest))
}

fn update_standalone_inner(
    app: &tauri::AppHandle,
    id: &str,
    display: &str,
    latest: &LatestRelease,
    target_dir: &Path,
    exe_names: &[&str],
    preserve: &[&str],
) -> Result<String, String> {
    emit_status(app, &format!("Descargando {} {}...", display, latest.tag));
    let work = temp_workdir(id)?;
    let archive = work.join(&latest.asset_name);
    download_file(&latest.asset_url, &archive)?;
    emit_status(app, &format!("Extrayendo {}...", display));
    let extracted = work.join("extracted");
    if latest.asset_name.ends_with(".zip") {
        extract_zip_all(&archive, &extracted)?;
    } else {
        extract_7z(&archive, &extracted)?;
    }
    let fresh = resolve_root(&extracted, exe_names);
    if !exe_names.iter().any(|e| fresh.join(e).exists()) {
        return Err(format!(
            "El paquete no contiene el ejecutable esperado ({})",
            exe_names.join("/")
        ));
    }
    let bak = stage_swap(target_dir, &fresh)?;
    preserve_paths(&bak, target_dir, preserve);
    let _ = fs::remove_dir_all(&bak);
    let _ = fs::remove_dir_all(&work);
    record_installed(id, &crate::emulator::versions::normalize_tag(&latest.tag));
    emit_status(app, "");
    Ok(format!("{} actualizado a {}", display, latest.tag))
}

pub fn update_standalone(app: &tauri::AppHandle, id: &str) -> Result<String, String> {
    let _g = take_guard()?;
    let bin = get_binaries_dir();
    match id {
        "rpcs3" => {
            let latest =
                fetch_latest_rpcs3().ok_or("No se pudo averiguar la última versión de RPCS3")?;
            update_standalone_inner(
                app,
                "rpcs3",
                "RPCS3",
                &latest,
                &bin.join("RPCS3"),
                &["rpcs3.exe"],
                &["dev_hdd0", "config", "config.yml", "GuiConfigs"],
            )
        }
        "azahar" => {
            let latest =
                fetch_latest_azahar().ok_or("No se pudo averiguar la última versión de Azahar")?;
            update_standalone_inner(
                app,
                "azahar",
                "Azahar",
                &latest,
                &bin.join("Azahar"),
                &["azahar.exe", "azahar-qt.exe"],
                &[],
            )
        }
        "sunshine" => {
            let latest = fetch_latest_sunshine()
                .ok_or("No se pudo averiguar la última versión de Sunshine")?;
            update_standalone_inner(
                app,
                "sunshine",
                "Sunshine",
                &latest,
                &bin.join("Sunshine"),
                &["sunshine.exe"],
                &["config", "sunshine.conf", "apps.json"],
            )
        }
        _ => Err(format!("Emulador no soportado: {}", id)),
    }
}

pub fn update_all_cores(app: &tauri::AppHandle) -> Result<Vec<String>, String> {
    let _g = take_guard()?;
    let cores: Vec<String> = {
        let state = lock_state();
        let mut set = std::collections::HashSet::new();
        for g in &state.games {
            set.insert(g.core_name.clone());
        }
        for c in state.settings.platform_cores.values() {
            set.insert(c.clone());
        }
        set.into_iter()
            .filter(|c| !crate::platforms::is_standalone_emulator(c))
            .collect()
    };
    let total = cores.len();
    let mut updated = Vec::new();
    for (i, core) in cores.iter().enumerate() {
        emit_status(
            app,
            &format!("Actualizando core {}/{}: {}...", i + 1, total, core),
        );
        // Descarga primero y reemplaza al final: si falla la red, el core viejo sigue intacto.
        match redownload_core(core) {
            Ok(_) => updated.push(core.clone()),
            Err(e) => {
                emit_status(app, "");
                return Err(format!("Falló el core {}: {}", core, e));
            }
        }
    }
    emit_status(app, "");
    Ok(updated)
}

/// Re-descarga un core y lo reemplaza de forma atómica (tmp + rename).
fn redownload_core(core_name: &str) -> Result<PathBuf, String> {
    use crate::emulator::downloader::extract_core_zip;
    use crate::platforms;
    let lower = core_name.to_lowercase();
    let urls = [
        platforms::core_zip_url(core_name),
        format!(
            "https://buildbot.libretro.com/nightly/windows/x86_64/latest/{}_libretro.dll.zip",
            lower
        ),
    ];
    let work = temp_workdir(&format!("core_{}", lower))?;
    let tmp_zip = work.join("core.zip");
    let mut dl_err = String::new();
    let mut ok = false;
    for url in urls {
        match download_file(&url, &tmp_zip) {
            Ok(()) => {
                ok = true;
                break;
            }
            Err(e) => dl_err = e,
        }
    }
    if !ok {
        let _ = fs::remove_dir_all(&work);
        return Err(dl_err);
    }
    let tmp_dir = work.join("extracted");
    fs::create_dir_all(&tmp_dir).map_err(|e| e.to_string())?;
    let dll = extract_core_zip(&tmp_zip, &tmp_dir)?;
    let dest = crate::emulator::downloader::get_core_path(core_name);
    let staging = dest.with_extension("dll.new");
    fs::copy(&dll, &staging).map_err(|e| e.to_string())?;
    fs::rename(&staging, &dest).map_err(|e| e.to_string())?;
    let _ = fs::remove_dir_all(&work);
    Ok(dest)
}

#[cfg(test)]
mod updater_tests {
    use super::*;

    #[test]
    fn safe_zip_join_blocks_traversal() {
        let dest = Path::new("C:/app/binaries");
        assert!(safe_zip_join(dest, "core.dll").is_some());
        assert!(safe_zip_join(dest, "sub/core.dll").is_some());
        assert!(safe_zip_join(dest, "../evil.dll").is_none());
        assert!(safe_zip_join(dest, "a/../../evil.dll").is_none());
        assert!(safe_zip_join(dest, "C:/Windows/evil.dll").is_none());
        assert!(safe_zip_join(dest, "/etc/evil.dll").is_none());
        assert!(safe_zip_join(dest, "\\\\server\\evil.dll").is_none());
        assert!(safe_zip_join(dest, "").is_none());
        assert!(safe_zip_join(dest, ".").is_none());
    }
}
