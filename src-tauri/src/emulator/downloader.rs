use crate::platforms;
use crate::state::storage::get_binaries_dir;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

pub fn get_http_client() -> &'static reqwest::blocking::Client {
    static CLIENT: std::sync::OnceLock<reqwest::blocking::Client> = std::sync::OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(4))
            .connect_timeout(std::time::Duration::from_secs(2))
            .build()
            .unwrap_or_default()
    })
}

pub fn download_file(url: &str, dest: &Path) -> Result<(), String> {
    let client = get_http_client();
    let resp = client
        .get(url)
        .send()
        .map_err(|e| format!("HTTP error: {}", e))?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}: {}", resp.status(), url));
    }
    let mut file = fs::File::create(dest).map_err(|e| e.to_string())?;
    file.write_all(&resp.bytes().map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn extract_core_zip(zip_path: &Path, dest_dir: &Path) -> Result<PathBuf, String> {
    let file = fs::File::open(zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("Invalid zip: {}", e))?;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        if entry.is_symlink() || entry.is_dir() {
            continue;
        }
        let name = entry.name().replace('\\', "/");
        // Solo el nombre base: sin rutas, sin .., sin absolutos. El buildbot
        // trae "<core>_libretro.dll" plano; cualquier otra cosa se omite.
        let base = Path::new(&name)
            .file_name()
            .and_then(|n| n.to_str())
            .filter(|n| n.ends_with(".dll"));
        let Some(base) = base else { continue };
        if name != base {
            continue;
        }
        let out_path = dest_dir.join(base);
        let mut out_file = fs::File::create(&out_path).map_err(|e| e.to_string())?;
        std::io::copy(&mut entry, &mut out_file).map_err(|e| e.to_string())?;
        return Ok(out_path);
    }
    Err("No .dll found in zip".into())
}

pub fn get_core_path(core_name: &str) -> PathBuf {
    get_binaries_dir().join(platforms::core_dll_name(core_name))
}

pub fn core_exists(core_name: &str) -> bool {
    get_core_path(core_name).exists()
}

pub fn ensure_core(core_name: &str) -> Result<PathBuf, String> {
    let core_path = get_core_path(core_name);
    if core_path.exists() {
        return Ok(core_path);
    }
    let lower_name = core_name.to_lowercase();
    let lower_path = get_binaries_dir().join(platforms::core_dll_name(&lower_name));
    if lower_path.exists() {
        return Ok(lower_path);
    }

    let url = platforms::core_zip_url(core_name);
    let tmp_zip = std::env::temp_dir().join(format!("gameflix_core_{}.zip", core_name));
    let tmp_dir = std::env::temp_dir().join(format!("gameflix_core_{}", core_name));
    fs::create_dir_all(&tmp_dir).map_err(|e| e.to_string())?;

    let dl_res = download_file(&url, &tmp_zip).or_else(|err| {
        let fallback_url = format!(
            "https://buildbot.libretro.com/nightly/windows/x86_64/latest/{}_libretro.dll.zip",
            lower_name
        );
        if fallback_url != url {
            download_file(&fallback_url, &tmp_zip)
        } else {
            Err(err)
        }
    });

    dl_res?;

    let dll_path = extract_core_zip(&tmp_zip, &tmp_dir)?;
    let dest = get_binaries_dir().join(platforms::core_dll_name(core_name));
    fs::copy(&dll_path, &dest).map_err(|e| e.to_string())?;
    let _ = fs::remove_file(&tmp_zip);
    let _ = fs::remove_dir_all(&tmp_dir);
    Ok(dest)
}
