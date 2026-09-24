use std::fs::File;
use std::io::Read;
use std::path::Path;

pub struct PlatformInfo {
    pub platform: &'static str,
    pub core_name: &'static str,
}

pub fn detect_iso_platform(p: &Path) -> PlatformInfo {
    // 1. Intentar inspección profunda del archivo si existe en disco
    if let Ok(mut file) = File::open(p) {
        // Leemos hasta 1MB del archivo para analizar firmas internas
        let mut buffer = vec![0u8; 1024 * 1024];
        if let Ok(bytes_read) = file.read(&mut buffer) {
            let slice = &buffer[..bytes_read];

            // 1.0 Firmas de PS3 (PS3_DISC.SFB, PLAYSTATION 3, o PS3_GAME)
            if slice.windows(12).any(|w| w == b"PS3_DISC.SFB")
                || slice.windows(13).any(|w| w == b"PLAYSTATION 3")
                || slice.windows(8).any(|w| w == b"PS3_GAME")
            {
                return PlatformInfo {
                    platform: "PS3",
                    core_name: "rpcs3",
                };
            }

            // 1.1 GameCube Magic: en offset 0x1C (28) el magic es 0xC2339F3D
            if slice.len() >= 32 && slice[0x1c..0x20] == [0xc2, 0x33, 0x9f, 0x3d] {
                return PlatformInfo {
                    platform: "GAMECUBE",
                    core_name: "dolphin",
                };
            }

            // 1.2 Firmas de PSP (UMD_DATA.BIN, PSP_GAME o etiqueta PSP GAME)
            if slice
                .windows(8)
                .any(|w| w == b"PSP_GAME" || w == b"PSP GAME")
                || slice.windows(12).any(|w| w == b"UMD_DATA.BIN")
            {
                return PlatformInfo {
                    platform: "PSP",
                    core_name: "ppsspp",
                };
            }

            // 1.3 Firmas de PS2 (SYSTEM.CNF con BOOT2, PLAYSTATION 2, o cdrom0:)
            if slice.windows(5).any(|w| w == b"BOOT2")
                || slice.windows(13).any(|w| w == b"PLAYSTATION 2")
                || slice.windows(8).any(|w| w == b"cdrom0:\\")
            {
                return PlatformInfo {
                    platform: "PS2",
                    core_name: "pcsx2",
                };
            }

            // 1.4 Firmas de PS1 (SYSTEM.CNF con BOOT = cdrom:, o BOOT=cdrom:)
            if slice.windows(6).any(|w| w == b"BOOT =") || slice.windows(5).any(|w| w == b"BOOT=") {
                return PlatformInfo {
                    platform: "PS1",
                    core_name: "pcsx_rearmed",
                };
            }
        }
    }

    // 2. Heurísticas por ruta y nombre de archivo (fallback si no se puede abrir el archivo o firmas ausentes)
    let path_lower = p.to_string_lossy().to_lowercase();
    let name_lower = p
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    // 2.0 PS3
    let is_ps3 = path_lower.contains("ps3")
        || path_lower.contains("playstation 3")
        || path_lower.contains("playstation3")
        || path_lower.contains(r"\ps3\")
        || path_lower.contains("/ps3/")
        || name_lower.contains("ps3")
        || name_lower.contains("[ps3]")
        || name_lower.contains("(ps3)")
        || name_lower.starts_with("blus")
        || name_lower.starts_with("bles")
        || name_lower.starts_with("bjes")
        || name_lower.starts_with("bljm")
        || name_lower.starts_with("bljs")
        || name_lower.starts_with("bces")
        || name_lower.starts_with("bcus");
    if is_ps3 {
        return PlatformInfo {
            platform: "PS3",
            core_name: "rpcs3",
        };
    }

    // 2.1 GameCube
    if path_lower.contains("gamecube")
        || path_lower.contains("game cube")
        || path_lower.contains("ngc")
        || path_lower.contains(r"\gc\")
        || path_lower.contains("/gc/")
        || path_lower.ends_with(r"\gc")
        || path_lower.ends_with("/gc")
        || name_lower.contains("gamecube")
        || name_lower.contains("ngc")
    {
        return PlatformInfo {
            platform: "GAMECUBE",
            core_name: "dolphin",
        };
    }

    // 2.2 PSP
    let is_psp = path_lower.contains("psp")
        || name_lower.contains("psp")
        || name_lower.contains("ppsspp")
        || name_lower.starts_with("ulus")
        || name_lower.starts_with("ules")
        || name_lower.starts_with("uljm")
        || name_lower.starts_with("ulks")
        || name_lower.starts_with("uljs")
        || name_lower.starts_with("ulex")
        || name_lower.contains("-ulus")
        || name_lower.contains("-ules")
        || name_lower.contains("-uljm")
        || name_lower.contains("-ulks")
        || name_lower.contains("-uljs")
        || name_lower.contains("-ulex");
    if is_psp {
        return PlatformInfo {
            platform: "PSP",
            core_name: "ppsspp",
        };
    }

    // 2.3 PS2
    let is_ps2 = path_lower.contains("ps2")
        || path_lower.contains("playstation 2")
        || path_lower.contains("playstation2")
        || path_lower.contains("psx2")
        || path_lower.contains(r"\ps2\")
        || path_lower.contains("/ps2/")
        || name_lower.contains("ps2")
        || name_lower.contains("[ps2]")
        || name_lower.contains("(ps2)")
        || name_lower.starts_with("slus-2")
        || name_lower.starts_with("slus_2")
        || name_lower.starts_with("sles-5")
        || name_lower.starts_with("sles_5")
        || name_lower.starts_with("slpm-6")
        || name_lower.starts_with("slpm_6")
        || name_lower.starts_with("sces-5")
        || name_lower.starts_with("sces_5")
        || name_lower.starts_with("scus-97")
        || name_lower.starts_with("scus_97")
        || name_lower.starts_with("slps-2")
        || name_lower.starts_with("slps_2");
    if is_ps2 {
        return PlatformInfo {
            platform: "PS2",
            core_name: "pcsx2",
        };
    }

    // 2.4 PS1
    let is_ps1 = path_lower.contains("ps1")
        || path_lower.contains("playstation 1")
        || path_lower.contains("psx")
        || path_lower.contains(r"\ps1\")
        || path_lower.contains("/ps1/")
        || path_lower.contains(r"\psx\")
        || path_lower.contains("/psx/")
        || name_lower.contains("ps1")
        || name_lower.contains("[ps1]")
        || name_lower.contains("(ps1)")
        || name_lower.starts_with("slus-0")
        || name_lower.starts_with("slus_0")
        || name_lower.starts_with("sles-0")
        || name_lower.starts_with("sles_0")
        || name_lower.starts_with("sces-0")
        || name_lower.starts_with("sces_0")
        || name_lower.starts_with("scus-94")
        || name_lower.starts_with("scus_94");
    if is_ps1 {
        return PlatformInfo {
            platform: "PS1",
            core_name: "pcsx_rearmed",
        };
    }

    // Default para ISO no clasificada
    PlatformInfo {
        platform: "PS1",
        core_name: "pcsx_rearmed",
    }
}

pub fn detect_platform(rom_path: &str) -> Option<PlatformInfo> {
    let p = Path::new(rom_path);
    let ext = p.extension()?.to_str()?.to_lowercase();
    let path_lower = p.to_string_lossy().to_lowercase();

    // Si el archivo está dentro de la estructura interna de un juego de PS3 (PS3_GAME, PS3_EXTRA, PS3_UPDATE),
    // el ÚNICO archivo ejecutable que debe detectarse como juego es EBOOT.BIN
    if path_lower.contains("ps3_game")
        || path_lower.contains("ps3_extra")
        || path_lower.contains("ps3_update")
    {
        let file_name = p.file_name().and_then(|s| s.to_str()).unwrap_or("");
        if file_name.eq_ignore_ascii_case("eboot.bin") {
            return Some(PlatformInfo {
                platform: "PS3",
                core_name: "rpcs3",
            });
        }
        return None;
    }

    // .bin: solo es entrada de juego si es EBOOT.BIN de PS3 (los demás usan .cue para evitar duplicados cue+bin)
    if ext == "bin" {
        let file_name = p.file_name().and_then(|s| s.to_str()).unwrap_or("");
        if file_name.eq_ignore_ascii_case("eboot.bin") {
            return Some(PlatformInfo {
                platform: "PS3",
                core_name: "rpcs3",
            });
        }
        return None;
    }

    // .cso: PSP o PS2
    if ext == "cso" {
        let path_lower = p.to_string_lossy().to_lowercase();
        if path_lower.contains("ps2")
            || path_lower.contains("playstation 2")
            || path_lower.contains(r"\ps2\")
            || path_lower.contains("/ps2/")
        {
            return Some(PlatformInfo {
                platform: "PS2",
                core_name: "pcsx2",
            });
        }
        return Some(PlatformInfo {
            platform: "PSP",
            core_name: "ppsspp",
        });
    }

    // GameCube native disc formats
    if ext == "gcm" || ext == "rvz" || ext == "ciso" || ext == "gcz" {
        return Some(PlatformInfo {
            platform: "GAMECUBE",
            core_name: "dolphin",
        });
    }

    // .iso: GameCube, PSP, PS2, PS1 — detección profunda e inteligente
    if ext == "iso" {
        return Some(detect_iso_platform(p));
    }

    let info = match ext.as_str() {
        // Nintendo
        "sfc" | "smc" => PlatformInfo {
            platform: "SNES",
            core_name: "snes9x",
        },
        "nes" | "fc" | "unf" => PlatformInfo {
            platform: "NES",
            core_name: "nestopia",
        },
        "n64" | "z64" | "v64" | "n64dd" => PlatformInfo {
            platform: "N64",
            core_name: "mupen64plus_next",
        },
        "gba" | "agb" => PlatformInfo {
            platform: "GBA",
            core_name: "mgba",
        },
        "gbc" => PlatformInfo {
            platform: "GBC",
            core_name: "gambatte",
        },
        "gb" | "dmg" => PlatformInfo {
            platform: "GB",
            core_name: "gambatte",
        },
        "nds" | "ndsi" | "dsi" => PlatformInfo {
            platform: "NDS",
            core_name: "melonds",
        },
        "3ds" | "3dscx" | "cia" | "cxi" | "app" | "cci" => PlatformInfo {
            platform: "3DS",
            core_name: "azahar",
        },
        "vb" => PlatformInfo {
            platform: "VB",
            core_name: "mednafen_vb",
        },

        // Sega
        "md" | "gen" | "smd" | "sg" => PlatformInfo {
            platform: "MEGA_DRIVE",
            core_name: "genesis_plus_gx",
        },
        "sms" => PlatformInfo {
            platform: "SMS",
            core_name: "smsplus",
        },
        "gg" | "sgg" => PlatformInfo {
            platform: "GAME_GEAR",
            core_name: "gearsystem",
        },
        "pce" | "pcecd" => PlatformInfo {
            platform: "PCE",
            core_name: "mednafen_pce_fast",
        },
        "32x" => PlatformInfo {
            platform: "32X",
            core_name: "picodrive",
        },

        // Sony
        "chd" => {
            let path_lower = p.to_string_lossy().to_lowercase();
            if path_lower.contains("ps2")
                || path_lower.contains("playstation 2")
                || path_lower.contains(r"\ps2\")
                || path_lower.contains("/ps2/")
            {
                PlatformInfo {
                    platform: "PS2",
                    core_name: "pcsx2",
                }
            } else if path_lower.contains("mame") || path_lower.contains("arcade") {
                PlatformInfo {
                    platform: "MAME",
                    core_name: "fbneo",
                }
            } else {
                PlatformInfo {
                    platform: "PS1",
                    core_name: "pcsx_rearmed",
                }
            }
        }
        "cue" | "pbp" | "ecm" | "mds" | "toc" | "m3u" => {
            let path_lower = p.to_string_lossy().to_lowercase();
            if (path_lower.contains("psp") || path_lower.contains("/psp/")) && ext == "pbp" {
                PlatformInfo {
                    platform: "PSP",
                    core_name: "ppsspp",
                }
            } else if path_lower.contains("ps2") || path_lower.contains("playstation 2") {
                PlatformInfo {
                    platform: "PS2",
                    core_name: "pcsx2",
                }
            } else {
                PlatformInfo {
                    platform: "PS1",
                    core_name: "pcsx_rearmed",
                }
            }
        }
        "psf" | "minipsf" => PlatformInfo {
            platform: "PS1",
            core_name: "pcsx_rearmed",
        },

        // Otros
        "ngp" => PlatformInfo {
            platform: "NGP",
            core_name: "mednafen_ngp",
        },
        "ngc" => {
            let path_lower = p.to_string_lossy().to_lowercase();
            if path_lower.contains("gamecube") || path_lower.contains("game cube") {
                PlatformInfo {
                    platform: "GAMECUBE",
                    core_name: "dolphin",
                }
            } else {
                PlatformInfo {
                    platform: "NGP",
                    core_name: "mednafen_ngp",
                }
            }
        }
        "lynx" => PlatformInfo {
            platform: "LYNX",
            core_name: "mednafen_lynx",
        },
        "ws" | "wsc" => PlatformInfo {
            platform: "WSWAN",
            core_name: "mednafen_wswan",
        },
        "col" => PlatformInfo {
            platform: "COLECOVISION",
            core_name: "gearcoleco",
        },
        "neo" => PlatformInfo {
            platform: "NEOGEO",
            core_name: "fbneo",
        },
        "zip" | "7z" => {
            let path_lower = p.to_string_lossy().to_lowercase();
            let stem = p.file_stem()?.to_str()?.to_lowercase();
            if path_lower.contains("mame") || path_lower.contains("arcade") {
                PlatformInfo {
                    platform: "MAME",
                    core_name: "fbneo",
                }
            } else if path_lower.contains("neogeo")
                || path_lower.contains("neo-geo")
                || path_lower.contains("neo geo")
                || path_lower.contains("fbneo")
                || path_lower.contains("fba")
                || path_lower.contains("mvs")
                || neogeo_display_name(&stem).is_some()
            {
                PlatformInfo {
                    platform: "NEOGEO",
                    core_name: "fbneo",
                }
            } else {
                return None;
            }
        }
        "exe" | "lnk" => {
            let name_lower = p
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_lowercase();
            if crate::scanner::pc::is_blacklisted_exe(&name_lower) {
                return None;
            }
            if crate::scanner::pc::is_pc_path(p) {
                PlatformInfo {
                    platform: "PC",
                    core_name: "pc",
                }
            } else {
                return None;
            }
        }
        _ => return None,
    };
    Some(info)
}

/// Inverso de detect_platform: extensiones válidas por plataforma
pub fn platform_extensions(platform: &str) -> &'static [&'static str] {
    match platform {
        "SNES" => &["sfc", "smc"],
        "NES" => &["nes", "fc", "unf"],
        "N64" => &["n64", "z64", "v64", "n64dd"],
        "GBA" => &["gba", "agb"],
        "GBC" => &["gbc"],
        "GB" => &["gb", "dmg"],
        "NDS" => &["nds", "ndsi", "dsi"],
        "3DS" => &["3ds", "3dscx", "cia", "cxi", "app", "cci"],
        "VB" => &["vb"],
        "MEGA_DRIVE" => &["md", "gen", "smd", "sg"],
        "SMS" => &["sms"],
        "GAME_GEAR" => &["gg", "sgg"],
        "PCE" => &["pce", "pcecd"],
        "32X" => &["32x"],
        "GAMECUBE" => &["iso", "gcm", "rvz", "ciso", "gcz"],
        "PS1" => &[
            "cue", "chd", "pbp", "ecm", "mds", "toc", "psf", "minipsf", "iso", "m3u",
        ],
        "PS2" => &["iso", "chd", "cso", "gz", "bin", "cue", "m3u"],
        "PS3" => &["iso", "bin"],
        "PSP" => &["iso", "cso", "pbp"],
        "MAME" => &["zip", "7z", "chd"],
        "NEOGEO" => &["zip", "7z", "neo"],
        "NGP" => &["ngp", "ngc"],
        "LYNX" => &["lynx"],
        "WSWAN" => &["ws", "wsc"],
        "COLECOVISION" => &["col"],
        "PC" => &["exe", "lnk"],
        _ => &[],
    }
}

pub fn core_dll_name(core_name: &str) -> String {
    format!("{}.dll", core_name)
}

pub fn core_zip_url(core_name: &str) -> String {
    let lower = core_name.to_lowercase();
    let sanitized_core = match lower.as_str() {
        "melonds" => "melonds",
        "melonds ds" | "melondsds" => "melondsds",
        "swanstation" => "swanstation",
        _ => core_name,
    };
    format!(
        "https://buildbot.libretro.com/nightly/windows/x86_64/latest/{}_libretro.dll.zip",
        sanitized_core
    )
}

/// Lista de directorios de libretro-thumbnails para una plataforma (con fallbacks e.g. FBNeo/MAME/NeoGeo)
pub fn thumbnail_dirs(platform: &str) -> &'static [&'static str] {
    match platform {
        "SNES" => &["Nintendo - Super Nintendo Entertainment System"],
        "NES" => &["Nintendo - Nintendo Entertainment System"],
        "N64" => &["Nintendo - Nintendo 64"],
        "GBA" => &["Nintendo - Game Boy Advance"],
        "GBC" => &["Nintendo - Game Boy Color"],
        "GB" => &["Nintendo - Game Boy"],
        "NDS" => &["Nintendo - Nintendo DS"],
        "3DS" => &["Nintendo - Nintendo 3DS"],
        "VB" => &["Nintendo - Virtual Boy"],
        "GAMECUBE" => &["Nintendo - GameCube"],
        "MEGA_DRIVE" => &["Sega - Mega Drive - Genesis"],
        "SMS" => &["Sega - Master System - Mark III"],
        "GAME_GEAR" => &["Sega - Game Gear"],
        "32X" => &["Sega - 32X"],
        "PCE" => &["NEC - PC Engine - TurboGrafx 16"],
        "PS1" => &["Sony - PlayStation"],
        "PS2" => &["Sony - PlayStation 2"],
        "PS3" => &["Sony - PlayStation 3"],
        "PSP" => &["Sony - PlayStation Portable"],
        "MAME" => &["FBNeo - Arcade Games", "SNK - Neo Geo", "MAME"],
        "NEOGEO" => &["SNK - Neo Geo", "FBNeo - Arcade Games", "MAME"],
        "ARCADE" | "FBNEO" => &["FBNeo - Arcade Games", "SNK - Neo Geo", "MAME"],
        "NGP" => &["SNK - Neo Geo Pocket"],
        "LYNX" => &["Atari - Lynx"],
        "WSWAN" => &["Bandai - WonderSwan"],
        "COLECOVISION" => &["Coleco - ColecoVision"],
        _ => &[],
    }
}

pub fn is_standalone_emulator(core_name: &str) -> bool {
    matches!(core_name, "rpcs3" | "azahar" | "pc" | "native" | "windows")
}

pub fn parse_param_sfo(sfo_path: &Path) -> Option<(String, String)> {
    let mut file = File::open(sfo_path).ok()?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer).ok()?;

    if buffer.len() < 20 || &buffer[0..4] != b"\x00PSF" {
        return None;
    }

    let key_table_start = u32::from_le_bytes(buffer[8..12].try_into().ok()?) as usize;
    let data_table_start = u32::from_le_bytes(buffer[12..16].try_into().ok()?) as usize;
    let num_entries = u32::from_le_bytes(buffer[16..20].try_into().ok()?) as usize;

    let mut title = None;
    let mut title_id = None;

    for i in 0..num_entries {
        let entry_offset = 20 + (i * 16);
        if entry_offset + 16 > buffer.len() {
            break;
        }

        let key_offset =
            u16::from_le_bytes(buffer[entry_offset..entry_offset + 2].try_into().ok()?) as usize;
        let data_len =
            u32::from_le_bytes(buffer[entry_offset + 4..entry_offset + 8].try_into().ok()?)
                as usize;
        let data_offset = u32::from_le_bytes(
            buffer[entry_offset + 12..entry_offset + 16]
                .try_into()
                .ok()?,
        ) as usize;

        let key_start = key_table_start + key_offset;
        if key_start >= buffer.len() {
            continue;
        }

        let mut key_end = key_start;
        while key_end < buffer.len() && buffer[key_end] != 0 {
            key_end += 1;
        }

        let key = std::str::from_utf8(&buffer[key_start..key_end]).unwrap_or("");

        let val_start = data_table_start + data_offset;
        let val_end = val_start + data_len;
        if val_end <= buffer.len() {
            let val_bytes = &buffer[val_start..val_end];
            let val_str = String::from_utf8_lossy(val_bytes)
                .trim_matches('\0')
                .trim()
                .to_string();

            if key == "TITLE" && title.is_none() {
                let clean_title = val_str
                    .replace(['\r', '\n'], " ")
                    .replace(['™', '®', '©'], "")
                    .split_whitespace()
                    .collect::<Vec<_>>()
                    .join(" ");
                if !clean_title.is_empty() {
                    title = Some(clean_title);
                }
            } else if key == "TITLE_ID" && title_id.is_none() {
                title_id = Some(val_str);
            }
        }
    }

    match (title, title_id) {
        (Some(t), Some(id)) => Some((t, id)),
        (Some(t), None) => Some((t, String::new())),
        (None, Some(id)) => Some((id.clone(), id)),
        (None, None) => None,
    }
}

pub fn resolve_ps3_game_info(path: &Path) -> (String, Option<String>) {
    let file_name = path.file_name().and_then(|s| s.to_str()).unwrap_or("");

    // Si es un EBOOT.BIN dentro de PS3_GAME/USRDIR/
    if file_name.eq_ignore_ascii_case("eboot.bin") {
        let usrdir = path.parent();
        let ps3_game = usrdir.and_then(|u| u.parent());
        let game_folder = ps3_game.and_then(|p| p.parent());

        let icon_path = ps3_game
            .map(|p| p.join("ICON0.PNG"))
            .filter(|p| p.exists())
            .map(|p| p.to_string_lossy().to_string());

        let sfo_info = ps3_game
            .map(|p| p.join("PARAM.SFO"))
            .filter(|p| p.exists())
            .and_then(|sfo| parse_param_sfo(&sfo));

        let folder_name = game_folder
            .and_then(|g| g.file_name())
            .and_then(|s| s.to_str())
            .map(|s| s.to_string());

        let title = folder_name
            .filter(|name| !name.is_empty() && name != "PS3_GAME")
            .or_else(|| sfo_info.map(|(t, _)| t))
            .unwrap_or_else(|| "PlayStation 3 Game".into());

        return (title, icon_path);
    }

    // Si es un ISO
    let stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("PlayStation 3 Game");
    (stem.to_string(), None)
}

/// Mapa platform -> libretro-thumbnails primary directory name
pub fn thumbnail_dir(platform: &str) -> Option<&'static str> {
    thumbnail_dirs(platform).first().copied()
}

pub fn is_arcade_platform(platform: &str) -> bool {
    matches!(platform, "MAME" | "NEOGEO" | "ARCADE" | "FBNEO")
}

/// Lookup para ROMs comunes de Neo Geo y Arcade en formato ZIP corto -> Título oficial
pub fn neogeo_display_name(stem: &str) -> Option<&'static str> {
    arcade_display_name(stem)
}

pub fn arcade_display_name(stem: &str) -> Option<&'static str> {
    let clean = stem.to_lowercase();
    match clean.as_str() {
        "2020bb" => Some("2020 Super Baseball"),
        "3countb" => Some("3 Count Bout"),
        "alpham2" => Some("Alpha Mission II"),
        "androdun" => Some("Andro Dunos"),
        "aof" => Some("Art of Fighting"),
        "aof2" => Some("Art of Fighting 2"),
        "aof3" => Some("Art of Fighting 3 - The Path of the Warrior"),
        "bakatono" => Some("Bakatonosama Mahjong Manyuki"),
        "bangbead" => Some("Bang Bead"),
        "bjourney" => Some("Blue's Journey"),
        "blazstar" => Some("Blazing Star"),
        "breakers" => Some("Breakers"),
        "breakrev" => Some("Breakers Revenge"),
        "bstars" => Some("Baseball Stars Professional"),
        "bstars2" => Some("Baseball Stars 2"),
        "burningf" => Some("Burning Fight"),
        "crsword" => Some("Crossed Swords"),
        "crswdlv" => Some("Crossed Swords II"),
        "cthd2003" => Some("Crouching Tiger Hidden Dragon 2003"),
        "ctom2j" => Some("Captain Tomaday"),
        "cyberlip" => Some("Cyber-Lip"),
        "diggerma" => Some("Digger Man"),
        "doubledr" => Some("Double Dragon"),
        "dragonsh" => Some("Dragon's Heaven"),
        "eightman" => Some("Eight Man"),
        "fatfursp" => Some("Fatal Fury Special"),
        "fatfury1" => Some("Fatal Fury - King of Fighters"),
        "fatfury2" => Some("Fatal Fury 2"),
        "fatfury3" => Some("Fatal Fury 3 - Road to the Final Victory"),
        "fbfrenzy" => Some("Football Frenzy"),
        "fightfev" => Some("Fight Fever"),
        "flipshot" => Some("Battle Flip Shot"),
        "galaxyfg" => Some("Galaxy Fight - Universal Warriors"),
        "ganryu" => Some("Ganryu / Musashi Ganryuki"),
        "garou" | "garouo" | "garouh" => Some("Garou - Mark of the Wolves"),
        "ghostlop" => Some("Ghostlop"),
        "goalx3" | "gorkman" => Some("Goal! Goal! Goal!"),
        "gowcaizr" => Some("Voltage Fighter Gowcaizer"),
        "gpilots" => Some("Ghost Pilots"),
        "gururin" => Some("Gururin"),
        "ironclad" => Some("Ironclad / Choutetsu Brikin'ger"),
        "jockeygp" => Some("Jockey Grand Prix"),
        "joyjoy" => Some("Puzzled / Joy Joy Kid"),
        "kabukikl" => Some("Kabuki Klash - Far East of Eden"),
        "karnovr" => Some("Karnov's Revenge"),
        "kizuna" => Some("Kizuna Encounter - Super Tag Battle"),
        "kof94" => Some("The King of Fighters '94"),
        "kof95" => Some("The King of Fighters '95"),
        "kof96" => Some("The King of Fighters '96"),
        "kof97" | "kof97pls" => Some("The King of Fighters '97"),
        "kof98" | "kof98k" | "kof98n" => Some("The King of Fighters '98 - The Slugfest"),
        "kof99" | "kof99p" => Some("The King of Fighters '99 - Millennium Battle"),
        "kof2000" | "kof2000n" => Some("The King of Fighters 2000"),
        "kof2001" => Some("The King of Fighters 2001"),
        "kof2002" | "kof2002pls" => Some("The King of Fighters 2002"),
        "kof2003" => Some("The King of Fighters 2003"),
        "kotm" => Some("King of the Monsters"),
        "kotm2" => Some("King of the Monsters 2 - The Next Dimension"),
        "lans2004" => Some("Lansquenet 2004"),
        "lastblad" => Some("The Last Blade"),
        "lastbld2" => Some("The Last Blade 2"),
        "lastsold" => Some("The Last Soldier"),
        "lbowling" => Some("League Bowling"),
        "legendos" => Some("Legend of Success Joe"),
        "lresort" => Some("Last Resort"),
        "magdrop2" => Some("Magical Drop II"),
        "magdrop3" => Some("Magical Drop III"),
        "maglord" => Some("Magician Lord"),
        "mahretsu" => Some("Mahjong Kyoretsuden"),
        "marukon" => Some("Maruko Deluxe Quiz"),
        "matrim" => Some("Matrimelee"),
        "miexchng" => Some("Money Idol Exchanger"),
        "minasan" => Some("Minnasanno Okagesamadesu"),
        "moshougi" => Some("Master of Syougi"),
        "mslug" => Some("Metal Slug - Super Vehicle-001"),
        "mslug2" => Some("Metal Slug 2 - Super Vehicle-001/II"),
        "mslug3" => Some("Metal Slug 3"),
        "mslug4" => Some("Metal Slug 4"),
        "mslug5" => Some("Metal Slug 5"),
        "mslugx" => Some("Metal Slug X - Super Vehicle-001"),
        "mutnat" => Some("Mutation Nation"),
        "nam1975" => Some("NAM-1975"),
        "ncommand" => Some("Ninja Commando"),
        "neobomp" => Some("Neo Bomberman"),
        "neocup98" => Some("Neo Geo Cup '98 - The Road to the Victory"),
        "neodrift" => Some("Neo Drift Out - New Technology"),
        "neomrdo" => Some("Neo Mr. Do!"),
        "ninjamas" => Some("Ninja Master's - Haoh-Ninpo-Cho"),
        "nitd" => Some("Nightmare in the Dark"),
        "overtop" => Some("Over Top"),
        "panicbom" => Some("Panic Bomber"),
        "pgoal" => Some("Pleasure Goal - 5 on 5 Mini Soccer"),
        "pnyaa" => Some("Pochi and Nyaa"),
        "popbounc" => Some("Pop 'n Bounce"),
        "preisle2" => Some("Prehistoric Isle 2"),
        "pulstar" => Some("Pulstar"),
        "puzzldpr" => Some("Puzzle De Pon! R!"),
        "puzzledp" | "puzzlede" => Some("Puzzle De Pon!"),
        "quizdais" => Some("Quiz Daisousa Sen - The Last Count Down"),
        "quizkof" => Some("Quiz King of Fighters"),
        "quizmeij" => Some("Quiz Meijin Sen"),
        "ragnagrd" => Some("Ragnagard"),
        "rbff1" => Some("Real Bout Fatal Fury"),
        "rbff2" => Some("Real Bout Fatal Fury 2 - The Newcomers"),
        "rbffspec" => Some("Real Bout Fatal Fury Special"),
        "ridhero" => Some("Riding Hero"),
        "roboarma" => Some("Robo Army"),
        "samsho" => Some("Samurai Shodown"),
        "samsho2" => Some("Samurai Shodown II"),
        "samsho3" => Some("Samurai Shodown III"),
        "samsho4" => Some("Samurai Shodown IV - Amakusa's Revenge"),
        "samsho5" => Some("Samurai Shodown V"),
        "samsh5sp" => Some("Samurai Shodown V Special"),
        "savagere" => Some("Savage Reign"),
        "sdodgeb" => Some("Super Dodge Ball"),
        "sengoku" => Some("Sengoku"),
        "sengoku2" => Some("Sengoku 2"),
        "sengoku3" => Some("Sengoku 3"),
        "shocktro" => Some("Shock Troopers"),
        "shocktr2" => Some("Shock Troopers - 2nd Squad"),
        "socbrawl" => Some("Soccer Brawl"),
        "sonicwi2" => Some("Aero Fighters 2"),
        "sonicwi3" => Some("Aero Fighters 3"),
        "spinmast" => Some("Spin Master"),
        "ssideki" => Some("Super Sidekicks"),
        "ssideki2" => Some("Super Sidekicks 2 - The World Championship"),
        "ssideki3" => Some("Super Sidekicks 3 - The Next Glory"),
        "ssideki4" => Some("The Ultimate 11 - The SNK Football Championship"),
        "stakwin" => Some("Stakes Winner"),
        "stakwin2" => Some("Stakes Winner 2"),
        "strhoop" => Some("Street Hoop / Dunk Dream"),
        "superspy" => Some("The Super Spy"),
        "svc" => Some("SNK vs. Capcom - SVC Chaos"),
        "teot" => Some("The Eye of Typhoon"),
        "tpgolf" => Some("Top Player's Golf"),
        "trally" => Some("Thrash Rally"),
        "turfmast" => Some("Neo Turf Masters"),
        "twinspri" => Some("Twinkle Star Sprites"),
        "tws96" => Some("Tecmo World Soccer '96"),
        "viewpoin" => Some("Viewpoint"),
        "vliner" => Some("V-Liner"),
        "wakuwak7" => Some("Waku Waku 7"),
        "wh1" => Some("World Heroes"),
        "wh2" => Some("World Heroes 2"),
        "wh2j" => Some("World Heroes 2 Jet"),
        "whp" => Some("World Heroes Perfect"),
        "windjams" | "wjammers" | "wjammere" | "wjammersp" => {
            Some("Windjammers / Flying Power Disc")
        }
        "zedblade" => Some("Zed Blade / Operation Ragnarok"),
        "zintrckb" => Some("Zintrick"),
        "zupapa" => Some("Zupapa!"),
        // Classic Arcade, CPS1, CPS2, CPS3, Neo Geo, Midway, Konami, Sega, etc.
        "kinst" | "kinst13" | "kinst14" | "kinst15" | "kinst15d" => Some("Killer Instinct"),
        "kinst2" | "kinst210" | "kinst211" | "kinst213" | "kinst214" => Some("Killer Instinct 2"),
        "ssriders" | "ssrideru" | "ssriderj" | "ssridere" | "ssridr" | "sunset" | "sunsetbl"
        | "sunset1" | "sunset2" | "sunset4" | "sunset4p" => Some("Sunset Riders"),
        "numanath" | "numanatha" | "numanathj" => Some("Numan Athletics"),
        "machbrkr" | "machbrkj" => Some("Mach Breakers - Numan Athletics 2"),
        "pbobblen" | "pbobble" | "pbobbl2n" | "pbobble2" | "pbobble3" | "pbobble4" => {
            Some("Puzzle Bobble")
        }
        "tophuntr" | "tophuntru" | "tophuntrh" => Some("Top Hunter - Roddy & Cathy"),
        "dino" | "dinos" | "dinou" | "dinoa" | "dinoj" | "dinopic" | "dinopic2" | "dinopic3" => {
            Some("Cadillacs and Dinosaurs")
        }
        "goldnaxe" | "goldnax1" | "goldnax2" | "goldnax3" | "goldnaxu" | "goldnaxj" => {
            Some("Golden Axe")
        }
        "knights" | "knightsu" | "knightsj" | "knightsja" => Some("Knights of the Round"),
        "kod" | "kodu" | "kodj" | "koda" => Some("The King of Dragons"),
        "souledge" | "souledga" | "souledgb" | "souledgc" => Some("Soul Edge"),
        "soulclbr" | "soulclbra" | "soulclbrb" => Some("SoulCalibur"),
        "tekken" | "tekkena" | "tekkenb" => Some("Tekken"),
        "tekken2" | "tekken2a" | "tekken2b" => Some("Tekken 2"),
        "tekken3" | "tekken3a" | "tekken3b" => Some("Tekken 3"),
        "sf2" | "sf2ua" | "sf2ub" | "sf2ue" | "sf2ui" | "sf2j" | "sf2ja" | "sf2jb" | "sf2jc" => {
            Some("Street Fighter II - The World Warrior")
        }
        "sf2ce" | "sf2ceua" | "sf2ceub" | "sf2ceuc" | "sf2cej" => {
            Some("Street Fighter II' - Champion Edition")
        }
        "sf2hf" | "sf2t" => Some("Street Fighter II' Turbo - Hyper Fighting"),
        "ssf2" | "ssf2u" | "ssf2j" | "ssf2a" | "ssf2ar1" => {
            Some("Super Street Fighter II - The New Challengers")
        }
        "ssf2t" | "ssf2tu" | "ssf2tj" | "ssf2ta" => Some("Super Street Fighter II Turbo"),
        "sfa" | "sfau" | "sfaj" => Some("Street Fighter Alpha - Warriors' Dreams"),
        "sfa2" | "sfa2u" | "sfa2ur1" => Some("Street Fighter Alpha 2"),
        "sfa3" | "sfa3u" | "sfa3ur1" => Some("Street Fighter Alpha 3"),
        "sfiii" => Some("Street Fighter III - New Generation"),
        "sfiii2" => Some("Street Fighter III 2nd Impact - Giant Attack"),
        "sfiii3" | "sfiii3nr" | "sfiii3u" => {
            Some("Street Fighter III 3rd Strike - Fight for the Future")
        }
        "punisher" | "punisheru" | "punisherj" => Some("The Punisher"),
        "ffight" | "ffightu" | "ffightu1" | "ffightj" | "ffightj1" => Some("Final Fight"),
        "captcomm" | "captcommu" | "captcommj" => Some("Captain Commando"),
        "wof" | "wofu" | "wofj" | "wofa" => Some("Warriors of Fate"),
        "avsp" | "avspu" | "avspj" | "avspa" => Some("Alien vs. Predator"),
        "armwar" | "armwaru" | "armwar1" => Some("Armored Warriors"),
        "cybots" | "cybotsu" | "cybotsj" => Some("Cyberbots - Fullmetal Madness"),
        "ddsom" | "ddsomu" | "ddsomj" | "ddsoma" => {
            Some("Dungeons & Dragons - Shadow over Mystara")
        }
        "ddtod" | "ddtodu" | "ddtodj" | "ddtoda" => Some("Dungeons & Dragons - Tower of Doom"),
        "msh" | "mshu" | "mshj" | "msha" => Some("Marvel Super Heroes"),
        "mshvsf" | "mshvsfu" | "mshvsfj" | "mshvsfa" => {
            Some("Marvel Super Heroes Vs. Street Fighter")
        }
        "mvsc" | "mvscu" | "mvscj" | "mvsca" => Some("Marvel Vs. Capcom - Clash of Super Heroes"),
        "xmvsf" | "xmvsfu" | "xmvsfj" | "xmvsfa" => Some("X-Men Vs. Street Fighter"),
        "xmcota" | "xmcotaa" | "xmcotae" | "xmcotae1" | "xmcotaer" | "xmcotaer1" | "xmcotaer2"
        | "xmcotaer3" => Some("X-Men - Children of the Atom"),
        "pacman" | "puckman" => Some("Pac-Man"),
        "mspacman" => Some("Ms. Pac-Man"),
        "galaga" | "galagamf" | "galagao" => Some("Galaga"),
        "galaxian" | "galaxianm" => Some("Galaxian"),
        "tmnt" | "tmnt2_1" => Some("Teenage Mutant Ninja Turtles"),
        "tmnt2" | "tmnt2a" | "tmnt2pj" | "tmnt2po" => {
            Some("Teenage Mutant Ninja Turtles - Turtles in Time")
        }
        "simpsons" | "simpsons2p" | "simpsons4p" => Some("The Simpsons"),
        "xmen" | "xmen2p" | "xmen6p" | "xmena" | "xmenj" => Some("X-Men"),
        "mk" | "mkla1" | "mkla2" | "mkla3" | "mkla4" | "mkr11" | "mkt" | "mky" | "mkyw" => {
            Some("Mortal Kombat")
        }
        "mk2" | "mk2r14" | "mk2r20" | "mk2r21" | "mk2r30" | "mk2r31" | "mk2r32" | "mk2r42"
        | "mk2r91" => Some("Mortal Kombat II"),
        "mk3" | "mk3r10" | "mk3r20" | "mk3r21" | "mk3r22" => Some("Mortal Kombat 3"),
        "umk3" | "umk3r10" | "umk3r11" | "umk3r12" => Some("Ultimate Mortal Kombat 3"),
        "strider" | "striderj" | "striderjr" => Some("Strider"),
        "ghouls" | "ghoulsu" | "ghoulsj" => Some("Ghouls'n Ghosts"),
        "gng" | "gnga" | "gngt" | "gngc" => Some("Ghosts'n Goblins"),
        "1941" | "1941j" | "1941u" => Some("1941 - Counter Attack"),
        "1942" | "1942a" | "1942b" => Some("1942"),
        "1943" | "1943kai" | "1943j" => Some("1943 - The Battle of Midway"),
        "1944" | "1944j" | "1944d" => Some("1944 - The Loop Master"),
        "19xx" | "19xxa" | "19xxj" | "19xxjr1" => Some("19XX - The War Against Destiny"),
        "bionicc" | "bionicc1" | "bionicc2" => Some("Bionic Commando"),
        "mercs" | "mercsu" | "mercsj" => Some("MERCS"),
        "commando" | "commandou" | "commandoj" => Some("Commando"),
        "gunsmoke" | "gunsmokeu" | "gunsmokej" => Some("Gun.Smoke"),
        "slammast" | "slammastu" | "slammastj" => Some("Saturday Night Slam Masters"),
        "ringdest" | "ringdestu" | "ringdesta" => Some("Ring of Destruction - Slammasters II"),
        "megaman" | "megaman2" => Some("Mega Man - The Power Battle"),
        "nbajam" | "nbajamte" | "nbahangt" => Some("NBA Jam"),
        "openice" => Some("2 On 2 Open Ice Challenge"),
        "blitz" | "blitz99" => Some("NFL Blitz"),
        "outrun" | "outrunb" | "outrundx" => Some("Out Run"),
        "hangon" | "shangon" => Some("Hang-On"),
        "spacehar" => Some("Space Harrier"),
        "shinobi" | "shinobib" => Some("Shinobi"),
        "shadoww" => Some("Shadow Warriors"),
        "altereb" => Some("Altered Beast"),
        "donkeykong" | "dkong" | "dkongjr" | "dkong3" => Some("Donkey Kong"),
        "frogger" | "frogger2" => Some("Frogger"),
        "digdug" | "digdug2" => Some("Dig Dug"),
        "rallyx" | "nrallyx" => Some("Rally-X"),
        "qbert" | "qbertqub" => Some("Q*bert"),
        "centiped" | "milliped" => Some("Centipede"),
        "asteroids" | "astdelux" => Some("Asteroids"),
        "defender" | "defendw" => Some("Defender"),
        "joust" | "joust2" => Some("Joust"),
        "robotron" => Some("Robotron - 2084"),
        "gauntlet" | "gaunt2" => Some("Gauntlet"),
        "rampage" | "rampage2" => Some("Rampage"),
        "spyhunt" | "spyhunt2" => Some("Spy Hunter"),
        "wwf" | "wwfsstar" | "wwfwfest" => Some("WWF WrestleFest"),
        "batman" | "batmanfr" => Some("Batman"),
        _ => None,
    }
}

/// Genera candidatos de búsqueda de carátulas específicos para plataformas Arcade (FBNeo / MAME / Neo Geo)
pub fn arcade_thumbnail_candidates(stem: &str, display_name: Option<&str>) -> Vec<String> {
    let mut candidates = Vec::new();
    let mut add = |name: &str| {
        let trimmed = name.trim();
        if !trimmed.is_empty()
            && !candidates
                .iter()
                .any(|c: &String| c.eq_ignore_ascii_case(trimmed))
        {
            candidates.push(trimmed.to_string());
        }
    };

    let title_clean = display_name
        .or_else(|| arcade_display_name(stem))
        .unwrap_or(stem);

    // 1. Título tal cual
    add(title_clean);

    // 2. Variantes con & -> _ y / -> _
    let with_underscores = title_clean.replace(['&', '/'], "_");
    add(&with_underscores);

    // 3. Título sin paréntesis ni corchetes
    let bare = title_clean
        .split('(')
        .next()
        .unwrap_or(title_clean)
        .split('[')
        .next()
        .unwrap_or(title_clean)
        .trim();
    if !bare.is_empty() {
        add(bare);
        add(&bare.replace(['&', '/'], "_"));

        // Títulos dobles y variantes oficiales específicas de arcade
        if bare.contains("Sunset Riders") {
            add("Sunset Riders (2 Players ver ABD)");
            add("Sunset Riders (4 Players ver EAC)");
            add("Sunset Riders (2 Players ver. ABD)");
            add("Sunset Riders (4 Players ver. EAC)");
        }
        if bare.contains("The King of Fighters '98") {
            add("The King of Fighters '98 - The Slugfest _ King of Fighters '98 - Dream Match Never Ends (NGM-2420)");
            add("The King of Fighters '98 - The Slugfest _ King of Fighters '98 - Dream Match Never Ends (NGH-2420)");
            add("The King of Fighters '98 - The Slugfest _ King of Fighters '98 - Dream Match Never Ends (NGM-2420)(NGH-2420)");
            add("The King of Fighters '98 - The Slugfest (NGM-2420, NGH-2420)");
        }
        if bare.contains("The King of Fighters '99") {
            add("The King of Fighters '99 - Millennium Battle (NGM-2510)");
            add("The King of Fighters '99 - Millennium Battle (NGH-2510)");
            add("The King of Fighters '99 - Millennium Battle _ King of Fighters '99 - Millennium Battle (NGM-2510)(NGH-2510)");
        }
        if bare.contains("The Last Blade 2") {
            add("The Last Blade 2 _ Bakumatsu Roman - Dai Ni Maku Gekka no Kenshi (NGM-2430 ~ NGH-2430)");
            add("The Last Blade 2 _ Bakumatsu Roman - Dai Ni Maku Gekka no Kenshi (NGM-2400)(NGH-2400)");
        } else if bare.contains("The Last Blade") {
            add("The Last Blade _ Bakumatsu Roman - Gekka no Kenshi (NGH-2340)");
            add("The Last Blade _ Bakumatsu Roman - Gekka no Kenshi (NGM-2340)");
            add("The Last Blade _ Bakumatsu Roman - Gekka no Kenshi (NGM-2340)(NGH-2340)");
        }
        if bare.contains("Windjammers") {
            add("Windjammers _ Flying Power Disc");
            add("Windjammers _ Flying Power Disc (NGM-065)(NGH-065)");
        }
        if bare.contains("Top Hunter") {
            add("Top Hunter - Roddy _ Cathy (NGM-046)");
            add("Top Hunter - Roddy _ Cathy (NGH-046)");
            add("Top Hunter - Roddy _ Cathy");
        }
        if bare.contains("Puzzle Bobble") {
            add("Puzzle Bobble (Japan, B-System)");
            add("Puzzle Bobble _ Bust-A-Move (Neo-Geo) (NGM-083)");
            add("Puzzle Bobble _ Bust-A-Move (Neo-Geo)");
        }
        if bare.contains("Cadillacs and Dinosaurs") || bare.contains("Cadillacs") {
            add("Cadillacs and Dinosaurs (World 930201)");
            add("Cadillacs and Dinosaurs (USA 930201)");
            add("Cadillacs and Dinosaurs (Asia TW 930223)");
            add("Cadillacs _ Dinosaurs (930201 World)");
            add("Cadillacs _ Dinosaurs (930201 USA)");
        }
        if bare.contains("Knights of the Round") {
            add("Knights of the Round (911127 Japan, B-Board 91634B-2)");
            add("Knights of the Round (World 911127)");
            add("Knights of the Round (USA 911127)");
        }
        if bare.contains("The King of Dragons") {
            add("The King of Dragons (Japan 910805, B-Board 89625B-1)");
            add("The King of Dragons (World 910805)");
            add("The King of Dragons (USA 910805)");
        }
        if bare.contains("Soul Edge") {
            add("Soul Edge (Japan, SO1_VER.A)");
            add("Soul Edge (Japan, SO2_VER.A)");
            add("Soul Edge (SO1_VER.A)");
        }
        if bare.contains("Numan Athletics") {
            add("Numan Athletics (Japan)");
            add("Numan Athletics (World)");
        }
        if bare.contains("Shock Troopers - 2nd Squad") {
            add("Shock Troopers - 2nd Squad");
        } else if bare.contains("Shock Troopers") {
            add("Shock Troopers (set 1)");
            add("Shock Troopers (set 2)");
        }
        if bare.contains("Metal Slug 2") {
            add("Metal Slug 2 - Super Vehicle-001_II (NGM-2410)(NGH-2410)");
            add("Metal Slug 2 - Super Vehicle-001_II");
        } else if bare.contains("Metal Slug") {
            add("Metal Slug - Super Vehicle-001");
            add("Metal Slug - Super Vehicle-001 (NGM-201)");
        }

        // Variantes con sufijos comunes de arcade
        let arcade_suffixes = [
            "(set 1)",
            "(set 2)",
            "(set 3)",
            "(World)",
            "(USA)",
            "(Japan)",
            "(Asia)",
            "(Europe)",
            "(World 930201)",
            "(USA 930201)",
            "(World 910805)",
            "(World 911127)",
            "(USA 910909)",
            "(ROM ver. 1.5d) [Works best in 64-bit build]",
            "(ROM ver. 1.3) [Works best in 64-bit build]",
        ];
        for s in &arcade_suffixes {
            add(&format!("{} {}", bare, s));
        }
        if bare.contains("The King of Fighters '98") {
            add("The King of Fighters '98 - The Slugfest _ King of Fighters '98 - Dream Match Never Ends (NGM-2420)");
            add("The King of Fighters '98 - The Slugfest _ King of Fighters '98 - Dream Match Never Ends (NGH-2420)");
            add("The King of Fighters '98 - The Slugfest _ King of Fighters '98 - Dream Match Never Ends (NGM-2420)(NGH-2420)");
            add("The King of Fighters '98 - The Slugfest (NGM-2420, NGH-2420)");
        }
        if bare.contains("The King of Fighters '99") {
            add("The King of Fighters '99 - Millennium Battle (NGM-2510)");
            add("The King of Fighters '99 - Millennium Battle (NGH-2510)");
            add("The King of Fighters '99 - Millennium Battle _ King of Fighters '99 - Millennium Battle (NGM-2510)(NGH-2510)");
        }
        if bare.contains("The Last Blade 2") {
            add("The Last Blade 2 _ Bakumatsu Roman - Dai Ni Maku Gekka no Kenshi (NGM-2430 ~ NGH-2430)");
            add("The Last Blade 2 _ Bakumatsu Roman - Dai Ni Maku Gekka no Kenshi (NGM-2400)(NGH-2400)");
        } else if bare.contains("The Last Blade") {
            add("The Last Blade _ Bakumatsu Roman - Gekka no Kenshi (NGM-2340)");
            add("The Last Blade _ Bakumatsu Roman - Gekka no Kenshi (NGH-2340)");
            add("The Last Blade _ Bakumatsu Roman - Gekka no Kenshi (NGM-2340)(NGH-2340)");
        }
        if bare.contains("Windjammers") {
            add("Windjammers _ Flying Power Disc");
            add("Windjammers _ Flying Power Disc (NGM-065)(NGH-065)");
        }
        if bare.contains("Top Hunter") {
            add("Top Hunter - Roddy _ Cathy (NGM-046)");
            add("Top Hunter - Roddy _ Cathy (NGH-046)");
            add("Top Hunter - Roddy _ Cathy");
        }
        if bare.contains("Puzzle Bobble") {
            add("Puzzle Bobble (Japan, B-System)");
            add("Puzzle Bobble _ Bust-A-Move (Neo-Geo) (NGM-083)");
            add("Puzzle Bobble _ Bust-A-Move (Neo-Geo)");
        }
        if bare.contains("Cadillacs and Dinosaurs") || bare.contains("Cadillacs") {
            add("Cadillacs and Dinosaurs (World 930201)");
            add("Cadillacs and Dinosaurs (USA 930201)");
            add("Cadillacs and Dinosaurs (Asia TW 930223)");
            add("Cadillacs _ Dinosaurs (930201 World)");
            add("Cadillacs _ Dinosaurs (930201 USA)");
        }
        if bare.contains("Knights of the Round") {
            add("Knights of the Round (911127 Japan, B-Board 91634B-2)");
            add("Knights of the Round (World 911127)");
            add("Knights of the Round (USA 911127)");
        }
        if bare.contains("The King of Dragons") {
            add("The King of Dragons (Japan 910805, B-Board 89625B-1)");
            add("The King of Dragons (World 910805)");
            add("The King of Dragons (USA 910805)");
        }
        if bare.contains("Soul Edge") {
            add("Soul Edge (Japan, SO1_VER.A)");
            add("Soul Edge (Japan, SO2_VER.A)");
            add("Soul Edge (SO1_VER.A)");
        }
        if bare.contains("Numan Athletics") {
            add("Numan Athletics (Japan)");
            add("Numan Athletics (World)");
        }
        if bare.contains("Shock Troopers - 2nd Squad") {
            add("Shock Troopers - 2nd Squad");
        } else if bare.contains("Shock Troopers") {
            add("Shock Troopers (set 1)");
            add("Shock Troopers (set 2)");
        }
        if bare.contains("Metal Slug 2") {
            add("Metal Slug 2 - Super Vehicle-001_II (NGM-2410)(NGH-2410)");
            add("Metal Slug 2 - Super Vehicle-001_II");
        } else if bare.contains("Metal Slug") {
            add("Metal Slug - Super Vehicle-001");
            add("Metal Slug - Super Vehicle-001 (NGM-201)");
        }
    }

    // 4. Nombre del archivo stem (ej. "kof98", "ssriders", "kinst", "blazstar")
    add(stem);

    candidates
}

/// Normalize game name for libretro-thumbnails search
/// Per repo README: &*/:`<>?\| must be replaced with _
pub fn normalize_thumbnail_name(name: &str) -> String {
    let mut result = String::with_capacity(name.len());
    for c in name.chars() {
        match c {
            '&' | '*' | '/' | ':' | '<' | '>' | '?' | '\\' | '|' => result.push('_'),
            _ => result.push(c),
        }
    }
    // Trim trailing dots and spaces (Windows invalid)
    result.trim_end_matches('.').trim_end().to_string()
}

#[allow(dead_code)]
pub fn thumbnail_url_with_category(
    platform: &str,
    game_name: &str,
    category: &str,
) -> Option<String> {
    let dir = thumbnail_dir(platform)?;
    Some(thumbnail_url_with_category_and_dir(
        dir, game_name, category,
    ))
}

pub fn thumbnail_url_with_category_and_dir(dir: &str, game_name: &str, category: &str) -> String {
    let normalized = normalize_thumbnail_name(game_name);
    let encoded_dir = urlencoding::encode(dir);
    let encoded = urlencoding::encode(&normalized);
    format!(
        "https://thumbnails.libretro.com/{}/{}/{}.png",
        encoded_dir, category, encoded
    )
}

#[allow(dead_code)]
pub fn thumbnail_fallback_url(platform: &str, game_name: &str, category: &str) -> Option<String> {
    let dir = thumbnail_dir(platform)?;
    Some(thumbnail_fallback_url_with_dir(dir, game_name, category))
}

pub fn thumbnail_fallback_url_with_dir(dir: &str, game_name: &str, category: &str) -> String {
    let normalized = normalize_thumbnail_name(game_name);
    let repo_name = dir.replace(" ", "_");
    let encoded = urlencoding::encode(&normalized);
    format!(
        "https://raw.githubusercontent.com/libretro-thumbnails/{}/master/{}/{}.png",
        repo_name, category, encoded
    )
}
