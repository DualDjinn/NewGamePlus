use crate::platforms;
use crate::state::storage::get_binaries_dir;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::Path;
use std::sync::{LazyLock, Mutex};

pub static SHARED_META_CONN: LazyLock<Mutex<Option<Connection>>> = LazyLock::new(|| {
    let db_path = get_binaries_dir().join("libretrodb.sqlite");
    let conn = Connection::open_with_flags(
        &db_path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY | rusqlite::OpenFlags::SQLITE_OPEN_SHARED_CACHE,
    )
    .ok();
    Mutex::new(conn)
});

pub fn get_metadata_connection() -> Option<Connection> {
    let db_path = get_binaries_dir().join("libretrodb.sqlite");
    Connection::open_with_flags(
        &db_path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY | rusqlite::OpenFlags::SQLITE_OPEN_SHARED_CACHE,
    )
    .ok()
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GameMetadata {
    pub display_name: Option<String>,
    pub release_year: Option<i32>,
    pub release_month: Option<i32>,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub genre: Option<String>,
    pub franchise: Option<String>,
    pub region: Option<String>,
    pub rating: Option<String>,
}

pub fn db_platform_name(platform: &str) -> Option<&'static str> {
    match platform {
        "PS1" => Some("PlayStation"),
        "PS2" => Some("PlayStation 2"),
        "PS3" => Some("PlayStation 3"),
        "PSP" => Some("PlayStation Portable"),
        "SNES" => Some("Super Nintendo Entertainment System"),
        "NES" => Some("Nintendo Entertainment System"),
        "N64" => Some("Nintendo 64"),
        "GBA" => Some("Game Boy Advance"),
        "GBC" => Some("Game Boy Color"),
        "GB" => Some("Game Boy"),
        "NDS" => Some("Nintendo DS"),
        "3DS" => Some("Nintendo 3DS"),
        "GAMECUBE" => Some("GameCube"),
        "MEGA_DRIVE" => Some("Mega Drive - Genesis"),
        "SMS" => Some("Master System - Mark III"),
        "GAME_GEAR" => Some("Game Gear"),
        "VB" => Some("Virtual Boy"),
        _ => None,
    }
}

pub fn base_title(name: &str) -> String {
    let stem = Path::new(name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(name);
    let no_paren = stem.split(" (").next().unwrap_or(stem);
    let no_bracket = no_paren.split(" [").next().unwrap_or(no_paren);
    no_bracket.trim().to_lowercase()
}

pub fn canonical_title(name: &str) -> String {
    let stem = Path::new(name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(name);
    let no_paren = stem.split(" (").next().unwrap_or(stem);
    let no_bracket = no_paren.split(" [").next().unwrap_or(no_paren);
    let mut lower = no_bracket.trim().to_lowercase();

    if let Some(rest) = lower.strip_suffix(", the") {
        lower = format!("the {}", rest.trim());
    } else if let Some(rest) = lower.strip_suffix(", a") {
        lower = format!("a {}", rest.trim());
    } else if let Some(rest) = lower.strip_suffix(", an") {
        lower = format!("an {}", rest.trim());
    }

    let without_lead = if let Some(rest) = lower.strip_prefix("the ") {
        rest
    } else if let Some(rest) = lower.strip_prefix("a ") {
        rest
    } else if let Some(rest) = lower.strip_prefix("an ") {
        rest
    } else {
        &lower
    };

    let normalized = without_lead.replace(" of the ", " of ");
    normalized.trim().to_string()
}

pub fn sequel_number(s: &str) -> Option<&'static str> {
    // Extraer solo el título base para evitar que tokens de versión como '(Rev 2)', 'v1.2' o '[v2]' se interpreten como secuela
    let title = base_title(s);
    let s_lower = title.to_lowercase();
    let words: Vec<&str> = s_lower
        .split(|c: char| !c.is_alphanumeric())
        .filter(|w| !w.is_empty())
        .collect();
    for (i, &w) in words.iter().enumerate() {
        // Si la palabra previa es 'rev', 'v', 'ver' o 'revision', ignorar este número
        if i > 0 {
            let prev = words[i - 1];
            if prev == "rev"
                || prev == "v"
                || prev == "ver"
                || prev == "revision"
                || prev == "build"
            {
                continue;
            }
        }
        match w {
            "2" | "ii" | "2nd" => return Some("2"),
            "3" | "iii" | "3rd" => return Some("3"),
            "4" | "iv" | "4th" => return Some("4"),
            "5" | "v" | "5th" => return Some("5"),
            "6" | "vi" | "6th" => return Some("6"),
            "7" | "vii" | "7th" => return Some("7"),
            "8" | "viii" | "8th" => return Some("8"),
            "9" | "ix" | "9th" => return Some("9"),
            "10" | "x" | "10th" => return Some("10"),
            _ => {}
        }
    }
    None
}

pub fn region_tokens(name: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut rest = name;
    while let Some(start) = rest.find('(') {
        match rest[start..].find(')') {
            Some(end) => {
                out.push(rest[start + 1..start + end].trim().to_lowercase());
                rest = &rest[start + end + 1..];
            }
            None => break,
        }
    }
    out
}

pub fn thumbnail_name_candidates(name: &str) -> Vec<String> {
    let mut out = vec![name.to_string()];
    let bare = name
        .split(" (")
        .next()
        .unwrap_or(name)
        .trim_end()
        .to_string();

    let regions = [
        "(USA)",
        "(USA) (En)",
        "(Europe)",
        "(Europe) (En)",
        "(Japan)",
        "(USA, Europe)",
        "(USA, Europe) (En)",
        "(USA, Europe, Brazil)",
        "(USA, Europe, Brazil) (En)",
        "(Europe, Brazil)",
        "(Europe, Brazil) (En)",
        "(Japan, USA)",
        "(Japan, USA) (En,Ja)",
        "(World)",
        "(World) (En)",
    ];

    if bare != name && !bare.is_empty() {
        out.push(bare.clone());
    }

    if !bare.is_empty() {
        for r in &regions {
            let candidate = format!("{} {}", bare, r);
            if !out.contains(&candidate) {
                out.push(candidate);
            }
        }
    }

    out
}

fn normalize_region_tags(name: &str) -> String {
    let lower = name.to_lowercase();
    let is_es = lower.contains("(es)") || lower.contains("(spain)") || lower.contains("spain");
    let is_eu = lower.contains("(europe)") || lower.contains("europe");
    let is_us = lower.contains("(usa)") || lower.contains("usa");

    let stem = name.split(" (").next().unwrap_or(name).trim();

    if is_es {
        format!("{} (Spain)", stem)
    } else if is_eu {
        format!("{} (Europe)", stem)
    } else if is_us {
        format!("{} (USA)", stem)
    } else {
        name.to_string()
    }
}

pub fn is_stop_word(w: &str) -> bool {
    matches!(
        w,
        "super"
            | "the"
            | "and"
            | "pro"
            | "game"
            | "world"
            | "del"
            | "los"
            | "las"
            | "edition"
            | "edicion"
            | "edición"
            | "version"
            | "versione"
            | "portable"
            | "classic"
            | "pocket"
            | "advance"
            | "touch"
            | "bros"
            | "eboot"
            | "boot"
            | "default"
            | "usa"
            | "europe"
            | "japan"
            | "spain"
    )
}

pub fn plausible_match(rom_name: &str, display_name: &str) -> bool {
    let r_sequel = sequel_number(rom_name);
    let d_sequel = sequel_number(display_name);
    if r_sequel != d_sequel {
        return false;
    }

    if canonical_title(rom_name) == canonical_title(display_name) {
        return true;
    }

    let squash = |s: &str| {
        s.to_lowercase()
            .chars()
            .filter(|c| c.is_alphanumeric())
            .collect::<String>()
    };
    let (r, d) = (squash(rom_name), squash(display_name));
    if r.len() < 3 || d.len() < 3 {
        return r == d;
    }

    let words = |s: &str| -> Vec<String> {
        s.to_lowercase()
            .split(|c: char| !c.is_alphanumeric())
            .filter(|w| w.chars().count() >= 3)
            .map(String::from)
            .collect()
    };
    let r_words = words(rom_name);
    let d_words = words(display_name);

    let non_stop_r: Vec<_> = r_words.iter().filter(|w| !is_stop_word(w)).collect();
    let non_stop_d: Vec<_> = d_words.iter().filter(|w| !is_stop_word(w)).collect();

    // Si alguno no tiene palabras significativas, comparar cadenas limpias completas
    if non_stop_r.is_empty() || non_stop_d.is_empty() {
        return r == d;
    }

    // Evitar que un juego con múltiples palabras distinguidas coincida con un título genérico de 1 palabra
    // Ej: "The Legend of the Dragoon" [legend, dragoon] matching "Legend" [legend]
    if non_stop_r.len() >= 2 && non_stop_d.len() == 1 {
        return false;
    }
    if non_stop_d.len() >= 2 && non_stop_r.len() == 1 {
        return false;
    }

    let matched_count = non_stop_r.iter().filter(|w| non_stop_d.contains(w)).count();
    let min_words = non_stop_r.len().min(non_stop_d.len());

    // Si ambos tienen 1 sola palabra no-stop, deben coincidir
    if min_words == 1 && non_stop_r.len() == 1 && non_stop_d.len() == 1 {
        if matched_count == 1 {
            return true;
        }
    } else if min_words >= 2 {
        // Al menos 2 palabras deben coincidir o al menos el 50% de las palabras del más corto
        if matched_count >= 2 || (matched_count as f32 / min_words as f32) >= 0.5 {
            return true;
        }
    }

    // Coincidencia estricta de subcadena solo si la longitud es muy representativa (>= 75% del total)
    let min_len = r.len().min(d.len());
    let max_len = r.len().max(d.len());
    if min_len >= 5
        && (min_len as f32 / max_len as f32) >= 0.75
        && (r.contains(&d) || d.contains(&r))
    {
        return true;
    }

    false
}

pub fn find_rom_serial(conn: &Connection, rom_name: &str, rom_path: &Path) -> Option<String> {
    if !rom_name.is_empty() {
        let mut patterns: Vec<String> = vec![rom_name.to_string()];
        let normalized = normalize_region_tags(rom_name);
        if normalized != rom_name {
            patterns.push(normalized);
        }
        let bare = rom_name
            .split(" (")
            .next()
            .unwrap_or(rom_name)
            .trim_end()
            .to_string();
        if bare != rom_name && !bare.is_empty() {
            patterns.push(bare);
        }
        let mut allowed_exts: Option<Vec<String>> =
            platforms::detect_platform(&rom_path.to_string_lossy()).map(|info| {
                platforms::platform_extensions(info.platform)
                    .iter()
                    .map(|e| e.to_string())
                    .collect()
            });
        if let Some(exts) = &mut allowed_exts {
            exts.push("bin".into());
        }
        let expected_db_plat = platforms::detect_platform(&rom_path.to_string_lossy())
            .and_then(|i| db_platform_name(i.platform));

        let file_base = base_title(rom_name);
        let file_sequel = sequel_number(&file_base);
        let file_tokens = region_tokens(rom_name);

        for base in &patterns {
            let like = format!("%{}%", base);
            let Ok(mut stmt) = conn.prepare(
                "SELECT serial_id, name FROM roms WHERE name LIKE ?1 AND serial_id IS NOT NULL AND serial_id != '' LIMIT 50",
            ) else {
                continue;
            };
            let Ok(rows) = stmt.query_map(rusqlite::params![like], |r| {
                Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
            }) else {
                continue;
            };
            let mut best: Option<(i32, String)> = None;
            for row in rows.flatten() {
                let (serial, db_name) = row;
                if serial == "216D697373696E67" || serial.eq_ignore_ascii_case("!missing") {
                    continue;
                }
                let ext_ok = allowed_exts
                    .as_deref()
                    .map(|exts| {
                        Path::new(&db_name)
                            .extension()
                            .and_then(|e| e.to_str())
                            .map(|e| exts.iter().any(|x| x.eq_ignore_ascii_case(e)))
                            .unwrap_or(false)
                    })
                    .unwrap_or(true);
                if !ext_ok {
                    continue;
                }
                if let Some(expected) = expected_db_plat {
                    let db_plat: Option<String> = conn
                        .query_row(
                            "SELECT p.name FROM games g JOIN platforms p ON g.platform_id = p.id WHERE g.serial_id = ?1 LIMIT 1",
                            rusqlite::params![serial],
                            |r| r.get(0),
                        )
                        .ok();
                    if !db_plat
                        .is_none_or(|p| p == expected || p.starts_with(&format!("{} (", expected)))
                    {
                        continue;
                    }
                }

                let db_stem = Path::new(&db_name)
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or(&db_name);
                let db_base = base_title(db_stem);
                let db_sequel = sequel_number(&db_base);

                if file_sequel != db_sequel {
                    continue;
                }

                let mut score = 0;
                if file_base == db_base {
                    score += 100;
                } else if db_base.starts_with(&file_base) || file_base.starts_with(&db_base) {
                    score += 20;
                }

                let stem_exact = db_stem.eq_ignore_ascii_case(rom_name);
                if stem_exact {
                    score += 50;
                }

                let shared = region_tokens(&db_name)
                    .into_iter()
                    .filter(|t| file_tokens.contains(t))
                    .count();
                score += shared as i32 * 10;

                if best.as_ref().is_none_or(|(s, _)| score > *s) {
                    best = Some((score, serial));
                }
            }
            if let Some((_, serial)) = best {
                return Some(serial);
            }
        }
    }

    None
}

pub fn query_metadata_by_serial(
    conn: &Connection,
    serial: &str,
    rom_name: &str,
) -> Option<GameMetadata> {
    let clean = serial.replace(['-', '_', '.', ' '], "");
    let clean_upper = clean.to_uppercase();
    let upper = serial.to_uppercase();

    let with_hyphen =
        if clean_upper.len() >= 8 && clean_upper[..4].chars().all(|c| c.is_ascii_alphabetic()) {
            format!("{}-{}", &clean_upper[..4], &clean_upper[4..])
        } else {
            clean_upper.clone()
        };

    let hex_clean = clean_upper
        .as_bytes()
        .iter()
        .map(|b| format!("{:02X}", b))
        .collect::<String>();
    let hex_orig = upper
        .as_bytes()
        .iter()
        .map(|b| format!("{:02X}", b))
        .collect::<String>();
    let hex_hyphen = with_hyphen
        .as_bytes()
        .iter()
        .map(|b| format!("{:02X}", b))
        .collect::<String>();

    // Extraer código de cartucho para Nintendo DS, GBA, GBC y GB
    // Prefijos comunes en headers de Nintendo: NTR- (NDS), TWL- (DSi), AGB- (GBA), CGB- (GBC), DMG- (GB)
    let core_code_4 = if (clean_upper.starts_with("NTR")
        || clean_upper.starts_with("TWL")
        || clean_upper.starts_with("AGB")
        || clean_upper.starts_with("CGB")
        || clean_upper.starts_with("DMG"))
        && clean_upper.len() >= 7
    {
        &clean_upper[3..7]
    } else if clean_upper.len() == 4 {
        &clean_upper[..]
    } else {
        ""
    };

    let hex_core_4 = if !core_code_4.is_empty() {
        core_code_4
            .as_bytes()
            .iter()
            .map(|b| format!("{:02X}", b))
            .collect::<String>()
    } else {
        clean_upper.clone()
    };

    let query = "
        SELECT g.display_name, g.release_year, g.release_month,
               d.name, p.name, gn.name, f.name, r.name, rt.name
        FROM games g
        LEFT JOIN developers d ON g.developer_id = d.id
        LEFT JOIN publishers p ON g.publisher_id = p.id
        LEFT JOIN genres gn ON g.genre_id = gn.id
        LEFT JOIN franchises f ON g.franchise_id = f.id
        LEFT JOIN regions r ON g.region_id = r.id
        LEFT JOIN ratings rt ON g.rating_id = rt.id
        WHERE (g.serial_id = ?1
           OR g.serial_id = ?2
           OR g.serial_id = ?3
           OR g.serial_id = ?4
           OR g.serial_id = ?5
           OR g.serial_id = ?6
           OR g.serial_id = ?7
           OR g.serial_id = ?8
           OR g.serial_id = ?9)
          AND g.serial_id != ''
          AND g.serial_id != '216D697373696E67'
          AND g.serial_id != '!missing'
        ORDER BY (g.developer_id IS NOT NULL) DESC, (g.genre_id IS NOT NULL) DESC, (g.publisher_id IS NOT NULL) DESC, g.release_year ASC
        LIMIT 1
    ";

    let c1 = serial;
    let c2 = if clean.is_empty() {
        "__NO_MATCH__"
    } else {
        &clean
    };
    let c3 = if clean_upper.is_empty() {
        "__NO_MATCH__"
    } else {
        &clean_upper
    };
    let c4 = if with_hyphen.is_empty() {
        "__NO_MATCH__"
    } else {
        &with_hyphen
    };
    let c5 = if hex_clean.is_empty() {
        "__NO_MATCH__"
    } else {
        &hex_clean
    };
    let c6 = if hex_orig.is_empty() {
        "__NO_MATCH__"
    } else {
        &hex_orig
    };
    let c7 = if hex_hyphen.is_empty() {
        "__NO_MATCH__"
    } else {
        &hex_hyphen
    };
    let c8 = if hex_core_4.is_empty() {
        "__NO_MATCH__"
    } else {
        &hex_core_4
    };
    let c9 = if core_code_4.is_empty() {
        "__NO_MATCH__"
    } else {
        core_code_4
    };

    let meta = conn
        .query_row(
            query,
            rusqlite::params![c1, c2, c3, c4, c5, c6, c7, c8, c9],
            |row| {
                Ok(GameMetadata {
                    display_name: row.get(0)?,
                    release_year: row.get(1)?,
                    release_month: row.get(2)?,
                    developer: row.get(3)?,
                    publisher: row.get(4)?,
                    genre: row.get(5)?,
                    franchise: row.get(6)?,
                    region: row.get(7)?,
                    rating: row.get(8)?,
                })
            },
        )
        .ok()?;

    if !rom_name.is_empty() {
        let base_rom = base_title(rom_name);
        let base_clean = base_rom.trim();
        let d_name = meta.display_name.as_deref().unwrap_or("");
        if !base_clean.is_empty()
            && base_clean != "eboot"
            && base_clean != "boot"
            && base_clean != "default"
            && !plausible_match(rom_name, d_name)
        {
            return None;
        }
    }
    Some(meta)
}

fn metadata_completeness(meta: &GameMetadata) -> (usize, i32) {
    let mut count = 0;
    if meta.developer.is_some() {
        count += 1;
    }
    if meta.publisher.is_some() {
        count += 1;
    }
    if meta.genre.is_some() {
        count += 1;
    }
    if meta.release_year.is_some() {
        count += 1;
    }
    if meta.rating.is_some() {
        count += 1;
    }
    let year = meta.release_year.unwrap_or(9999);
    (count, year)
}

pub fn query_game_metadata_comprehensive(
    conn: &Connection,
    rom_name: &str,
    platform: &str,
    rom_path: &Path,
) -> Option<GameMetadata> {
    // 1. Intentar por serial si existe en roms table
    if let Some(serial) = find_rom_serial(conn, rom_name, rom_path) {
        if let Some(meta) = query_metadata_by_serial(conn, &serial, rom_name) {
            if meta.genre.is_some() || meta.release_year.is_some() || meta.developer.is_some() {
                return Some(meta);
            }
        }
    }

    let file_base = base_title(rom_name);
    if file_base == "eboot" || file_base == "boot" || file_base == "default" || file_base.is_empty()
    {
        return None;
    }
    let canon_base = canonical_title(rom_name);
    let file_sequel = sequel_number(&file_base);
    let expected_db_plat = db_platform_name(platform);

    let like_base = format!("%{}%", file_base);
    let like_canon = format!("%{}%", canon_base);
    let like_inverted = format!("%{}, the%", canon_base);
    let like_no_the = if let Some(s) = file_base.strip_prefix("the ") {
        format!("%{}%", s.trim())
    } else {
        like_base.clone()
    };

    let mut direct_plat_meta: Option<GameMetadata> = None;

    // 2. Búsqueda directa en tabla `games` para la misma plataforma
    if let Some(plat_name) = expected_db_plat {
        let query_plat = "
            SELECT g.display_name, g.release_year, g.release_month,
                   d.name, p.name, gn.name, f.name, r.name, rt.name
            FROM games g
            JOIN platforms plat ON g.platform_id = plat.id
            LEFT JOIN developers d ON g.developer_id = d.id
            LEFT JOIN publishers p ON g.publisher_id = p.id
            LEFT JOIN genres gn ON g.genre_id = gn.id
            LEFT JOIN franchises f ON g.franchise_id = f.id
            LEFT JOIN regions r ON g.region_id = r.id
            LEFT JOIN ratings rt ON g.rating_id = rt.id
            WHERE (plat.name = ?1 OR plat.name LIKE ?2)
              AND (
                   g.display_name LIKE ?3
                OR g.display_name LIKE ?4
                OR g.display_name LIKE ?5
                OR g.display_name LIKE ?6
              )
            ORDER BY (g.developer_id IS NOT NULL) DESC, (g.genre_id IS NOT NULL) DESC, (g.release_year IS NOT NULL) DESC, g.id ASC
            LIMIT 100
        ";
        let like_plat = format!("{}%", plat_name);
        if let Ok(mut stmt) = conn.prepare(query_plat) {
            if let Ok(rows) = stmt.query_map(
                rusqlite::params![
                    plat_name,
                    like_plat,
                    like_base,
                    like_canon,
                    like_no_the,
                    like_inverted
                ],
                |row| {
                    Ok(GameMetadata {
                        display_name: row.get(0)?,
                        release_year: row.get(1)?,
                        release_month: row.get(2)?,
                        developer: row.get(3)?,
                        publisher: row.get(4)?,
                        genre: row.get(5)?,
                        franchise: row.get(6)?,
                        region: row.get(7)?,
                        rating: row.get(8)?,
                    })
                },
            ) {
                let mut best: Option<(i32, GameMetadata)> = None;
                for meta in rows.flatten() {
                    let dname = meta.display_name.as_deref().unwrap_or("");
                    let db_base = base_title(dname);
                    let db_canon = canonical_title(dname);
                    let db_sequel = sequel_number(&db_base);
                    if file_sequel != db_sequel {
                        continue;
                    }
                    if !plausible_match(rom_name, dname) {
                        continue;
                    }
                    let mut title_score = 0;
                    if canon_base == db_canon {
                        title_score = 250;
                    } else if file_base == db_base {
                        title_score = 200;
                    } else if (db_base.starts_with(&file_base)
                        || file_base.starts_with(&db_base)
                        || db_canon.starts_with(&canon_base)
                        || canon_base.starts_with(&db_canon))
                        && canon_base.len() >= 4
                        && db_canon.len() >= 4
                    {
                        title_score = 50;
                    }

                    // Se exige coincidencia de título positiva obligatoria:
                    // los metadatos por sí solos nunca pueden validar un juego que no tenga coincidencia de título.
                    if title_score == 0 {
                        continue;
                    }

                    let mut score = title_score;
                    if meta.developer.is_some() {
                        score += 40;
                    }
                    if meta.genre.is_some() {
                        score += 30;
                    }
                    if meta.publisher.is_some() {
                        score += 20;
                    }
                    if meta.release_year.is_some() {
                        score += 10;
                    }

                    let is_better = match &best {
                        None => true,
                        Some((best_score, best_meta)) => {
                            if score > *best_score {
                                true
                            } else if score == *best_score {
                                let (c_count, c_year) = metadata_completeness(&meta);
                                let (b_count, b_year) = metadata_completeness(best_meta);
                                if c_count > b_count {
                                    true
                                } else {
                                    c_count == b_count && c_year < b_year
                                }
                            } else {
                                false
                            }
                        }
                    };
                    if is_better {
                        best = Some((score, meta));
                    }
                }
                if let Some((score, meta)) = best {
                    // Si la coincidencia tiene score alto y ya tiene género O desarrollador O año, es suficiente y retornamos
                    if score >= 100
                        && (meta.genre.is_some()
                            || meta.developer.is_some()
                            || meta.release_year.is_some())
                    {
                        return Some(meta);
                    }
                    // Si el score es muy alto (>= 200 coincidencia exacta) pero carece de metadatos descriptivos,
                    // guardamos esta meta para fusionar con lo que encuentre la búsqueda cruzada
                    direct_plat_meta = Some(meta);
                }
            }
        }
    }

    // 3. Búsqueda cruzada en tabla `games` por nombre
    let query_cross = "
        SELECT g.display_name, g.release_year, g.release_month,
               d.name, p.name, gn.name, f.name, r.name, rt.name
        FROM games g
        LEFT JOIN developers d ON g.developer_id = d.id
        LEFT JOIN publishers p ON g.publisher_id = p.id
        LEFT JOIN genres gn ON g.genre_id = gn.id
        LEFT JOIN franchises f ON g.franchise_id = f.id
        LEFT JOIN regions r ON g.region_id = r.id
        LEFT JOIN ratings rt ON g.rating_id = rt.id
        WHERE (
               g.display_name LIKE ?1
            OR g.display_name LIKE ?2
            OR g.display_name LIKE ?3
            OR g.display_name LIKE ?4
        )
        ORDER BY (g.developer_id IS NOT NULL) DESC, (g.genre_id IS NOT NULL) DESC, (g.release_year IS NOT NULL) DESC, g.id ASC
        LIMIT 100
    ";
    if let Ok(mut stmt) = conn.prepare(query_cross) {
        if let Ok(rows) = stmt.query_map(
            rusqlite::params![like_base, like_canon, like_no_the, like_inverted],
            |row| {
                Ok(GameMetadata {
                    display_name: row.get(0)?,
                    release_year: row.get(1)?,
                    release_month: row.get(2)?,
                    developer: row.get(3)?,
                    publisher: row.get(4)?,
                    genre: row.get(5)?,
                    franchise: row.get(6)?,
                    region: row.get(7)?,
                    rating: row.get(8)?,
                })
            },
        ) {
            let mut best: Option<(i32, GameMetadata)> = None;
            for meta in rows.flatten() {
                let dname = meta.display_name.as_deref().unwrap_or("");
                let db_base = base_title(dname);
                let db_canon = canonical_title(dname);
                let db_sequel = sequel_number(&db_base);
                if file_sequel != db_sequel {
                    continue;
                }
                if !plausible_match(rom_name, dname) {
                    continue;
                }
                let mut title_score = 0;
                if canon_base == db_canon {
                    title_score = 250;
                } else if file_base == db_base {
                    title_score = 200;
                }

                // En búsqueda cruzada entre plataformas distintas, EXIGIMOS alta certeza en el título (canon o base exacto).
                // No se permiten coincidencias débiles por prefijo para evitar que juegos de otras consolas contaminen los tags.
                if title_score < 200 {
                    continue;
                }

                let mut score = title_score;
                if meta.developer.is_some() {
                    score += 40;
                }
                if meta.genre.is_some() {
                    score += 30;
                }
                if meta.publisher.is_some() {
                    score += 20;
                }
                if meta.release_year.is_some() {
                    score += 10;
                }

                let is_better = match &best {
                    None => true,
                    Some((best_score, best_meta)) => {
                        if score > *best_score {
                            true
                        } else if score == *best_score {
                            let (c_count, c_year) = metadata_completeness(&meta);
                            let (b_count, b_year) = metadata_completeness(best_meta);
                            if c_count > b_count {
                                true
                            } else {
                                c_count == b_count && c_year < b_year
                            }
                        } else {
                            false
                        }
                    }
                };
                if is_better {
                    best = Some((score, meta));
                }
            }
            if let Some((score, cross_meta)) = best {
                if score >= 100 {
                    if let Some(mut direct) = direct_plat_meta {
                        // Conservar nombre y región del direct match, pero enriquecer metadatos descriptivos
                        if direct.genre.is_none() {
                            direct.genre = cross_meta.genre;
                        }
                        if direct.developer.is_none() {
                            direct.developer = cross_meta.developer;
                        }
                        if direct.publisher.is_none() {
                            direct.publisher = cross_meta.publisher;
                        }
                        if direct.release_year.is_none() {
                            direct.release_year = cross_meta.release_year;
                        }
                        if direct.franchise.is_none() {
                            direct.franchise = cross_meta.franchise;
                        }
                        if direct.rating.is_none() {
                            direct.rating = cross_meta.rating;
                        }
                        return Some(direct);
                    }
                    return Some(cross_meta);
                }
            }
        }
    }

    direct_plat_meta
}

static HTTP_CLIENT: LazyLock<reqwest::blocking::Client> = LazyLock::new(|| {
    reqwest::blocking::Client::builder()
        .user_agent("gameFlix/1.0 (Windows)")
        .timeout(std::time::Duration::from_secs(4))
        .build()
        .unwrap_or_default()
});

pub fn download_file(url: &str, dest: &Path) -> Result<(), String> {
    let resp = HTTP_CLIENT.get(url).send().map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("HTTP error {}", resp.status()));
    }
    let bytes = resp.bytes().map_err(|e| e.to_string())?;
    let mut file = fs::File::create(dest).map_err(|e| e.to_string())?;
    file.write_all(&bytes).map_err(|e| e.to_string())?;
    Ok(())
}
