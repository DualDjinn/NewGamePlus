use regex::Regex;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};

/// Información sobre un archivo que es parte de un juego multidisco
#[derive(Debug, Clone)]
pub struct DiscFileInfo {
    pub path: PathBuf,
    pub file_name: String,
    pub disc_number: u32,
    pub base_title: String,
}

/// Intenta extraer el número de disco y título base de un archivo de ROM de disco (cue, chd, iso, etc.)
pub fn parse_disc_info(file_path: &Path) -> Option<DiscFileInfo> {
    let file_name = file_path.file_name()?.to_str()?.to_string();
    let stem = file_path.file_stem()?.to_str()?;

    // Regex para detectar patrones de disco como [CD1], (Disc 2), (Disk 3), - CD 4, etc.
    let re_disc =
        Regex::new(r"(?i)(?:^|[\s_\-\(\[])(?:disc|disk|cd|disco)\s*0*([0-9]+)(?:[\s_\-\)\]]|$)")
            .ok()?;
    let caps = re_disc.captures(stem)?;
    let disc_num: u32 = caps.get(1)?.as_str().parse().ok()?;

    // Limpiar el título base quitando la etiqueta de disco y cualquier serial específico de disco (e.g. [SLUS-xxxxx])
    let mut base_clean = re_disc.replace_all(stem, " ").to_string();

    // Quitar seriales específicos como [SLUS-01041], [SCES-03047] que varían entre discos
    if let Ok(re_serial) = Regex::new(r"(?i)\[\s*S[A-Z]{3}[-_]\d+\s*\]") {
        base_clean = re_serial.replace_all(&base_clean, " ").to_string();
    }
    // Quitar etiquetas comunes iniciales como (PS1) o [PS1]
    if let Ok(re_tag) =
        Regex::new(r"(?i)^\s*[\(\[]\s*(?:ps[1-3]|playstation(?:\s*[1-3])?)\s*[\)\]]\s*")
    {
        base_clean = re_tag.replace_all(&base_clean, " ").to_string();
    }

    // Limpieza de corchetes/paréntesis vacíos o sobrantes y espacios redundantes
    let base_clean = base_clean
        .replace("[]", "")
        .replace("()", "")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .trim_matches(|c| c == '-' || c == '_' || c == ' ')
        .trim()
        .to_string();

    if base_clean.is_empty() {
        return None;
    }

    Some(DiscFileInfo {
        path: file_path.to_path_buf(),
        file_name,
        disc_number: disc_num,
        base_title: base_clean,
    })
}

/// Procesa un directorio para detectar juegos multidisco, generar playlists .m3u si no existen
/// y retornar el conjunto de rutas de archivos individuales que deben ocultarse/ignorarse
pub fn process_multidisc_games(dir: &Path) -> HashSet<PathBuf> {
    let mut ignored_files = HashSet::new();

    // 1. Primero revisar si ya existen archivos .m3u en este directorio
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_file()
                && p.extension()
                    .map_or(false, |ext| ext.eq_ignore_ascii_case("m3u"))
            {
                // Leer las líneas del m3u para ignorar los archivos que referencia
                if let Ok(content) = fs::read_to_string(&p) {
                    for line in content.lines() {
                        let line_trimmed = line.trim();
                        if !line_trimmed.is_empty() && !line_trimmed.starts_with('#') {
                            let target_file = dir.join(line_trimmed);
                            ignored_files.insert(target_file);
                        }
                    }
                }
            }
        }
    }

    // 2. Buscar archivos con extensiones de disco (cue, chd, iso, pbp, etc.)
    let valid_disc_exts = ["cue", "chd", "iso", "pbp", "gcm"];
    let mut disc_candidates: Vec<DiscFileInfo> = Vec::new();

    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if !p.is_file() {
                continue;
            }
            let ext = p
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();
            if !valid_disc_exts.contains(&ext.as_str()) {
                continue;
            }
            // Si ya está ignorado por un .m3u preexistente, saltar
            if ignored_files.contains(&p) {
                continue;
            }
            if let Some(info) = parse_disc_info(&p) {
                disc_candidates.push(info);
            }
        }
    }

    if disc_candidates.is_empty() {
        return ignored_files;
    }

    // 3. Agrupar candidatos por título base
    let folder_name = dir
        .file_name()
        .and_then(|f| f.to_str())
        .unwrap_or("")
        .to_string();
    let is_generic_folder = folder_name.eq_ignore_ascii_case("ps1")
        || folder_name.eq_ignore_ascii_case("ps2")
        || folder_name.eq_ignore_ascii_case("roms")
        || folder_name.eq_ignore_ascii_case("games");

    let mut groups: HashMap<String, Vec<DiscFileInfo>> = HashMap::new();

    // Si la carpeta contiene varios discos y no es una carpeta raíz genérica,
    // y todos los discos comparten o parecen pertenecer a la carpeta:
    if !is_generic_folder && disc_candidates.len() >= 2 {
        // Limpiar el nombre de la carpeta de indicadores como [CD1-CD4], [CD1-4], seriales o (PS1)
        let mut clean_folder = folder_name.clone();
        if let Ok(re_cd_range) = Regex::new(r"(?i)\s*\[\s*(?:cd|disc|disk)\s*[\d\s\-_]+\s*\]\s*") {
            clean_folder = re_cd_range.replace_all(&clean_folder, " ").to_string();
        }
        if let Ok(re_serial) = Regex::new(r"(?i)\[\s*S[A-Z]{3}[-_]\d+\s*\]") {
            clean_folder = re_serial.replace_all(&clean_folder, " ").to_string();
        }
        if let Ok(re_tag) =
            Regex::new(r"(?i)^\s*[\(\[]\s*(?:ps[1-3]|playstation(?:\s*[1-3])?)\s*[\)\]]\s*")
        {
            clean_folder = re_tag.replace_all(&clean_folder, " ").to_string();
        }
        let clean_folder = clean_folder
            .replace("[]", "")
            .replace("()", "")
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" ")
            .trim()
            .to_string();

        let key = if !clean_folder.is_empty() {
            clean_folder
        } else {
            disc_candidates[0].base_title.clone()
        };

        for disc in disc_candidates {
            groups.entry(key.clone()).or_default().push(disc);
        }
    } else {
        for disc in disc_candidates {
            groups
                .entry(disc.base_title.clone())
                .or_default()
                .push(disc);
        }
    }

    // 4. Crear archivos .m3u para cada grupo con 2 o más discos
    for (m3u_title, mut discs) in groups {
        if discs.len() < 2 {
            continue;
        }

        // Ordenar discos por número de disco
        discs.sort_by_key(|d| d.disc_number);

        let m3u_path = dir.join(format!("{}.m3u", m3u_title));

        if !m3u_path.exists() {
            let m3u_content = discs
                .iter()
                .map(|d| d.file_name.as_str())
                .collect::<Vec<_>>()
                .join("\n");

            if let Err(e) = fs::write(&m3u_path, m3u_content) {
                eprintln!("Error creando playlist m3u {}: {}", m3u_path.display(), e);
            }
        }

        // Marcar todos los archivos de discos individuales para ser ignorados por el escáner
        for disc in discs {
            ignored_files.insert(disc.path);
        }
    }

    ignored_files
}
