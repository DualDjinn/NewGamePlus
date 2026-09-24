use crate::state::storage::get_data_dir;
use crate::state::STATE;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MusicTrack {
    pub id: String,
    pub file: String,
    pub file_path: String,
    pub title: String,
    pub game: String,
    pub platform: String,
}

pub fn get_music_dir() -> PathBuf {
    let dir = get_data_dir().join("music");
    let _ = fs::create_dir_all(&dir);
    dir
}

pub fn find_public_music_dir() -> Option<PathBuf> {
    let candidates = [
        PathBuf::from("public").join("music"),
        PathBuf::from("../public").join("music"),
        PathBuf::from("dist").join("music"),
        PathBuf::from("../dist").join("music"),
    ];

    for c in &candidates {
        if c.is_dir() {
            if let Ok(abs) = fs::canonicalize(c) {
                return Some(abs);
            }
            return Some(c.clone());
        }
    }

    if let Ok(exe) = std::env::current_exe() {
        let mut cur = exe.parent();
        for _ in 0..6 {
            if let Some(p) = cur {
                let check_pub = p.join("public").join("music");
                if check_pub.is_dir() {
                    return fs::canonicalize(&check_pub).ok().or(Some(check_pub));
                }
                let check_dist = p.join("dist").join("music");
                if check_dist.is_dir() {
                    return fs::canonicalize(&check_dist).ok().or(Some(check_dist));
                }
                cur = p.parent();
            } else {
                break;
            }
        }
    }

    if let Ok(cwd) = std::env::current_dir() {
        let mut cur = Some(cwd.as_path());
        for _ in 0..6 {
            if let Some(p) = cur {
                let check_pub = p.join("public").join("music");
                if check_pub.is_dir() {
                    return fs::canonicalize(&check_pub).ok().or(Some(check_pub));
                }
                let check_dist = p.join("dist").join("music");
                if check_dist.is_dir() {
                    return fs::canonicalize(&check_dist).ok().or(Some(check_dist));
                }
                cur = p.parent();
            } else {
                break;
            }
        }
    }

    None
}

pub fn scan_music_tracks_inner() -> Vec<MusicTrack> {
    let user_music_dir = get_music_dir();
    let public_music_dir = find_public_music_dir();

    // Sincronizar / poblar data/music con los archivos iniciales si data/music está vacía
    if let Some(ref pub_dir) = public_music_dir {
        let is_empty = match fs::read_dir(&user_music_dir) {
            Ok(mut entries) => entries.next().is_none(),
            Err(_) => true,
        };
        if is_empty {
            if let Ok(entries) = fs::read_dir(pub_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file() {
                        if let Some(name) = path.file_name() {
                            let dest = user_music_dir.join(name);
                            let _ = fs::copy(&path, &dest);
                        }
                    }
                }
            }
        }
    }

    let mut scan_dirs: Vec<PathBuf> = Vec::new();

    // 1. Carpeta base de referencia: public/music
    if let Some(ref pub_dir) = public_music_dir {
        scan_dirs.push(pub_dir.clone());
    }

    // 2. Carpeta de música del usuario en AppData
    if !scan_dirs.iter().any(|d| d == &user_music_dir) {
        scan_dirs.push(user_music_dir.clone());
    }

    // 3. Carpetas personalizadas de música configuradas en Settings
    let (custom_folders, games_info) = {
        if let Ok(state) = STATE.lock() {
            let folders = state
                .settings
                .music_folders
                .iter()
                .map(PathBuf::from)
                .collect::<Vec<_>>();

            let g_info: Vec<(String, String, String)> = state
                .games
                .iter()
                .map(|g| {
                    let disp = g.display_name.clone().unwrap_or_else(|| g.name.clone());
                    (g.name.clone(), disp, g.platform.clone())
                })
                .collect();

            (folders, g_info)
        } else {
            (Vec::new(), Vec::new())
        }
    };

    for cf in custom_folders {
        if cf.is_dir() && !scan_dirs.iter().any(|d| d == &cf) {
            scan_dirs.push(cf);
        }
    }

    let audio_exts = ["ogg", "mp3", "opus", "flac", "wav", "m4a", "aac"];
    let mut tracks: Vec<MusicTrack> = Vec::new();
    let mut seen_ids = HashSet::new();

    fn collect_audio_files(dir: &Path, audio_exts: &[&str], out: &mut Vec<PathBuf>, depth: usize) {
        if depth > 2 {
            return;
        }
        let entries = match fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => return,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                    if audio_exts.contains(&ext.to_lowercase().as_str()) {
                        out.push(path);
                    }
                }
            } else if path.is_dir() {
                collect_audio_files(&path, audio_exts, out, depth + 1);
            }
        }
    }

    for dir in scan_dirs {
        let mut files = Vec::new();
        collect_audio_files(&dir, &audio_exts, &mut files, 0);

        for path in files {
            let file_name = match path.file_name().and_then(|s| s.to_str()) {
                Some(n) => n.to_string(),
                None => continue,
            };

            let stem = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or(&file_name)
                .to_string();

            let stem_lower = stem.to_lowercase();
            let mut matched_game = String::new();
            let mut matched_platform = String::new();
            let mut extracted_title = String::new();

            for (g_name, g_disp, g_plat) in &games_info {
                let name_clean = g_name.trim();
                let disp_clean = g_disp.trim();

                let found = if (name_clean.len() >= 4
                    && stem_lower.contains(&name_clean.to_lowercase()))
                    || (disp_clean.len() >= 4 && stem_lower.contains(&disp_clean.to_lowercase()))
                {
                    Some(disp_clean.to_string())
                } else {
                    None
                };

                if let Some(target) = found {
                    matched_game = target;
                    matched_platform = g_plat.clone();
                    break;
                }
            }

            if matched_game.is_empty() {
                if let Some(dash_idx) = stem.find(" - ") {
                    let p0 = stem[..dash_idx].trim();
                    let p1 = stem[dash_idx + 3..].trim();
                    matched_game = p0.to_string();
                    extracted_title = p1.to_string();
                } else {
                    extracted_title = stem.clone();
                }
            } else if extracted_title.is_empty() {
                if let Some(dash_idx) = stem.find(" - ") {
                    let p0 = stem[..dash_idx].trim();
                    let p1 = stem[dash_idx + 3..].trim();
                    if p0.to_lowercase().contains(&matched_game.to_lowercase()) {
                        extracted_title = p1.to_string();
                    } else if p1.to_lowercase().contains(&matched_game.to_lowercase()) {
                        extracted_title = p0.to_string();
                    } else {
                        extracted_title = stem.clone();
                    }
                } else {
                    extracted_title = stem.clone();
                }
            }

            let file_url = format!("/music/{}", file_name);
            let id = format!(
                "track-{}",
                stem.replace(|c: char| !c.is_alphanumeric(), "-")
                    .to_lowercase()
            );

            if seen_ids.contains(&id) {
                continue;
            }
            seen_ids.insert(id.clone());

            let abs_path = fs::canonicalize(&path).unwrap_or(path);

            tracks.push(MusicTrack {
                id,
                file: file_url,
                file_path: abs_path.to_string_lossy().to_string(),
                title: if extracted_title.is_empty() {
                    stem
                } else {
                    extracted_title
                },
                game: matched_game,
                platform: matched_platform,
            });
        }
    }

    tracks.sort_by_key(|a| a.title.to_lowercase());
    tracks
}

pub fn open_music_folder_impl() -> Result<(), String> {
    let dir = get_music_dir();
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&dir)
            .spawn()
            .map_err(|e| format!("Error al abrir carpeta de música: {}", e))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = open::that(&dir);
    }
    Ok(())
}
