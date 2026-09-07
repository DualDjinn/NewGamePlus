use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use crate::state::models::volume_to_db;
use crate::state::storage::{get_binaries_dir, get_data_dir};
use crate::state::STATE;

pub fn get_retroarch_exe() -> PathBuf {
    get_binaries_dir().join("RetroArch").join("retroarch.exe")
}

pub fn check_retroarch() -> Result<bool, String> {
    let ra_exe = get_retroarch_exe();
    if ra_exe.exists() {
        Ok(true)
    } else {
        Err("RetroArch no encontrado. Reinstala la aplicación.".into())
    }
}

#[allow(dead_code)]
fn detect_system_retroarch_language() -> u32 {
    #[cfg(target_os = "windows")]
    {
        extern "system" {
            fn GetUserDefaultUILanguage() -> u16;
        }
        let lang_id = unsafe { GetUserDefaultUILanguage() };
        let primary_lang = lang_id & 0x03FF;
        match primary_lang {
            0x0a => 3, // Spanish (Español)
            0x09 => 0, // English
            0x0c => 2, // French (Français)
            0x07 => 4, // German (Deutsch)
            0x10 => 5, // Italian (Italiano)
            0x16 => 7, // Portuguese (Português)
            0x19 => 9, // Russian (Русский)
            0x12 => 10, // Korean (한국어)
            0x04 => 12, // Chinese Simplified
            0x11 => 1, // Japanese (日本語)
            _ => 3, // Default to Spanish
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        3 // Default to Spanish
    }
}

pub fn ensure_retroarch(profile_name: &str) -> Result<(PathBuf, PathBuf), String> {
    let ra_exe = get_retroarch_exe();
    if !ra_exe.exists() {
        return Err("RetroArch no encontrado. Reinstala la aplicación.".into());
    }

    let safe_profile = profile_name.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");
    let saves_dir = get_data_dir().join("saves").join(&safe_profile);
    let states_dir = get_data_dir().join("states").join(&safe_profile);

    let all_bios_folders = {
        let state = STATE.lock().unwrap();
        let mut folders = state.settings.bios_folders.clone();
        if folders.is_empty() {
            if let Some(ref b) = state.settings.bios_folder {
                folders.push(b.clone());
            }
        }
        folders
    };

    let default_system_dir = get_binaries_dir().join("RetroArch").join("system");
    let system_dir = if all_bios_folders.len() == 1 {
        let p = PathBuf::from(&all_bios_folders[0]);
        if p.exists() { p } else { default_system_dir }
    } else if all_bios_folders.len() > 1 {
        let _ = fs::create_dir_all(&default_system_dir);
        for b_folder in &all_bios_folders {
            let src_path = PathBuf::from(b_folder);
            if src_path.exists() && src_path.is_dir() {
                if let Ok(entries) = fs::read_dir(&src_path) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.is_file() {
                            if let Some(fname) = path.file_name() {
                                let dest = default_system_dir.join(fname);
                                if !dest.exists() {
                                    let _ = fs::copy(&path, &dest);
                                }
                            }
                        } else if path.is_dir() {
                            if let Some(dname) = path.file_name() {
                                let dest_sub = default_system_dir.join(dname);
                                let _ = fs::create_dir_all(&dest_sub);
                                if let Ok(sub_entries) = fs::read_dir(&path) {
                                    for sub in sub_entries.flatten() {
                                        let sub_path = sub.path();
                                        if sub_path.is_file() {
                                            if let Some(sub_fname) = sub_path.file_name() {
                                                let sub_dest = dest_sub.join(sub_fname);
                                                if !sub_dest.exists() {
                                                    let _ = fs::copy(&sub_path, &sub_dest);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        default_system_dir
    } else {
        default_system_dir
    };

    fs::create_dir_all(&saves_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&states_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&system_dir).map_err(|e| e.to_string())?;
    
    // Auto-organizar subcarpeta pcsx2/bios si el usuario colocó bios en la raíz de su carpeta de BIOS
    let pcsx2_bios_dir = system_dir.join("pcsx2").join("bios");
    let _ = fs::create_dir_all(&pcsx2_bios_dir);
    if let Ok(entries) = fs::read_dir(&system_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                let name_lower = name.to_lowercase();
                if name_lower.ends_with(".bin") || name_lower.ends_with(".rom") || name_lower.ends_with(".mec") || name_lower.ends_with(".nvm") {
                    let dest = pcsx2_bios_dir.join(name);
                    if !dest.exists() {
                        let _ = fs::copy(&path, &dest);
                    }
                }
            }
        }
    }

    let saves_str = saves_dir.to_string_lossy().replace('\\', "/");
    let states_str = states_dir.to_string_lossy().replace('\\', "/");
    let system_str = system_dir.to_string_lossy().replace('\\', "/");

    let ra_dir = ra_exe.parent().unwrap_or(Path::new("."));
    let core_opts_path = ra_dir.join("retroarch-core-options.cfg");
    let core_opts_str_path = core_opts_path.to_string_lossy().replace('\\', "/");
    let config_dir = ra_dir.join("config");
    let config_dir_str = config_dir.to_string_lossy().replace('\\', "/");
    let assets_dir = ra_dir.join("assets");
    let assets_str = assets_dir.to_string_lossy().replace('\\', "/");

    let (audio_driver_str, audio_device_str, audio_latency_val, audio_vol_db, video_smooth, video_scale_integer, aspect_ratio_str, all_core_options) = {
        let state = STATE.lock().unwrap();
        let s = &state.settings.graphics;
        let smooth = if s.video_smooth { "true" } else { "false" };
        let integer = if s.video_scale_integer { "true" } else { "false" };
        let aspect = match s.aspect_ratio.as_str() {
            "4:3" => "aspect_ratio_index = \"0\"\n",
            "16:9" => "aspect_ratio_index = \"1\"\n",
            "16:10" => "aspect_ratio_index = \"2\"\n",
            _ => "aspect_ratio_index = \"21\"\n",
        };
        let audio_drv = match s.audio_driver.as_str() {
            "wasapi" => "wasapi",
            "dsound" | "directsound" => "dsound",
            _ => "xaudio",
        };
        let dev = if s.audio_device.trim().is_empty() || s.audio_device == "default" {
            String::new()
        } else {
            s.audio_device.clone()
        };
        let latency = if s.audio_latency > 0 { s.audio_latency } else { 64 };
        let vol_pct = if s.audio_volume > 0 { s.audio_volume } else { 100 };
        let vol_db = volume_to_db(vol_pct);

        let mut opts = HashMap::new();
        // Force critical hardware acceleration & JIT defaults
        opts.insert("citra_use_hw_renderer".into(), "enabled".into());
        opts.insert("citra_use_cpu_jit".into(), "enabled".into());
        opts.insert("citra_use_shader_jit".into(), "enabled".into());
        // Soporte táctil y cursor para Nintendo 3DS y DS
        opts.insert("citra_touch_mode".into(), "Touch".into());
        opts.insert("melonds_touch_mode".into(), "Touch".into());
        opts.insert("melonds_cursor".into(), "enabled".into());
        opts.insert("melondsds_touch_mode".into(), "Touch".into());
        opts.insert("desmume_pointer_type".into(), "mouse".into());
        opts.insert("desmume_pointer_colour".into(), "white".into());
        opts.insert("desmume_pointer_device_l".into(), "emulated".into());
        opts.insert("desmume_pointer_device_r".into(), "emulated".into());

        for (k, v) in &s.core_options {
            opts.insert(k.clone(), v.clone());
            if k.starts_with("pcsx2_") {
                let lrps2_key = k.replace("pcsx2_", "lrps2_");
                opts.insert(lrps2_key, v.clone());
            }
        }
        (audio_drv, dev, latency, vol_db, smooth, integer, aspect, opts)
    };

    let retro_lang = detect_system_retroarch_language();

    let mut full_cfg = format!(
        "menu_driver = \"ozone\"\n\
         user_language = \"{}\"\n\
         assets_directory = \"{}\"\n\
         input_menu_toggle = \"escape\"\n\
         input_menu_toggle_gamepad_combo = \"2\"\n\
         input_quit_gamepad_combo = \"0\"\n\
         input_enable_hotkey = \"\"\n\
         input_exit_emulator = \"nul\"\n\
         quit_on_close_content = \"2\"\n\
         quit_press_twice = \"false\"\n\
         menu_show_quit_retroarch = \"true\"\n\
         quick_menu_show_resume_content = \"true\"\n\
         quick_menu_show_restart_content = \"true\"\n\
         quick_menu_show_close_content = \"true\"\n\
         quick_menu_show_save_load_state = \"true\"\n\
         quick_menu_show_controls = \"true\"\n\
         quick_menu_show_core_options = \"true\"\n\
         quick_menu_show_shaders = \"true\"\n\
         quick_menu_show_take_screenshot = \"true\"\n\
         network_cmd_enable = \"true\"\n\
         network_cmd_port = \"55355\"\n\
         pause_nonactive = \"false\"\n\
         input_auto_mouse_grab = \"false\"\n\
         cursor_hide_fullscreen = \"true\"\n\
         cursor_hide_delay = \"2000000\"\n\
         video_fullscreen = \"true\"\n\
         video_windowed_fullscreen = \"true\"\n\
         video_borderless = \"true\"\n\
         video_fullscreen_x = \"0\"\n\
         video_fullscreen_y = \"0\"\n\
         video_vsync = \"true\"\n\
         video_driver = \"glcore\"\n\
         audio_enable = \"true\"\n\
         audio_driver = \"{}\"\n\
         audio_wasapi_exclusive_mode = \"false\"\n\
         audio_wasapi_float_format = \"false\"\n\
         audio_device = \"{}\"\n\
         audio_out_rate = \"48000\"\n\
         audio_latency = \"{}\"\n\
         audio_sync = \"true\"\n\
         audio_rate_control = \"true\"\n\
         audio_volume = \"{:.2}\"\n\
         audio_mixer_volume = \"0.0\"\n\
         audio_mute_enable = \"false\"\n\
         audio_mixer_mute_enable = \"false\"\n\
         savestate_auto_load = \"true\"\n\
         savestate_auto_save = \"true\"\n\
         savefiles_in_content_dir = \"false\"\n\
         savestates_in_content_dir = \"false\"\n\
         sort_savefiles_enable = \"true\"\n\
         sort_savestates_enable = \"true\"\n\
         config_save_on_exit = \"false\"\n\
         global_core_options = \"true\"\n\
         core_options_path = \"{}\"\n\
         rgui_config_directory = \"{}\"\n\
         auto_overrides_enable = \"true\"\n\
         core_option_category_enable = \"false\"\n\
         system_directory = \"{}\"\n\
         savefile_directory = \"{}\"\n\
         savestate_directory = \"{}\"\n",
        retro_lang, assets_str, audio_driver_str, audio_device_str, audio_latency_val, audio_vol_db, core_opts_str_path, config_dir_str, system_str, saves_str, states_str
    );

    full_cfg.push_str(&format!(
        "video_smooth = \"{}\"\n\
         video_scale_integer = \"{}\"\n\
         {}",
        video_smooth, video_scale_integer, aspect_ratio_str
    ));

    let cheevos_cfg = {
        let state = STATE.lock().unwrap();
        if let Some(profile) = state.settings.profiles.iter().find(|p| p.name == profile_name) {
            if let (Some(username), Some(token)) = (&profile.ra_username, &profile.ra_token) {
                let hardcore = if profile.cheevos_hardcore { "true" } else { "false" };
                Some(format!(
                    "cheevos_enable = \"true\"\n\
                     cheevos_username = \"{}\"\n\
                     cheevos_token = \"{}\"\n\
                     cheevos_hardcore_mode_enable = \"{}\"\n\
                     cheevos_badges_enable = \"true\"\n\
                     cheevos_verbose_enable = \"true\"\n\
                     cheevos_richpresence_enable = \"true\"\n\
                     cheevos_visibility_unlock = \"true\"\n\
                     cheevos_visibility_summary = \"1\"\n\
                     cheevos_unlock_sound_enable = \"true\"\n",
                    username, token, hardcore
                ))
            } else {
                None
            }
        } else {
            None
        }
    };
    
    if let Some(cheevos) = cheevos_cfg {
        full_cfg.push_str(&cheevos);
    }

    let cfg_path = ra_dir.join("retroarch.cfg");
    let _ = fs::write(&cfg_path, &full_cfg);

    let mut core_opts_lines = Vec::new();
    for (k, v) in &all_core_options {
        core_opts_lines.push(format!("{} = \"{}\"", k, v));
    }
    let core_opts_content = core_opts_lines.join("\n");

    // Write global retroarch-core-options.cfg in root and config folder
    let _ = fs::write(&core_opts_path, &core_opts_content);
    let _ = fs::create_dir_all(&config_dir);
    let _ = fs::write(config_dir.join("retroarch-core-options.cfg"), &core_opts_content);

    // Write per-core options files so RetroArch will load them regardless of core options mode
    let core_folders = [
        ("Citra", "Citra", true),
        ("Citra", "citra", true),
        ("Citra Canario", "Citra Canario", true),
        ("Citra Canary/Experimental", "Citra Canary/Experimental", true),
        ("Citra", "citra_libretro", true),
        ("citra_libretro", "citra_libretro", true),
        ("PCSX2", "PCSX2", false),
        ("LRPS2", "LRPS2", false),
        ("Dolphin", "Dolphin", false),
        ("PPSSPP", "PPSSPP", false),
        ("PCSX-ReARMed", "PCSX-ReARMed", false),
        ("Mupen64Plus-Next", "Mupen64Plus-Next", false),
        ("melonDS", "melonDS", true),
        ("melonDS", "melonds", true),
        ("melonDS", "melonds_libretro", true),
        ("melonds_libretro", "melonds_libretro", true),
        ("melonDS DS", "melonDS DS", true),
        ("DeSmuME", "DeSmuME", true),
        ("DeSmuME", "desmume", true),
        ("DeSmuME", "desmume_libretro", true),
        ("desmume_libretro", "desmume_libretro", true),
        ("FinalBurn Neo", "FinalBurn Neo", false),
        ("FBNeo", "FBNeo", false),
        ("FBNeo", "fbneo", false),
    ];

    let touch_core_override = "cursor_hide_fullscreen = \"false\"\ncursor_hide_delay = \"0\"\ninput_auto_mouse_grab = \"false\"\n";

    for (dir_name, file_name, is_touch) in core_folders {
        let dir = config_dir.join(dir_name);
        let _ = fs::create_dir_all(&dir);
        let _ = fs::write(dir.join(format!("{}.opt", file_name)), &core_opts_content);
        if is_touch {
            let _ = fs::write(dir.join(format!("{}.cfg", file_name)), touch_core_override);
        }
    }

    Ok((ra_exe, cfg_path))
}
