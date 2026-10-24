use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Emitter;

use crate::scanner::pc::{download_file_to, find_local_cover, find_primary_pc_game_exe};
use crate::scanner::roms::{file_mtime_secs, fnv1a_id};
use crate::state::models::Game;
use crate::steamgriddb;

/// Estructura interna para representar los datos leídos de un appmanifest de Steam
#[derive(Debug, Clone)]
struct SteamAppManifest {
    appid: u32,
    name: String,
    installdir: String,
    #[allow(dead_code)]
    state_flags: u32,
}

/// Detecta si un appid o nombre de Steam corresponde a una herramienta/redistribuible o no es un juego
fn is_steam_tool(appid: u32, name: &str) -> bool {
    match appid {
        228980   // Steamworks Common Redistributables
        | 250820 // SteamVR
        | 431960 // Wallpaper Engine
        | 218010 // Steam Linux Runtime
        | 1070560 // Steam Linux Runtime - Soldier
        | 1391110 // Steam Linux Runtime - Sniper
        | 1628350 // Steam Linux Runtime - Medic
        => return true,
        _ => {}
    }

    let lower = name.to_lowercase();
    lower.contains("redistributable")
        || lower.contains("dedicated server")
        || lower.contains("steamvr")
        || lower.ends_with(" sound track")
        || lower.ends_with(" soundtrack")
        || lower.ends_with(" ost")
}

/// Parsea un archivo `appmanifest_<appid>.acf` de Steam
fn parse_acf_file(content: &str) -> Option<SteamAppManifest> {
    let mut appid = None;
    let mut name = None;
    let mut installdir = None;
    let mut state_flags = 0;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("\"appid\"") {
            if let Some((_, v)) = trimmed.split_once("\"appid\"") {
                appid = v.trim().trim_matches('"').parse::<u32>().ok();
            }
        } else if trimmed.starts_with("\"name\"") {
            if let Some((_, v)) = trimmed.split_once("\"name\"") {
                name = Some(v.trim().trim_matches('"').to_string());
            }
        } else if trimmed.starts_with("\"installdir\"") {
            if let Some((_, v)) = trimmed.split_once("\"installdir\"") {
                installdir = Some(v.trim().trim_matches('"').to_string());
            }
        } else if trimmed.starts_with("\"StateFlags\"") {
            if let Some((_, v)) = trimmed.split_once("\"StateFlags\"") {
                state_flags = v.trim().trim_matches('"').parse::<u32>().unwrap_or(0);
            }
        }
    }

    if let (Some(appid), Some(name), Some(installdir)) = (appid, name, installdir) {
        Some(SteamAppManifest {
            appid,
            name,
            installdir,
            state_flags,
        })
    } else {
        None
    }
}

fn fetch_sgdb_cover(api_key: &str, title: &str, dest_path: &Path) -> Option<String> {
    crate::metadata::steamgrid::fetch_steamgrid_boxart(api_key, title, dest_path)
}

fn fetch_sgdb_hero(api_key: &str, title: &str, dest_path: &Path) -> Option<String> {
    if let Ok(heroes) = steamgriddb::search_heroes(api_key, title) {
        if let Some(first) = heroes.first() {
            if steamgriddb::download_hero(&first.url, dest_path).is_ok() {
                return Some(dest_path.to_string_lossy().to_string());
            }
        }
    }
    None
}

fn fetch_sgdb_logo(api_key: &str, title: &str, dest_path: &Path) -> Option<String> {
    steamgriddb::fetch_steamgrid_logo(api_key, title, dest_path)
}

/// Obtiene la ruta de instalación de Steam desde el registro de Windows o rutas conocidas
fn get_steam_install_dir() -> Option<PathBuf> {
    // 1. Intentar HKCU\Software\Valve\Steam\SteamPath
    if let Ok(output) = std::process::Command::new("reg")
        .args(["query", "HKCU\\Software\\Valve\\Steam", "/v", "SteamPath"])
        .output()
    {
        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines() {
                if line.contains("SteamPath") {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 3 {
                        let path_str = parts[2..].join(" ");
                        let p = PathBuf::from(path_str.replace('/', "\\"));
                        if p.exists() {
                            return Some(p);
                        }
                    }
                }
            }
        }
    }

    // 2. Intentar HKLM\SOFTWARE\WOW6432Node\Valve\Steam\InstallPath
    if let Ok(output) = std::process::Command::new("reg")
        .args([
            "query",
            "HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam",
            "/v",
            "InstallPath",
        ])
        .output()
    {
        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines() {
                if line.contains("InstallPath") {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 3 {
                        let path_str = parts[2..].join(" ");
                        let p = PathBuf::from(path_str.replace('/', "\\"));
                        if p.exists() {
                            return Some(p);
                        }
                    }
                }
            }
        }
    }

    // 3. Fallbacks a rutas estándar
    for candidate in [
        r"F:\Steam",
        r"F:\steam",
        r"C:\Program Files (x86)\Steam",
        r"C:\Program Files\Steam",
        r"D:\Steam",
        r"D:\steam",
        r"E:\Steam",
        r"E:\steam",
    ] {
        let p = PathBuf::from(candidate);
        if p.exists() {
            return Some(p);
        }
    }

    None
}

/// Lee todas las bibliotecas de Steam a partir del archivo `libraryfolders.vdf`
fn get_steam_library_folders(steam_path: &Path) -> Vec<PathBuf> {
    let mut libraries = vec![steam_path.to_path_buf()];
    let vdf_path = steam_path.join("steamapps").join("libraryfolders.vdf");

    if let Ok(content) = fs::read_to_string(&vdf_path) {
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("\"path\"") {
                if let Some((_, val)) = trimmed.split_once("\"path\"") {
                    let raw_path = val.trim().trim_matches('"');
                    let clean = raw_path.replace("\\\\", "\\");
                    let p = PathBuf::from(&clean);
                    if p.exists() {
                        let is_dup = libraries.iter().any(|lib| {
                            lib.to_string_lossy().eq_ignore_ascii_case(&clean)
                                || (lib.canonicalize().is_ok()
                                    && lib.canonicalize().ok() == p.canonicalize().ok())
                        });
                        if !is_dup {
                            libraries.push(p);
                        }
                    }
                }
            }
        }
    }

    libraries
}

/// Escanea todos los juegos de Steam instalados en cualquier disco
pub fn scan_installed_steam_games(
    thumb_dir: &Path,
    heroes_dir: &Path,
    logos_dir: &Path,
    existing_games: &[Game],
    steamgrid_key: Option<&str>,
) -> Vec<Game> {
    let mut games = Vec::new();

    let steam_path = match get_steam_install_dir() {
        Some(p) => p,
        None => return games,
    };

    let library_folders = get_steam_library_folders(&steam_path);

    for library in library_folders {
        let steamapps = library.join("steamapps");
        if !steamapps.exists() {
            continue;
        }

        let entries = match fs::read_dir(&steamapps) {
            Ok(e) => e,
            Err(_) => continue,
        };

        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }

            let file_name = match path.file_name().and_then(|s| s.to_str()) {
                Some(name) => name,
                None => continue,
            };

            if !file_name.starts_with("appmanifest_") || !file_name.ends_with(".acf") {
                continue;
            }

            let content = match fs::read_to_string(&path) {
                Ok(c) => c,
                Err(_) => continue,
            };

            let manifest = match parse_acf_file(&content) {
                Some(m) => m,
                None => continue,
            };

            if is_steam_tool(manifest.appid, &manifest.name) {
                continue;
            }

            let game_dir = library
                .join("steamapps")
                .join("common")
                .join(&manifest.installdir);
            if !game_dir.exists() {
                continue;
            }

            // Encontrar el ejecutable principal
            let primary_exe = match find_primary_pc_game_exe(&game_dir) {
                Some(exe) => exe,
                None => continue,
            };

            let rom_path = primary_exe.to_string_lossy().to_string();
            let game_id = format!("{:x}", fnv1a_id(&rom_path));

            // Preservar datos de juego existente si ya estaba registrado
let existing = existing_games
    .iter()
    .find(|g| g.id == game_id || g.rom_path == rom_path);

if let Some(eg) = existing {
    let mt = file_mtime_secs(std::path::Path::new(&rom_path));
    if mt.is_some() && eg.rom_mtime == mt {
        let mut g = eg.clone();
        g.rom_mtime = mt;
        games.push(g);
        continue;
    }
}

            let mut cover_path = existing.and_then(|g| g.cover_path.clone());
            let mut hero_path = existing.and_then(|g| g.hero_path.clone());
            let mut logo_path = existing.and_then(|g| g.logo_path.clone());

            // 1. Obtener Carátula Vertical (Póster 600x900)
            if cover_path.is_none() || !cover_path.as_ref().is_some_and(|p| Path::new(p).exists()) {
                // Probar descargar carátula vertical oficial de Steam CDN
                let steam_cover_url = format!(
                    "https://cdn.akamai.steamstatic.com/steam/apps/{}/library_600x900_2x.jpg",
                    manifest.appid
                );
                let dest_cover = thumb_dir.join(format!("{}.jpg", game_id));

                if download_file_to(&steam_cover_url, &dest_cover) {
                    cover_path = Some(dest_cover.to_string_lossy().to_string());
                } else {
                    // Alternativa: library_600x900.jpg simple
                    let alt_cover_url = format!(
                        "https://cdn.akamai.steamstatic.com/steam/apps/{}/library_600x900.jpg",
                        manifest.appid
                    );
                    if download_file_to(&alt_cover_url, &dest_cover) {
                        cover_path = Some(dest_cover.to_string_lossy().to_string());
                    } else if let Some(local_c) = find_local_cover(&game_dir) {
                        cover_path = Some(local_c.to_string_lossy().to_string());
                    } else if let Some(key) = steamgrid_key {
                        // Buscar en SteamGridDB
                        if let Some(saved) = fetch_sgdb_cover(key, &manifest.name, &dest_cover) {
                            cover_path = Some(saved);
                        }
                    }
                }
            }

            // 2. Obtener Hero Banner (Horizontal HD)
            if hero_path.is_none() || !hero_path.as_ref().is_some_and(|p| Path::new(p).exists()) {
                let steam_hero_url = format!(
                    "https://cdn.akamai.steamstatic.com/steam/apps/{}/library_hero.jpg",
                    manifest.appid
                );
                let dest_hero = heroes_dir.join(format!("{}.jpg", game_id));

                if download_file_to(&steam_hero_url, &dest_hero) {
                    hero_path = Some(dest_hero.to_string_lossy().to_string());
                } else if let Some(key) = steamgrid_key {
                    if let Some(saved) = fetch_sgdb_hero(key, &manifest.name, &dest_hero) {
                        hero_path = Some(saved);
                    }
                }
            }

            // 3. Obtener Logo (PNG Transparente)
            if logo_path.is_none() || !logo_path.as_ref().is_some_and(|p| Path::new(p).exists()) {
                let steam_logo_url = format!(
                    "https://cdn.akamai.steamstatic.com/steam/apps/{}/logo.png",
                    manifest.appid
                );
                let dest_logo = logos_dir.join(format!("{}.png", game_id));

                if download_file_to(&steam_logo_url, &dest_logo) {
                    logo_path = Some(dest_logo.to_string_lossy().to_string());
                } else if let Some(key) = steamgrid_key {
                    if let Some(saved) = fetch_sgdb_logo(key, &manifest.name, &dest_logo) {
                        logo_path = Some(saved);
                    }
                }
            }

            let favorite = existing.map(|g| g.favorite).unwrap_or(false);
            let play_time_secs = existing.and_then(|g| g.play_time_secs);
            let last_played = existing.and_then(|g| g.last_played.clone());
            let custom_title = existing.and_then(|g| g.custom_title);
            let display_name = existing
                .and_then(|g| g.display_name.clone())
                .or_else(|| Some(manifest.name.clone()));

            games.push(Game {
                id: game_id,
                name: manifest.name,
                platform: "PC".to_string(),
                rom_path: rom_path.clone(),
                core_name: "pc".to_string(),
                cover_path,
                favorite,
                last_played,
                genre: Some("PC".to_string()),
                display_name,
                play_time_secs,
                hero_path,
                logo_path,
                custom_title,
                developer: None,
                publisher: None,
                release_year: None,
                region: None,
            rom_mtime: file_mtime_secs(std::path::Path::new(&rom_path)),
            manual_exe: false,
            });
        }
    }

    games
}

/// Escanea juegos instalados de Riot Games (League of Legends, Valorant, Teamfight Tactics)
pub fn scan_installed_riot_games(
    thumb_dir: &Path,
    heroes_dir: &Path,
    logos_dir: &Path,
    existing_games: &[Game],
    steamgrid_key: Option<&str>,
) -> Vec<Game> {
    let mut games = Vec::new();

    let riot_programs =
        PathBuf::from(r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Riot Games");
    if !riot_programs.exists() {
        return games;
    }

    let entries = match fs::read_dir(&riot_programs) {
        Ok(e) => e,
        Err(_) => return games,
    };

    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let name = match path.file_stem().and_then(|s| s.to_str()) {
            Some(n) => n,
            None => continue,
        };

        let lower = name.to_lowercase();
        // Ignorar accesos directos al cliente puro o desinstaladores
        if lower.contains("cliente de riot")
            || lower == "riot client"
            || lower.contains("uninstall")
        {
            continue;
        }

        let game_title = name.to_string();
        let rom_path = path.to_string_lossy().to_string();
        let game_id = format!("{:x}", fnv1a_id(&rom_path));

        let existing = existing_games
            .iter()
            .find(|g| g.id == game_id || g.rom_path == rom_path);

        let mut cover_path = existing.and_then(|g| g.cover_path.clone());
        let mut hero_path = existing.and_then(|g| g.hero_path.clone());
        let mut logo_path = existing.and_then(|g| g.logo_path.clone());

        let dest_cover = thumb_dir.join(format!("{}.jpg", game_id));
        let dest_hero = heroes_dir.join(format!("{}.jpg", game_id));
        let dest_logo = logos_dir.join(format!("{}.png", game_id));

        if (cover_path.is_none() || !cover_path.as_ref().is_some_and(|p| Path::new(p).exists()))
            && dest_cover.exists()
        {
            cover_path = Some(dest_cover.to_string_lossy().to_string());
        }

        if (hero_path.is_none() || !hero_path.as_ref().is_some_and(|p| Path::new(p).exists()))
            && dest_hero.exists()
        {
            hero_path = Some(dest_hero.to_string_lossy().to_string());
        }

        if (logo_path.is_none() || !logo_path.as_ref().is_some_and(|p| Path::new(p).exists()))
            && dest_logo.exists()
        {
            logo_path = Some(dest_logo.to_string_lossy().to_string());
        }

        // Si tenemos SteamGridDB Key, buscar carátula, hero y logo automáticamente
        if let Some(key) = steamgrid_key {
            if cover_path.is_none() {
                if let Some(saved) = fetch_sgdb_cover(key, &game_title, &dest_cover) {
                    cover_path = Some(saved);
                }
            }
            if hero_path.is_none() {
                if let Some(saved) = fetch_sgdb_hero(key, &game_title, &dest_hero) {
                    hero_path = Some(saved);
                }
            }
            if logo_path.is_none() {
                if let Some(saved) = fetch_sgdb_logo(key, &game_title, &dest_logo) {
                    logo_path = Some(saved);
                }
            }
        }

        let favorite = existing.map(|g| g.favorite).unwrap_or(false);
        let play_time_secs = existing.and_then(|g| g.play_time_secs);
        let last_played = existing.and_then(|g| g.last_played.clone());
        let custom_title = existing.and_then(|g| g.custom_title);
        let display_name = existing
            .and_then(|g| g.display_name.clone())
            .or_else(|| Some(game_title.clone()));

        games.push(Game {
            id: game_id,
            name: game_title,
            platform: "PC".to_string(),
            rom_path: rom_path.clone(),
            core_name: "pc".to_string(),
            cover_path,
            favorite,
            last_played,
            genre: Some("MOBA / Online".to_string()),
            display_name,
            play_time_secs,
            hero_path,
            logo_path,
            custom_title,
            developer: Some("Riot Games".to_string()),
            publisher: Some("Riot Games".to_string()),
            release_year: None,
            region: None,
            rom_mtime: file_mtime_secs(std::path::Path::new(&rom_path)),
            manual_exe: false,
        });
    }

    games
}

/// Escanea juegos instalados de Epic Games Launcher mediante sus manifiestos `.item`
pub fn scan_installed_epic_games(
    thumb_dir: &Path,
    heroes_dir: &Path,
    logos_dir: &Path,
    existing_games: &[Game],
    steamgrid_key: Option<&str>,
) -> Vec<Game> {
    let mut games = Vec::new();

    let manifests_dir = PathBuf::from(
        std::env::var("ProgramData").unwrap_or_else(|_| r"C:\ProgramData".to_string())
            + r"\Epic\EpicGamesLauncher\Data\Manifests",
    );

    if !manifests_dir.exists() {
        return games;
    }

    let entries = match fs::read_dir(&manifests_dir) {
        Ok(e) => e,
        Err(_) => return games,
    };

    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) != Some("item") {
            continue;
        }

        let content = match fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let val: serde_json::Value = match serde_json::from_str(&content) {
            Ok(v) => v,
            Err(_) => continue,
        };

        let display_name = match val.get("DisplayName").and_then(|v| v.as_str()) {
            Some(n) if !n.trim().is_empty() => n.trim().to_string(),
            _ => continue,
        };

        let install_loc = match val.get("InstallLocation").and_then(|v| v.as_str()) {
            Some(loc) if !loc.trim().is_empty() => PathBuf::from(loc),
            _ => continue,
        };

        let launch_exe = match val.get("LaunchExecutable").and_then(|v| v.as_str()) {
            Some(exe) if !exe.trim().is_empty() => exe,
            _ => continue,
        };

        let full_exe = install_loc.join(launch_exe);
        if !full_exe.exists() {
            continue;
        }

        let rom_path = full_exe.to_string_lossy().to_string();
        let game_id = format!("{:x}", fnv1a_id(&rom_path));

        let existing = existing_games
            .iter()
            .find(|g| g.id == game_id || g.rom_path == rom_path);

        let mut cover_path = existing.and_then(|g| g.cover_path.clone());
        let mut hero_path = existing.and_then(|g| g.hero_path.clone());
        let mut logo_path = existing.and_then(|g| g.logo_path.clone());

        let dest_cover = thumb_dir.join(format!("{}.jpg", game_id));
        let dest_hero = heroes_dir.join(format!("{}.jpg", game_id));
        let dest_logo = logos_dir.join(format!("{}.png", game_id));

        if let Some(key) = steamgrid_key {
            if cover_path.is_none() {
                if let Some(saved) = fetch_sgdb_cover(key, &display_name, &dest_cover) {
                    cover_path = Some(saved);
                }
            }
            if hero_path.is_none() {
                if let Some(saved) = fetch_sgdb_hero(key, &display_name, &dest_hero) {
                    hero_path = Some(saved);
                }
            }
            if logo_path.is_none() {
                if let Some(saved) = fetch_sgdb_logo(key, &display_name, &dest_logo) {
                    logo_path = Some(saved);
                }
            }
        }

        let favorite = existing.map(|g| g.favorite).unwrap_or(false);
        let play_time_secs = existing.and_then(|g| g.play_time_secs);
        let last_played = existing.and_then(|g| g.last_played.clone());
        let custom_title = existing.and_then(|g| g.custom_title);

        games.push(Game {
            id: game_id,
            name: display_name.clone(),
            platform: "PC".to_string(),
            rom_path: rom_path.clone(),
            core_name: "pc".to_string(),
            cover_path,
            favorite,
            last_played,
            genre: Some("PC".to_string()),
            display_name: Some(display_name),
            play_time_secs,
            hero_path,
            logo_path,
            custom_title,
            developer: None,
            publisher: None,
            release_year: None,
            region: None,
            rom_mtime: file_mtime_secs(std::path::Path::new(&rom_path)),
            manual_exe: false,
        });
    }

    games
}

/// Escanea accesos directos de juegos individuales en Start Menu
pub fn scan_start_menu_games(
    thumb_dir: &Path,
    heroes_dir: &Path,
    logos_dir: &Path,
    existing_games: &[Game],
    steamgrid_key: Option<&str>,
) -> Vec<Game> {
    let mut games = Vec::new();

    let candidates = [
        PathBuf::from(r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Games"),
        PathBuf::from(
            std::env::var("APPDATA").unwrap_or_default()
                + r"\Microsoft\Windows\Start Menu\Programs\Games",
        ),
    ];

    for folder in &candidates {
        if !folder.exists() {
            continue;
        }

        for entry in walkdir::WalkDir::new(folder)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) != Some("lnk") {
                continue;
            }

            let name = match path.file_stem().and_then(|s| s.to_str()) {
                Some(n) => n,
                None => continue,
            };

            let lower = name.to_lowercase();
            if lower.contains("uninstall") || lower.contains("config") {
                continue;
            }

            let game_title = name.to_string();
            let rom_path = path.to_string_lossy().to_string();
            let game_id = format!("{:x}", fnv1a_id(&rom_path));

let existing = existing_games
    .iter()
    .find(|g| g.id == game_id || g.rom_path == rom_path);

if let Some(eg) = existing {
    let mt = file_mtime_secs(std::path::Path::new(&rom_path));
    if mt.is_some() && eg.rom_mtime == mt {
        let mut g = eg.clone();
        g.rom_mtime = mt;
        games.push(g);
        continue;
    }
}

            let mut cover_path = existing.and_then(|g| g.cover_path.clone());
            let mut hero_path = existing.and_then(|g| g.hero_path.clone());
            let mut logo_path = existing.and_then(|g| g.logo_path.clone());

            let dest_cover = thumb_dir.join(format!("{}.jpg", game_id));
            let dest_hero = heroes_dir.join(format!("{}.jpg", game_id));
            let dest_logo = logos_dir.join(format!("{}.png", game_id));

            if let Some(key) = steamgrid_key {
                if cover_path.is_none() {
                    if let Some(saved) = fetch_sgdb_cover(key, &game_title, &dest_cover) {
                        cover_path = Some(saved);
                    }
                }
                if hero_path.is_none() {
                    if let Some(saved) = fetch_sgdb_hero(key, &game_title, &dest_hero) {
                        hero_path = Some(saved);
                    }
                }
                if logo_path.is_none() {
                    if let Some(saved) = fetch_sgdb_logo(key, &game_title, &dest_logo) {
                        logo_path = Some(saved);
                    }
                }
            }

            let favorite = existing.map(|g| g.favorite).unwrap_or(false);
            let play_time_secs = existing.and_then(|g| g.play_time_secs);
            let last_played = existing.and_then(|g| g.last_played.clone());
            let custom_title = existing.and_then(|g| g.custom_title);

            games.push(Game {
                id: game_id,
                name: game_title.clone(),
                platform: "PC".to_string(),
                rom_path: rom_path.clone(),
                core_name: "pc".to_string(),
                cover_path,
                favorite,
                last_played,
                genre: Some("PC".to_string()),
                display_name: Some(game_title),
                play_time_secs,
                hero_path,
                logo_path,
                custom_title,
                developer: None,
                publisher: None,
                release_year: None,
                region: None,
            rom_mtime: file_mtime_secs(std::path::Path::new(&rom_path)),
            manual_exe: false,
            });
        }
    }

    games
}

/// Función principal que escanea todas las fuentes de juegos de PC instalados
pub fn scan_all_installed_pc_games(
    app: &tauri::AppHandle,
    thumb_dir: &Path,
    heroes_dir: &Path,
    logos_dir: &Path,
    existing_games: &[Game],
    steamgrid_key: Option<&str>,
) -> Vec<Game> {
    let _ = app.emit(
        "scan-progress",
        serde_json::json!({
            "phase": "folders",
            "current": 1,
            "total": 1,
            "label": "Detectando juegos instalados de PC (Steam, Riot Games...)",
        }),
    );

    let mut all_pc_games = Vec::new();
    let mut seen_ids = HashSet::new();
    let mut seen_paths = HashSet::new();

    // 1. Steam Games (Enshrouded, Aniimo, DragonSword, etc.)
    let steam_games = scan_installed_steam_games(
        thumb_dir,
        heroes_dir,
        logos_dir,
        existing_games,
        steamgrid_key,
    );
    for g in steam_games {
        if seen_ids.insert(g.id.clone()) && seen_paths.insert(g.rom_path.clone()) {
            all_pc_games.push(g);
        }
    }

    // 2. Riot Games (League of Legends, Teamfight Tactics, etc.)
    let riot_games = scan_installed_riot_games(
        thumb_dir,
        heroes_dir,
        logos_dir,
        existing_games,
        steamgrid_key,
    );
    for g in riot_games {
        if seen_ids.insert(g.id.clone()) && seen_paths.insert(g.rom_path.clone()) {
            all_pc_games.push(g);
        }
    }

    // 3. Epic Games
    let epic_games = scan_installed_epic_games(
        thumb_dir,
        heroes_dir,
        logos_dir,
        existing_games,
        steamgrid_key,
    );
    for g in epic_games {
        if seen_ids.insert(g.id.clone()) && seen_paths.insert(g.rom_path.clone()) {
            all_pc_games.push(g);
        }
    }

    // 4. Accesos directos de Start Menu
    let start_games = scan_start_menu_games(
        thumb_dir,
        heroes_dir,
        logos_dir,
        existing_games,
        steamgrid_key,
    );
    for g in start_games {
        if seen_ids.insert(g.id.clone()) && seen_paths.insert(g.rom_path.clone()) {
            all_pc_games.push(g);
        }
    }

    // Preserve manually-associated PC games: drop auto-detected duplicates by name
    let manual_existing: Vec<Game> = existing_games
        .iter()
        .filter(|g| g.manual_exe && g.platform == "PC")
        .cloned()
        .collect();
    let mut result = Vec::new();
    for g in all_pc_games {
        let gname = g.display_name.as_deref().unwrap_or(&g.name).to_lowercase();
        let dup = manual_existing.iter().any(|m| {
            m.display_name.as_deref().unwrap_or(&m.name).to_lowercase() == gname
        });
        if !dup {
            result.push(g);
        }
    }
    for m in manual_existing {
        if !result.iter().any(|g| g.id == m.id) {
            result.push(m);
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_pc_games_locally() {
        let temp_dir = std::env::temp_dir();
        let steam_games = scan_installed_steam_games(&temp_dir, &temp_dir, &temp_dir, &[], None);
        println!("Detected {} steam games", steam_games.len());
        for g in &steam_games {
            println!("Steam Game: {} => {}", g.name, g.rom_path);
        }
        assert!(
            steam_games
                .iter()
                .any(|g| g.name.to_lowercase().contains("enshrouded")),
            "Enshrouded should be detected"
        );
        assert!(
            steam_games
                .iter()
                .any(|g| g.name.to_lowercase().contains("aniimo")),
            "Aniimo should be detected"
        );
        assert!(
            steam_games
                .iter()
                .any(|g| g.name.to_lowercase().contains("dragonsword")),
            "DragonSword should be detected"
        );

        let riot_games = scan_installed_riot_games(&temp_dir, &temp_dir, &temp_dir, &[], None);
        println!("Detected {} riot games", riot_games.len());
        for g in &riot_games {
            println!("Riot Game: {} => {}", g.name, g.rom_path);
        }
        assert!(
            riot_games
                .iter()
                .any(|g| g.name.to_lowercase().contains("league of legends")),
            "League of Legends should be detected"
        );
    }
}
