use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;

#[derive(Debug, Clone, Default)]
pub struct RomHeaderInfo {
    pub internal_title: Option<String>,
    pub serial: Option<String>,
}

fn clean_ascii_str(bytes: &[u8]) -> Option<String> {
    let mut s = String::new();
    for &b in bytes {
        if b == 0 {
            break;
        }
        if b.is_ascii_graphic() || b == b' ' {
            s.push(b as char);
        }
    }
    let trimmed = s.trim();
    if trimmed.len() >= 2 {
        Some(trimmed.to_string())
    } else {
        None
    }
}

/// Lee la cabecera oficial de un cartucho GBA (offset 0xA0)
pub fn read_gba_header(path: &Path) -> Option<RomHeaderInfo> {
    let mut file = File::open(path).ok()?;
    file.seek(SeekFrom::Start(0xA0)).ok()?;
    let mut buf = [0u8; 16];
    file.read_exact(&mut buf).ok()?;

    let title = clean_ascii_str(&buf[0..12]);
    let game_code = clean_ascii_str(&buf[12..16]);

    let serial = game_code.map(|code| format!("AGB-{}", code));

    if title.is_some() || serial.is_some() {
        Some(RomHeaderInfo {
            internal_title: title,
            serial,
        })
    } else {
        None
    }
}

/// Lee la cabecera oficial de un cartucho NDS (offset 0x00)
pub fn read_nds_header(path: &Path) -> Option<RomHeaderInfo> {
    let mut file = File::open(path).ok()?;
    let mut buf = [0u8; 16];
    file.read_exact(&mut buf).ok()?;

    let title = clean_ascii_str(&buf[0..12]);
    let game_code = clean_ascii_str(&buf[12..16]);

    let serial = game_code.map(|code| format!("NTR-{}", code));

    if title.is_some() || serial.is_some() {
        Some(RomHeaderInfo {
            internal_title: title,
            serial,
        })
    } else {
        None
    }
}

/// Lee la cabecera NCSD o NCCH de un archivo de Nintendo 3DS (.3ds, .cci, .cxi)
/// Offset 0x100 contiene la cabecera NCCH (o la primera partición de NCSD)
/// El código de producto (ej. CTR-P-AGSE) se ubica en el offset 0x150..0x160
pub fn read_3ds_header(path: &Path) -> Option<RomHeaderInfo> {
    let mut file = File::open(path).ok()?;
    // Intentar leer desde 0x100 (NCCH en archivos NCSD .3ds/.cci o .cxi directo)
    file.seek(SeekFrom::Start(0x100)).ok()?;
    let mut magic = [0u8; 4];
    file.read_exact(&mut magic).ok()?;

    // Si no es NCCH en 0x100, verificar si el archivo es un NCCH puro que empieza en 0x00
    let ncch_offset = if &magic == b"NCCH" {
        0x100
    } else {
        file.seek(SeekFrom::Start(0x00)).ok()?;
        file.read_exact(&mut magic).ok()?;
        if &magic == b"NCCH" {
            0x00
        } else {
            return None;
        }
    };

    // El product code está en ncch_offset + 0x50, longitud 16 bytes
    file.seek(SeekFrom::Start(ncch_offset + 0x50)).ok()?;
    let mut prod_buf = [0u8; 16];
    file.read_exact(&mut prod_buf).ok()?;
    let prod_code = clean_ascii_str(&prod_buf);

    if let Some(code) = prod_code {
        let serial = if code.starts_with("CTR-") || code.starts_with("KTR-") {
            code
        } else {
            format!("CTR-P-{}", code)
        };
        Some(RomHeaderInfo {
            internal_title: None,
            serial: Some(serial),
        })
    } else {
        None
    }
}

/// Lee la cabecera de Game Boy / Game Boy Color (offset 0x0134)
pub fn read_gb_header(path: &Path) -> Option<RomHeaderInfo> {
    let mut file = File::open(path).ok()?;
    file.seek(SeekFrom::Start(0x0134)).ok()?;
    let mut buf = [0u8; 16];
    file.read_exact(&mut buf).ok()?;

    let title = clean_ascii_str(&buf[0..15]);
    let code = clean_ascii_str(&buf[11..15]);
    let serial = code.map(|c| format!("DMG-{}", c));

    if title.is_some() || serial.is_some() {
        Some(RomHeaderInfo {
            internal_title: title,
            serial,
        })
    } else {
        None
    }
}

/// Lee la cabecera de Nintendo 64 (offset 0x20)
pub fn read_n64_header(path: &Path) -> Option<RomHeaderInfo> {
    let mut file = File::open(path).ok()?;
    file.seek(SeekFrom::Start(0x20)).ok()?;
    let mut buf = [0u8; 32];
    file.read_exact(&mut buf).ok()?;

    let title = clean_ascii_str(&buf[0..20]);
    let code = clean_ascii_str(&buf[27..31]);
    let serial = code.map(|c| format!("NUS-{}", c));

    if title.is_some() || serial.is_some() {
        Some(RomHeaderInfo {
            internal_title: title,
            serial,
        })
    } else {
        None
    }
}

/// Lee la cabecera interna de SNES (prueba LoROM en 0x7FC0 y HiROM en 0xFFC0)
pub fn read_snes_header(path: &Path) -> Option<RomHeaderInfo> {
    let mut file = File::open(path).ok()?;
    let len = file.metadata().ok()?.len();
    if len < 0x8000 {
        return None;
    }

    // Probar LoROM primero
    for offset in [0x7FC0, 0xFFC0] {
        if len > offset + 32 && file.seek(SeekFrom::Start(offset)).is_ok() {
            let mut buf = [0u8; 21];
            if file.read_exact(&mut buf).is_ok() {
                if let Some(title) = clean_ascii_str(&buf) {
                    if title.chars().all(|c| c.is_ascii_graphic() || c == ' ') {
                        return Some(RomHeaderInfo {
                            internal_title: Some(title),
                            serial: None,
                        });
                    }
                }
            }
        }
    }
    None
}

/// Extrae serial de PlayStation 1 / 2 buscando SYSTEM.CNF en los primeros sectores o contenido
pub fn read_playstation_serial_from_slice(bytes: &[u8]) -> Option<String> {
    for window in bytes.windows(4) {
        if window == b"BOOT" {
            let offset = window.as_ptr() as usize - bytes.as_ptr() as usize;
            let sub = &bytes[offset..std::cmp::min(bytes.len(), offset + 120)];
            let text = String::from_utf8_lossy(sub);
            if let Some(line) = text.lines().next() {
                let line_clean = line.trim();
                if line_clean.starts_with("BOOT") && line_clean.to_lowercase().contains("cdrom") {
                    let slash_idx = line_clean.rfind('\\').or_else(|| line_clean.rfind('/'));
                    if let Some(idx) = slash_idx {
                        let rest = &line_clean[idx + 1..];
                        let raw_serial = rest.split(';').next().unwrap_or(rest).trim();
                        let clean_serial = raw_serial.replace(['_', '.', '-'], "").to_uppercase();
                        if clean_serial.len() >= 8 {
                            if clean_serial[..4].chars().all(|c| c.is_ascii_alphabetic()) {
                                return Some(format!(
                                    "{}-{}",
                                    &clean_serial[..4],
                                    &clean_serial[4..]
                                ));
                            }
                            return Some(clean_serial);
                        }
                    }
                }
            }
        }
    }
    None
}

/// Extrae serial oficial de PlayStation / PSP de un texto o nombre de archivo (ej. SCES-03047)
pub fn extract_serial_from_str(s: &str) -> Option<String> {
    let upper = s.to_uppercase();
    let prefixes = [
        "SCES", "SLES", "SLUS", "SCUS", "SCPS", "SLPS", "SLED", "SLKA", "SCED", "ULUS", "ULES",
        "UCUS", "UCES", "ULJS", "UCJS", "ULKS", "BLES", "BLUS", "BCES", "BCUS", "BLJS", "BCJS",
        "BLAS", "BCAS", "NPUB", "NPEB", "NPHB", "NPJJ",
    ];

    for prefix in &prefixes {
        if let Some(pos) = upper.find(prefix) {
            let rest = &upper[pos + prefix.len()..];
            let rest_trimmed = rest.trim_start_matches(['-', '_', '.', ' ']);
            let digits: String = rest_trimmed
                .chars()
                .take_while(|c| c.is_ascii_digit())
                .collect();
            if digits.len() == 4 || digits.len() == 5 {
                return Some(format!("{}-{}", prefix, digits));
            }
        }
    }
    None
}

/// Lee el serial de una lista de reproducción multidisco .m3u
pub fn read_m3u_header(path: &Path) -> Option<RomHeaderInfo> {
    if let Some(serial) = extract_serial_from_str(&path.to_string_lossy()) {
        return Some(RomHeaderInfo {
            internal_title: None,
            serial: Some(serial),
        });
    }

    let content = std::fs::read_to_string(path).ok()?;
    let parent = path.parent().unwrap_or(Path::new(""));

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        if let Some(serial) = extract_serial_from_str(trimmed) {
            return Some(RomHeaderInfo {
                internal_title: None,
                serial: Some(serial),
            });
        }

        let disc_path = parent.join(trimmed);
        if disc_path.exists() {
            let ext = disc_path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();
            if ext == "cue" {
                if let Some(serial) = extract_serial_from_str(&disc_path.to_string_lossy()) {
                    return Some(RomHeaderInfo {
                        internal_title: None,
                        serial: Some(serial),
                    });
                }
                if let Ok(cue_content) = std::fs::read_to_string(&disc_path) {
                    for cue_line in cue_content.lines() {
                        let cue_trimmed = cue_line.trim_start();
                        if cue_trimmed.to_uppercase().starts_with("FILE") {
                            if let Some(first_q) = cue_trimmed.find('"') {
                                if let Some(second_q) = cue_trimmed[first_q + 1..].find('"') {
                                    let bin_name =
                                        &cue_trimmed[first_q + 1..first_q + 1 + second_q];
                                    let bin_path =
                                        disc_path.parent().unwrap_or(parent).join(bin_name);
                                    if bin_path.exists() {
                                        if let Some(hdr) = read_psx_header(&bin_path) {
                                            return Some(hdr);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } else if ext == "iso" || ext == "bin" || ext == "img" {
                if let Some(hdr) = read_psx_header(&disc_path) {
                    return Some(hdr);
                }
            }
        }
    }
    None
}

/// Lee el serial de una imagen de PlayStation 1 o 2 (ISO / BIN)
pub fn read_psx_header(path: &Path) -> Option<RomHeaderInfo> {
    if let Some(serial) = extract_serial_from_str(&path.to_string_lossy()) {
        return Some(RomHeaderInfo {
            internal_title: None,
            serial: Some(serial),
        });
    }

    let mut file = File::open(path).ok()?;
    let mut buf = vec![0u8; 1024 * 1024 * 2]; // Primeros 2MB
    let n = file.read(&mut buf).ok()?;
    if n == 0 {
        return None;
    }
    let slice = &buf[..n];
    if let Some(serial) = read_playstation_serial_from_slice(slice) {
        return Some(RomHeaderInfo {
            internal_title: None,
            serial: Some(serial),
        });
    }
    None
}

/// Lee la información de un juego PS3 a partir de PARAM.SFO
pub fn read_ps3_header(path: &Path) -> Option<RomHeaderInfo> {
    let sfo_path = if path
        .file_name()
        .is_some_and(|f| f.to_string_lossy().eq_ignore_ascii_case("eboot.bin"))
    {
        path.parent()
            .and_then(|u| u.parent())
            .map(|p| p.join("PARAM.SFO"))
    } else if path.is_dir() {
        let direct = path.join("PARAM.SFO");
        if direct.exists() {
            Some(direct)
        } else {
            Some(path.join("PS3_GAME").join("PARAM.SFO"))
        }
    } else {
        path.parent().map(|p| p.join("PARAM.SFO"))
    };

    if let Some(sfo) = sfo_path.filter(|p| p.exists()) {
        if let Some((title, title_id)) = crate::platforms::parse_param_sfo(&sfo) {
            let serial = if !title_id.is_empty() {
                Some(title_id)
            } else {
                None
            };
            let internal_title = if !title.is_empty() { Some(title) } else { None };
            return Some(RomHeaderInfo {
                internal_title,
                serial,
            });
        }
    }
    None
}

/// Lee el serial a partir de un archivo .cue localizando el primer archivo .bin referenciado
pub fn read_cue_header(path: &Path) -> Option<RomHeaderInfo> {
    if let Some(serial) = extract_serial_from_str(&path.to_string_lossy()) {
        return Some(RomHeaderInfo {
            internal_title: None,
            serial: Some(serial),
        });
    }

    let cue_content = std::fs::read_to_string(path).ok()?;
    let parent = path.parent().unwrap_or(Path::new(""));
    for cue_line in cue_content.lines() {
        let cue_trimmed = cue_line.trim_start();
        if cue_trimmed.to_uppercase().starts_with("FILE") {
            if let Some(first_q) = cue_trimmed.find('"') {
                if let Some(second_q) = cue_trimmed[first_q + 1..].find('"') {
                    let bin_name = &cue_trimmed[first_q + 1..first_q + 1 + second_q];
                    let bin_path = parent.join(bin_name);
                    if bin_path.exists() {
                        if let Some(hdr) = read_psx_header(&bin_path) {
                            return Some(hdr);
                        }
                    }
                }
            }
        }
    }
    None
}

/// Estrategia de cabecera según la plataforma
pub fn extract_rom_header(platform: &str, path: &Path) -> Option<RomHeaderInfo> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    match platform {
        "GBA" => read_gba_header(path),
        "NDS" => read_nds_header(path),
        "3DS" => read_3ds_header(path),
        "GB" | "GBC" => read_gb_header(path),
        "N64" => read_n64_header(path),
        "SNES" => read_snes_header(path),
        "PS3" => read_ps3_header(path),
        "PS1" | "PS2" => {
            if ext == "m3u" {
                read_m3u_header(path).or_else(|| read_psx_header(path))
            } else if ext == "cue" {
                read_cue_header(path).or_else(|| read_psx_header(path))
            } else {
                read_psx_header(path)
            }
        }
        "PSP" => extract_serial_from_str(&path.to_string_lossy()).map(|s| RomHeaderInfo {
            internal_title: None,
            serial: Some(s),
        }),
        _ => {
            if ext == "m3u" {
                read_m3u_header(path)
            } else if ext == "cue" {
                read_cue_header(path)
            } else {
                None
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_ascii_str() {
        let b = b"POKEMON RED\0\0\0\0";
        assert_eq!(clean_ascii_str(b), Some("POKEMON RED".to_string()));

        let empty = b"\0\0\0";
        assert_eq!(clean_ascii_str(empty), None);
    }

    #[test]
    fn test_playstation_serial_parser() {
        let cnf_bytes = b"BOOT = cdrom0:\\SLUS_200.01;1\r\nVER = 1.00\r\nVMODE = NTSC\r\n";
        let serial = read_playstation_serial_from_slice(cnf_bytes);
        assert_eq!(serial, Some("SLUS-20001".to_string()));

        let cnf_ps1 = b"BOOT=cdrom:\\SLES_009.25;1\r\n";
        let serial_ps1 = read_playstation_serial_from_slice(cnf_ps1);
        assert_eq!(serial_ps1, Some("SLES-00925".to_string()));
    }
}
