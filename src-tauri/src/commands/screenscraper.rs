use crate::metadata::screenscraper::{self, verify_credentials};
use crate::state::lock_state;
use crate::state::secrets;
use crate::state::storage::{get_data_dir, save_state};
use crate::steamgriddb;
use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::Emitter;

#[derive(Serialize, Debug)]
pub struct ScreenScraperConfigStatus {
    pub has_dev_credentials: bool,
    pub dev_id: Option<String>,
    pub has_user_credentials: bool,
    pub username: Option<String>,
}

#[derive(Serialize, Debug)]
pub struct ScrapeResult {
    pub success: bool,
    pub video_path: Option<String>,
    pub logo_path: Option<String>,
    pub message: String,
}

/// Helper para obtener credenciales activas del perfil actual
fn get_active_credentials() -> Result<(String, String, Option<String>, Option<String>), String> {
    let state = lock_state();
    let profile_name = &state.settings.current_profile;
    let profile = state
        .settings
        .profiles
        .iter()
        .find(|p| &p.name == profile_name)
        .ok_or_else(|| "Perfil activo no encontrado".to_string())?;

    let dev_id = profile
        .screenscraper_dev_id
        .clone()
        .filter(|k| !k.trim().is_empty())
        .ok_or_else(|| {
            "No hay usuario Dev de ScreenScraper configurado. Ve a Configuración > Integraciones.".to_string()
        })?;

    let dev_pass = secrets::reveal_opt(&profile.screenscraper_dev_pass)
        .filter(|k| !k.trim().is_empty())
        .ok_or_else(|| {
            "No hay contraseña Dev de ScreenScraper configurada. Ve a Configuración > Integraciones.".to_string()
        })?;

    let user = profile
        .screenscraper_user
        .clone()
        .filter(|u| !u.trim().is_empty());

    let pass = secrets::reveal_opt(&profile.screenscraper_pass)
        .filter(|p| !p.trim().is_empty());

    Ok((dev_id, dev_pass, user, pass))
}

#[tauri::command]
pub fn save_screenscraper_config(
    dev_id: String,
    dev_pass: String,
    user: Option<String>,
    pass: Option<String>,
) -> Result<(), String> {
    let dev_id_clean = dev_id.trim();
    let dev_pass_clean = dev_pass.trim();
    let user_clean = user.as_ref().map(|u| u.trim()).filter(|u| !u.is_empty());
    let pass_clean = pass.as_ref().map(|p| p.trim()).filter(|p| !p.is_empty());

    if dev_id_clean.is_empty() || dev_pass_clean.is_empty() {
        return Err("Usuario Dev y Contraseña Dev son obligatorios".into());
    }

    // Validar conexión con ScreenScraper antes de guardar
    verify_credentials(dev_id_clean, dev_pass_clean, user_clean, pass_clean)?;

    let mut state = lock_state();
    let profile_name = state.settings.current_profile.clone();
    if let Some(profile) = state
        .settings
        .profiles
        .iter_mut()
        .find(|p| p.name == profile_name)
    {
        profile.screenscraper_dev_id = Some(dev_id_clean.to_string());
        profile.screenscraper_dev_pass = Some(secrets::protect(dev_pass_clean)?);
        profile.screenscraper_user = user_clean.map(|u| u.to_string());
        profile.screenscraper_pass = match pass_clean {
            Some(p) => Some(secrets::protect(p)?),
            None => None,
        };
    }
    save_state(&state);
    Ok(())
}

#[tauri::command]
pub fn get_screenscraper_config() -> Result<ScreenScraperConfigStatus, String> {
    let state = lock_state();
    let profile_name = &state.settings.current_profile;
    if let Some(profile) = state.settings.profiles.iter().find(|p| &p.name == profile_name) {
        let has_dev = profile.screenscraper_dev_id.is_some()
            && secrets::reveal_opt(&profile.screenscraper_dev_pass).is_some();
        let has_user = profile.screenscraper_user.is_some()
            && secrets::reveal_opt(&profile.screenscraper_pass).is_some();

        Ok(ScreenScraperConfigStatus {
            has_dev_credentials: has_dev,
            dev_id: profile.screenscraper_dev_id.clone(),
            has_user_credentials: has_user,
            username: profile.screenscraper_user.clone(),
        })
    } else {
        Ok(ScreenScraperConfigStatus {
            has_dev_credentials: false,
            dev_id: None,
            has_user_credentials: false,
            username: None,
        })
    }
}

#[tauri::command]
pub fn clear_screenscraper_config() -> Result<(), String> {
    let mut state = lock_state();
    let profile_name = state.settings.current_profile.clone();
    if let Some(profile) = state
        .settings
        .profiles
        .iter_mut()
        .find(|p| p.name == profile_name)
    {
        profile.screenscraper_dev_id = None;
        profile.screenscraper_dev_pass = None;
        profile.screenscraper_user = None;
        profile.screenscraper_pass = None;
    }
    save_state(&state);
    Ok(())
}

use std::sync::atomic::{AtomicBool, Ordering};
use crate::commands::games::resolve_game_video;

static CANCEL_BATCH: AtomicBool = AtomicBool::new(false);
static BATCH_RUNNING: AtomicBool = AtomicBool::new(false);

#[derive(Serialize, Clone, Debug)]
pub struct BatchScrapeProgress {
    pub current_index: usize,
    pub total: usize,
    pub game_id: String,
    pub game_name: String,
    pub status: String,
    pub percent: u32,
    pub downloaded_count: u32,
    pub skipped_count: u32,
    pub failed_count: u32,
}

/// Helper central para descargar medios (video y/o logo) de un juego
pub fn download_game_media_sync(
    dev_id: &str,
    dev_pass: &str,
    user: Option<&str>,
    pass: Option<&str>,
    game_id: &str,
    rom_path: &str,
    platform: &str,
    game_name: &str,
    download_logo: bool,
    progress_fn: Option<Box<dyn Fn(u32, &str) + Send>>,
) -> Result<ScrapeResult, String> {
    let rom_p = Path::new(rom_path);
    if !rom_p.exists() {
        return Err(format!("No se encontró el archivo de ROM en '{}'", rom_path));
    }

    if let Some(ref cb) = progress_fn {
        cb(5, "searching");
    }

    let media_urls = screenscraper::fetch_game_media(
        dev_id,
        dev_pass,
        user,
        pass,
        rom_p,
        platform,
        game_name,
    )?;

    if let Some(ref cb) = progress_fn {
        cb(15, "starting_download");
    }

    let mut downloaded_video_path = None;
    let mut downloaded_logo_path = None;

    // 1. Descarga de Video Snap
    if let Some(video_url) = &media_urls.video_url {
        let target_video_dest: PathBuf = if let (Some(parent), Some(stem)) = (rom_p.parent(), rom_p.file_stem()) {
            let videos_folder = parent.join("videos");
            let _ = std::fs::create_dir_all(&videos_folder);
            if videos_folder.exists() {
                videos_folder.join(format!("{}.mp4", stem.to_string_lossy()))
            } else {
                let fallback = get_data_dir().join("videos");
                let _ = std::fs::create_dir_all(&fallback);
                fallback.join(format!("{}.mp4", game_id))
            }
        } else {
            let fallback = get_data_dir().join("videos");
            let _ = std::fs::create_dir_all(&fallback);
            fallback.join(format!("{}.mp4", game_id))
        };

        match screenscraper::download_asset(
            video_url,
            &target_video_dest,
            dev_id,
            dev_pass,
            user,
            pass,
            None::<fn(u32)>,
        ) {
            Ok(p) => {
                downloaded_video_path = Some(p.to_string_lossy().to_string());
            }
            Err(e) => {
                eprintln!("[ScreenScraper] Error descargando video: {}", e);
            }
        }
    }

    // 2. Descarga de Wheel Logo
    if download_logo {
        if let Some(logo_url) = &media_urls.logo_url {
            let logos_dir = steamgriddb::get_logos_dir(&get_data_dir());
            let _ = std::fs::create_dir_all(&logos_dir);
            let target_logo_dest = logos_dir.join(format!("{}.png", game_id));

            match screenscraper::download_asset(
                logo_url,
                &target_logo_dest,
                dev_id,
                dev_pass,
                user,
                pass,
                None::<fn(u32)>,
            ) {
                Ok(p) => {
                    let logo_str = p.to_string_lossy().to_string();
                    downloaded_logo_path = Some(logo_str.clone());

                    let mut state = lock_state();
                    if let Some(g) = state.games.iter_mut().find(|g| g.id == game_id) {
                        if g.logo_path.is_none() {
                            g.logo_path = Some(logo_str);
                        }
                    }
                    save_state(&state);
                }
                Err(e) => {
                    eprintln!("[ScreenScraper] Error descargando wheel logo: {}", e);
                }
            }
        }
    }

    if let Some(ref cb) = progress_fn {
        cb(100, "done");
    }

    let success = downloaded_video_path.is_some() || downloaded_logo_path.is_some();
    let message = if downloaded_video_path.is_some() && downloaded_logo_path.is_some() {
        "Gameplay video y wheel logo descargados exitosamente".to_string()
    } else if downloaded_video_path.is_some() {
        "Gameplay video descargado exitosamente".to_string()
    } else if downloaded_logo_path.is_some() {
        "Wheel logo descargado exitosamente (video no disponible)".to_string()
    } else {
        "No se pudo descargar ningún medio de ScreenScraper para este juego".to_string()
    };

    Ok(ScrapeResult {
        success,
        video_path: downloaded_video_path,
        logo_path: downloaded_logo_path,
        message,
    })
}

#[tauri::command]
pub fn scrape_game_video(
    app: tauri::AppHandle,
    game_id: String,
    rom_path: String,
    platform: String,
    game_name: String,
    download_logo: Option<bool>,
) -> Result<ScrapeResult, String> {
    let (dev_id, dev_pass, user, pass) = get_active_credentials()?;
    let rom_p = Path::new(&rom_path);
    if !rom_p.exists() {
        return Err(format!("No se encontró el archivo de ROM en '{}'", rom_path));
    }

    let _ = app.emit(
        "scrape-video-progress",
        serde_json::json!({
            "game_id": &game_id,
            "percent": 5,
            "stage": "searching"
        }),
    );

    let media_urls = screenscraper::fetch_game_media(
        &dev_id,
        &dev_pass,
        user.as_deref(),
        pass.as_deref(),
        rom_p,
        &platform,
        &game_name,
    )?;

    let _ = app.emit(
        "scrape-video-progress",
        serde_json::json!({
            "game_id": &game_id,
            "percent": 15,
            "stage": "starting_download"
        }),
    );

    let mut downloaded_video_path = None;
    let mut downloaded_logo_path = None;

    // 1. Descarga de Video Snap
    if let Some(video_url) = &media_urls.video_url {
        let target_video_dest: PathBuf = if let (Some(parent), Some(stem)) = (rom_p.parent(), rom_p.file_stem()) {
            let videos_folder = parent.join("videos");
            let _ = std::fs::create_dir_all(&videos_folder);
            if videos_folder.exists() {
                videos_folder.join(format!("{}.mp4", stem.to_string_lossy()))
            } else {
                let fallback = get_data_dir().join("videos");
                let _ = std::fs::create_dir_all(&fallback);
                fallback.join(format!("{}.mp4", game_id))
            }
        } else {
            let fallback = get_data_dir().join("videos");
            let _ = std::fs::create_dir_all(&fallback);
            fallback.join(format!("{}.mp4", game_id))
        };

        let app_handle = app.clone();
        let current_gid = game_id.clone();
        let progress_cb = move |pct: u32| {
            let scaled = 15 + (pct * 75 / 100);
            let _ = app_handle.emit(
                "scrape-video-progress",
                serde_json::json!({
                    "game_id": &current_gid,
                    "percent": scaled,
                    "stage": "downloading"
                }),
            );
        };

        match screenscraper::download_asset(
            video_url,
            &target_video_dest,
            &dev_id,
            &dev_pass,
            user.as_deref(),
            pass.as_deref(),
            Some(progress_cb),
        ) {
            Ok(p) => {
                downloaded_video_path = Some(p.to_string_lossy().to_string());
            }
            Err(e) => {
                eprintln!("[ScreenScraper] Error descargando video: {}", e);
            }
        }
    }

    // 2. Descarga de Wheel Logo
    let should_download_logo = download_logo.unwrap_or(true);
    if should_download_logo {
        if let Some(logo_url) = &media_urls.logo_url {
            let _ = app.emit(
                "scrape-video-progress",
                serde_json::json!({
                    "game_id": &game_id,
                    "percent": 92,
                    "stage": "logo"
                }),
            );

            let logos_dir = steamgriddb::get_logos_dir(&get_data_dir());
            let _ = std::fs::create_dir_all(&logos_dir);
            let target_logo_dest = logos_dir.join(format!("{}.png", game_id));

            match screenscraper::download_asset(
                logo_url,
                &target_logo_dest,
                &dev_id,
                &dev_pass,
                user.as_deref(),
                pass.as_deref(),
                None::<fn(u32)>,
            ) {
                Ok(p) => {
                    let logo_str = p.to_string_lossy().to_string();
                    downloaded_logo_path = Some(logo_str.clone());

                    let mut state = lock_state();
                    if let Some(g) = state.games.iter_mut().find(|g| g.id == game_id) {
                        if g.logo_path.is_none() {
                            g.logo_path = Some(logo_str);
                        }
                    }
                    save_state(&state);
                }
                Err(e) => {
                    eprintln!("[ScreenScraper] Error descargando wheel logo: {}", e);
                }
            }
        }
    }

    let _ = app.emit(
        "scrape-video-progress",
        serde_json::json!({
            "game_id": &game_id,
            "percent": 100,
            "stage": "done"
        }),
    );

    let success = downloaded_video_path.is_some() || downloaded_logo_path.is_some();
    let message = if downloaded_video_path.is_some() && downloaded_logo_path.is_some() {
        "Gameplay video y wheel logo descargados exitosamente".to_string()
    } else if downloaded_video_path.is_some() {
        "Gameplay video descargado exitosamente".to_string()
    } else if downloaded_logo_path.is_some() {
        "Wheel logo descargado exitosamente (video no disponible)".to_string()
    } else {
        "No se pudo descargar ningún medio de ScreenScraper para este juego".to_string()
    };

    Ok(ScrapeResult {
        success,
        video_path: downloaded_video_path,
        logo_path: downloaded_logo_path,
        message,
    })
}

#[tauri::command]
pub fn cancel_scrape_library_videos() -> Result<(), String> {
    CANCEL_BATCH.store(true, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
pub fn scrape_library_videos(
    app: tauri::AppHandle,
    only_missing: bool,
) -> Result<(), String> {
    if BATCH_RUNNING.compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst).is_err() {
        return Err("Ya hay una descarga masiva de videos en ejecución.".to_string());
    }

    let (dev_id, dev_pass, user, pass) = match get_active_credentials() {
        Ok(c) => c,
        Err(e) => {
            BATCH_RUNNING.store(false, Ordering::SeqCst);
            return Err(e);
        }
    };

    CANCEL_BATCH.store(false, Ordering::SeqCst);

    let (games, video_folders) = {
        let state = lock_state();
        (state.games.clone(), state.settings.video_folders.clone())
    };

    std::thread::spawn(move || {
        let total = games.len();
        let mut downloaded_count = 0u32;
        let mut skipped_count = 0u32;
        let mut failed_count = 0u32;

        for (idx, game) in games.iter().enumerate() {
            if CANCEL_BATCH.load(Ordering::SeqCst) {
                let _ = app.emit(
                    "scrape-batch-progress",
                    BatchScrapeProgress {
                        current_index: idx,
                        total,
                        game_id: game.id.clone(),
                        game_name: game.display_name.clone().unwrap_or_else(|| game.name.clone()),
                        status: "cancelled".to_string(),
                        percent: if total > 0 { (idx as u32 * 100) / total as u32 } else { 0 },
                        downloaded_count,
                        skipped_count,
                        failed_count,
                    },
                );
                BATCH_RUNNING.store(false, Ordering::SeqCst);
                return;
            }

            let game_title = game.display_name.clone().unwrap_or_else(|| game.name.clone());

            // Si only_missing es true y ya tiene video resoluble, omitir
            if only_missing && resolve_game_video(&game.rom_path, &game.id, &video_folders).is_some() {
                skipped_count += 1;
                let pct = if total > 0 { ((idx + 1) as u32 * 100) / total as u32 } else { 100 };
                let _ = app.emit(
                    "scrape-batch-progress",
                    BatchScrapeProgress {
                        current_index: idx + 1,
                        total,
                        game_id: game.id.clone(),
                        game_name: game_title,
                        status: "skipped".to_string(),
                        percent: pct,
                        downloaded_count,
                        skipped_count,
                        failed_count,
                    },
                );
                continue;
            }

            let pct = if total > 0 { (idx as u32 * 100) / total as u32 } else { 0 };
            let _ = app.emit(
                "scrape-batch-progress",
                BatchScrapeProgress {
                    current_index: idx + 1,
                    total,
                    game_id: game.id.clone(),
                    game_name: game_title.clone(),
                    status: "downloading".to_string(),
                    percent: pct,
                    downloaded_count,
                    skipped_count,
                    failed_count,
                },
            );

            let scrape_res = download_game_media_sync(
                &dev_id,
                &dev_pass,
                user.as_deref(),
                pass.as_deref(),
                &game.id,
                &game.rom_path,
                &game.platform,
                &game_title,
                game.logo_path.is_none(),
                None,
            );

            match scrape_res {
                Ok(res) if res.success => {
                    downloaded_count += 1;
                    let _ = app.emit(
                        "game-video-updated",
                        serde_json::json!({
                            "gameId": game.id,
                            "videoPath": res.video_path,
                            "logoPath": res.logo_path,
                        }),
                    );
                    let end_pct = if total > 0 { ((idx + 1) as u32 * 100) / total as u32 } else { 100 };
                    let _ = app.emit(
                        "scrape-batch-progress",
                        BatchScrapeProgress {
                            current_index: idx + 1,
                            total,
                            game_id: game.id.clone(),
                            game_name: game_title,
                            status: "success".to_string(),
                            percent: end_pct,
                            downloaded_count,
                            skipped_count,
                            failed_count,
                        },
                    );
                }
                _ => {
                    failed_count += 1;
                    let end_pct = if total > 0 { ((idx + 1) as u32 * 100) / total as u32 } else { 100 };
                    let _ = app.emit(
                        "scrape-batch-progress",
                        BatchScrapeProgress {
                            current_index: idx + 1,
                            total,
                            game_id: game.id.clone(),
                            game_name: game_title,
                            status: "failed".to_string(),
                            percent: end_pct,
                            downloaded_count,
                            skipped_count,
                            failed_count,
                        },
                    );
                }
            }

            // Intervalo de cortesía para no saturar la API
            std::thread::sleep(std::time::Duration::from_millis(750));
        }

        let _ = app.emit(
            "scrape-batch-progress",
            BatchScrapeProgress {
                current_index: total,
                total,
                game_id: String::new(),
                game_name: String::new(),
                status: "completed".to_string(),
                percent: 100,
                downloaded_count,
                skipped_count,
                failed_count,
            },
        );

        BATCH_RUNNING.store(false, Ordering::SeqCst);
    });

    Ok(())
}
