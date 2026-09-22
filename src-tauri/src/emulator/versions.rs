use crate::emulator::{get_azahar_exe, get_retroarch_exe, get_rpcs3_exe};
use crate::state::storage::get_data_dir;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Duration;

// ponytail: comparación por igualdad de strings, sin crate semver.
// Si instalado != último conocido y ambos se conocen => hay update.

pub const FOUR_DAYS_SECS: u64 = 4 * 24 * 3600;
pub const PINNED_RETROARCH_VERSION: &str = "1.22.2";

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct EmulatorInfo {
    pub id: String,
    pub display_name: String,
    pub installed: bool,
    pub installed_version: Option<String>,
    pub latest_version: Option<String>,
    pub update_available: bool,
    #[serde(default)]
    pub exe_path: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct EmulatorVersionsManifest {
    #[serde(default)]
    pub installed: HashMap<String, String>,
    #[serde(default)]
    pub last_check_secs: u64,
}

pub fn manifest_path() -> PathBuf {
    get_data_dir().join("emulator_versions.json")
}

pub fn load_manifest() -> EmulatorVersionsManifest {
    let path = manifest_path();
    if path.exists() {
        if let Ok(data) = fs::read_to_string(&path) {
            if let Ok(m) = serde_json::from_str(&data) {
                return m;
            }
        }
    }
    EmulatorVersionsManifest::default()
}

pub fn save_manifest(m: &EmulatorVersionsManifest) {
    let dir = get_data_dir();
    let _ = fs::create_dir_all(&dir);
    if let Ok(json) = serde_json::to_string_pretty(m) {
        let tmp = dir.join("emulator_versions.json.tmp");
        if fs::write(&tmp, json).is_ok() {
            let _ = fs::rename(&tmp, manifest_path());
        }
    }
}

pub fn now_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// Ejecuta `<exe> --version` con timeout (algunos binarios GUI cuelgan).
fn run_version_arg(exe: &Path, args: &[&str]) -> Option<String> {
    let exe = exe.to_path_buf();
    let args: Vec<String> = args.iter().map(|s| s.to_string()).collect();
    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        let out = Command::new(&exe).args(&args).output().ok().map(|o| {
            format!(
                "{}{}",
                String::from_utf8_lossy(&o.stdout),
                String::from_utf8_lossy(&o.stderr)
            )
        });
        let _ = tx.send(out);
    });
    rx.recv_timeout(Duration::from_secs(6)).ok().flatten()
}

/// Salida cruda de `<exe> --version` (vacía si falla). Para comparar en el updater.
pub fn raw_version_output(exe: &Path) -> String {
    run_version_arg(exe, &["--version"]).unwrap_or_default()
}

/// Extrae "1.22.2" de "RetroArch v1.22.2 (Git ...)".
pub fn parse_retroarch_version(output: &str) -> Option<String> {
    let bytes = output.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'v' && i + 1 < bytes.len() && bytes[i + 1].is_ascii_digit() {
            let mut j = i + 1;
            while j < bytes.len() && (bytes[j].is_ascii_digit() || bytes[j] == b'.') {
                j += 1;
            }
            let cand = &output[i + 1..j];
            let cand = cand.trim_end_matches('.');
            if cand.chars().filter(|c| *c == '.').count() >= 1 && !cand.is_empty() {
                return Some(cand.to_string());
            }
            i = j;
        } else {
            i += 1;
        }
    }
    None
}

pub fn normalize_tag(tag: &str) -> String {
    tag.trim().trim_start_matches('v').trim().to_string()
}

fn detect_one(
    id: &str,
    display: &str,
    exe: Option<PathBuf>,
    manifest: &EmulatorVersionsManifest,
) -> EmulatorInfo {
    match exe {
        None => EmulatorInfo {
            id: id.into(),
            display_name: display.into(),
            installed: false,
            installed_version: None,
            latest_version: None,
            update_available: false,
            exe_path: None,
        },
        Some(exe) => {
            let mut ver = run_version_arg(&exe, &["--version"])
                .as_deref()
                .and_then(parse_retroarch_version)
                .map(|v| normalize_tag(&v));
            if ver.is_none() {
                ver = manifest.installed.get(id).cloned();
            }
            EmulatorInfo {
                id: id.into(),
                display_name: display.into(),
                installed: true,
                installed_version: ver,
                latest_version: None,
                update_available: false,
                exe_path: Some(exe.to_string_lossy().to_string()),
            }
        }
    }
}

pub fn detect_installed() -> Vec<EmulatorInfo> {
    let manifest = load_manifest();
    let ra = get_retroarch_exe();
    let rpcs3 = get_rpcs3_exe();
    let azahar = get_azahar_exe();
    let sunshine = crate::commands::cast::get_sunshine_exe();
    vec![
        detect_one(
            "retroarch",
            "RetroArch",
            ra.exists().then_some(ra),
            &manifest,
        ),
        detect_one(
            "rpcs3",
            "RPCS3 (PS3)",
            rpcs3.exists().then_some(rpcs3),
            &manifest,
        ),
        detect_one(
            "azahar",
            "Azahar (3DS)",
            azahar.exists().then_some(azahar),
            &manifest,
        ),
        detect_one("sunshine", "Sunshine (Cast)", sunshine, &manifest),
    ]
}

/// Parsea el listado HTML de https://buildbot.libretro.com/stable/ y devuelve la mayor X.Y.Z.
pub fn parse_stable_listing(html: &str) -> Option<String> {
    let mut best: Option<(u64, u64, u64)> = None;
    let mut start = 0;
    while let Some(pos) = html[start..].find("href=\"") {
        let s = start + pos + 6;
        let rest = &html[s..];
        let end = rest.find('"').unwrap_or(rest.len());
        let name = rest[..end].trim_end_matches('/');
        let parts: Vec<&str> = name.split('.').collect();
        if parts.len() == 3 {
            if let (Ok(a), Ok(b), Ok(c)) = (
                parts[0].parse::<u64>(),
                parts[1].parse::<u64>(),
                parts[2].parse::<u64>(),
            ) {
                if best.is_none_or(|cur| (a, b, c) > cur) {
                    best = Some((a, b, c));
                }
            }
        }
        start = s + end;
    }
    best.map(|(a, b, c)| format!("{}.{}.{}", a, b, c))
}

#[derive(Clone, Debug)]
pub struct LatestRelease {
    pub tag: String,
    pub asset_url: String,
    pub asset_name: String,
}

fn github_latest(repo: &str) -> Result<serde_json::Value, String> {
    let client = crate::emulator::downloader::get_http_client();
    let url = format!("https://api.github.com/repos/{}/releases/latest", repo);
    let resp = client
        .get(&url)
        .header("User-Agent", "NewGamePlus-Updater")
        .send()
        .map_err(|e| format!("HTTP error: {}", e))?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}: {}", resp.status(), url));
    }
    resp.json::<serde_json::Value>().map_err(|e| e.to_string())
}

fn pick_asset(release: &serde_json::Value, want: &dyn Fn(&str) -> bool) -> Option<LatestRelease> {
    let tag = release.get("tag_name")?.as_str()?.to_string();
    let assets = release.get("assets")?.as_array()?;
    for a in assets {
        let name = a.get("name")?.as_str()?;
        if want(name) {
            let url = a.get("browser_download_url")?.as_str()?.to_string();
            return Some(LatestRelease {
                tag,
                asset_url: url,
                asset_name: name.to_string(),
            });
        }
    }
    None
}

pub fn fetch_latest_retroarch() -> Option<String> {
    let client = crate::emulator::downloader::get_http_client();
    if let Ok(resp) = client.get("https://buildbot.libretro.com/stable/").send() {
        if resp.status().is_success() {
            if let Ok(html) = resp.text() {
                if let Some(v) = parse_stable_listing(&html) {
                    return Some(v);
                }
            }
        }
    }
    Some(PINNED_RETROARCH_VERSION.to_string())
}

pub fn fetch_latest_rpcs3() -> Option<LatestRelease> {
    github_latest("RPCS3/rpcs3-binaries-win")
        .ok()
        .and_then(|r| pick_asset(&r, &|n| n.ends_with(".7z")))
}

pub fn fetch_latest_azahar() -> Option<LatestRelease> {
    github_latest("azahar-emu/azahar").ok().and_then(|r| {
        pick_asset(&r, &|n| {
            !n.contains("libretro")
                && (n.contains("azahar-windows-msvc")
                    || n.contains("azahar-windows-msys2")
                    || (n.contains("windows") && n.ends_with(".zip")))
        })
    })
}

pub fn fetch_latest_sunshine() -> Option<LatestRelease> {
    github_latest("LizardByte/Sunshine").ok().and_then(|r| {
        pick_asset(&r, &|n| {
            n.contains("Windows") && n.contains("portable") && n.ends_with(".zip")
        })
    })
}

/// Completa installed + latest y marca update_available (igualdad de strings).
pub fn check_all() -> Vec<EmulatorInfo> {
    let mut infos = detect_installed();
    let latest_ra = fetch_latest_retroarch();
    let latest_rpcs3 = fetch_latest_rpcs3();
    let latest_azahar = fetch_latest_azahar();
    let latest_sunshine = fetch_latest_sunshine();
    for info in &mut infos {
        let latest = match info.id.as_str() {
            "retroarch" => latest_ra.clone(),
            "rpcs3" => latest_rpcs3.as_ref().map(|r| normalize_tag(&r.tag)),
            "azahar" => latest_azahar.as_ref().map(|r| normalize_tag(&r.tag)),
            "sunshine" => latest_sunshine.as_ref().map(|r| normalize_tag(&r.tag)),
            _ => None,
        };
        info.latest_version = latest.clone();
        info.update_available = match (&info.installed_version, &latest) {
            (Some(inst), Some(lat)) => inst != lat,
            _ => false,
        };
    }
    let mut manifest = load_manifest();
    manifest.last_check_secs = now_secs();
    save_manifest(&manifest);
    infos
}

#[cfg(test)]
mod version_tests {
    use super::*;

    #[test]
    fn parses_retroarch_version_line() {
        assert_eq!(
            parse_retroarch_version("RetroArch v1.22.2 (Git 1234abcd)"),
            Some("1.22.2".to_string())
        );
        assert_eq!(parse_retroarch_version("v2.0"), Some("2.0".to_string()));
        assert_eq!(parse_retroarch_version("no version here"), None);
        assert_eq!(parse_retroarch_version(""), None);
    }

    #[test]
    fn normalizes_github_tags() {
        assert_eq!(normalize_tag("v212.01"), "212.01");
        assert_eq!(normalize_tag("  v0.28 "), "0.28");
        assert_eq!(normalize_tag("1.22.2"), "1.22.2");
    }

    #[test]
    fn parses_stable_listing_max() {
        let html = r#"<a href="1.21.0/">1.21.0/</a><a href="1.22.2/">1.22.2/</a><a href="nightly/">nightly/</a><a href="1.9.0/">1.9.0/</a>"#;
        assert_eq!(parse_stable_listing(html), Some("1.22.2".to_string()));
        assert_eq!(parse_stable_listing("empty"), None);
    }
}
