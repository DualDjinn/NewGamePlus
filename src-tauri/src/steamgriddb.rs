use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SGDBAuthor {
    pub name: Option<String>,
    pub avatar: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SGDBHero {
    pub id: u64,
    pub url: String,
    pub thumb: String,
    pub width: u32,
    pub height: u32,
    pub style: Option<String>,
    pub author: Option<SGDBAuthor>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SGDBLogo {
    pub id: u64,
    pub url: String,
    pub thumb: String,
    pub width: u32,
    pub height: u32,
    pub style: Option<String>,
    pub language: Option<String>,
    pub author: Option<SGDBAuthor>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SGDBGameCandidate {
    pub id: u64,
    pub name: String,
    pub release_date: Option<i64>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SGDBGrid {
    pub id: u64,
    pub url: String,
    pub thumb: String,
    pub width: u32,
    pub height: u32,
    pub score: Option<i32>,
    pub author: Option<SGDBAuthor>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FixMatchCandidate {
    pub id: u64,
    pub name: String,
    pub release_year: Option<i32>,
    pub cover_thumb: Option<String>,
    pub cover_url: Option<String>,
    #[serde(default)]
    pub genre: Option<String>,
    #[serde(default)]
    pub developer: Option<String>,
    #[serde(default)]
    pub publisher: Option<String>,
    #[serde(default)]
    pub platform: Option<String>,
    #[serde(default)]
    pub region: Option<String>,
}

pub fn timestamp_to_year(ts: i64) -> Option<i32> {
    if ts <= 0 {
        return None;
    }
    let mut days = ts / 86400;
    let mut year = 1970;
    loop {
        let is_leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
        let year_days = if is_leap { 366 } else { 365 };
        if days < year_days {
            break;
        }
        days -= year_days;
        year += 1;
    }
    Some(year)
}

fn client_with_auth(_api_key: &str) -> Result<reqwest::blocking::Client, String> {
    let client = reqwest::blocking::Client::builder()
        .user_agent("gameFlix/1.0 (Windows)")
        .build()
        .map_err(|e| e.to_string())?;
    Ok(client)
}

pub fn validate_api_key(api_key: &str) -> Result<bool, String> {
    if api_key.trim().is_empty() {
        return Ok(false);
    }
    let client = client_with_auth(api_key)?;
    let resp = client
        .get("https://www.steamgriddb.com/api/v2/games/id/1")
        .header("Authorization", format!("Bearer {}", api_key.trim()))
        .send()
        .map_err(|e| e.to_string())?;

    if resp.status().is_success() {
        #[derive(Deserialize)]
        struct Resp {
            success: bool,
        }
        if let Ok(data) = resp.json::<Resp>() {
            return Ok(data.success);
        }
    }
    Ok(false)
}

pub fn search_game_candidates(api_key: &str, term: &str) -> Result<Vec<SGDBGameCandidate>, String> {
    let client = client_with_auth(api_key)?;
    let clean_term = term.trim();
    if clean_term.is_empty() {
        return Ok(Vec::new());
    }

    let url = format!(
        "https://www.steamgriddb.com/api/v2/search/autocomplete/{}",
        urlencoding::encode(clean_term)
    );

    let resp = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key.trim()))
        .send()
        .map_err(|e| format!("Error en petición a SteamGridDB: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!(
            "SteamGridDB respondió con código {}",
            resp.status()
        ));
    }

    #[derive(Deserialize)]
    struct CandidateRaw {
        id: u64,
        name: String,
        release_date: Option<i64>,
    }

    #[derive(Deserialize)]
    struct Resp {
        success: bool,
        data: Option<Vec<CandidateRaw>>,
    }

    let parsed: Resp = resp
        .json()
        .map_err(|e| format!("Error parseando candidatos: {}", e))?;
    if !parsed.success {
        return Ok(Vec::new());
    }

    let candidates = parsed
        .data
        .unwrap_or_default()
        .into_iter()
        .map(|c| SGDBGameCandidate {
            id: c.id,
            name: c.name,
            release_date: c.release_date,
        })
        .collect();

    Ok(candidates)
}

pub fn get_heroes_for_game(api_key: &str, game_id: u64) -> Result<Vec<SGDBHero>, String> {
    let client = client_with_auth(api_key)?;
    let url = format!("https://www.steamgriddb.com/api/v2/heroes/game/{}", game_id);

    let resp = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key.trim()))
        .send()
        .map_err(|e| format!("Error en petición de heroes a SteamGridDB: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!(
            "SteamGridDB respondió con código {}",
            resp.status()
        ));
    }

    #[derive(Deserialize)]
    struct AuthorRaw {
        name: Option<String>,
        avatar: Option<String>,
    }

    #[derive(Deserialize)]
    struct HeroRaw {
        id: u64,
        url: String,
        thumb: String,
        width: u32,
        height: u32,
        style: Option<String>,
        author: Option<AuthorRaw>,
    }

    #[derive(Deserialize)]
    struct Resp {
        success: bool,
        data: Option<Vec<HeroRaw>>,
    }

    let parsed: Resp = resp
        .json()
        .map_err(|e| format!("Error parseando heroes: {}", e))?;
    if !parsed.success {
        return Ok(Vec::new());
    }

    let heroes = parsed
        .data
        .unwrap_or_default()
        .into_iter()
        .map(|h| SGDBHero {
            id: h.id,
            url: h.url,
            thumb: h.thumb,
            width: h.width,
            height: h.height,
            style: h.style,
            author: h.author.map(|a| SGDBAuthor {
                name: a.name,
                avatar: a.avatar,
            }),
        })
        .collect();

    Ok(heroes)
}

pub fn search_heroes(api_key: &str, query: &str) -> Result<Vec<SGDBHero>, String> {
    // 1. Limpiar nombre quitando paréntesis y tags
    let cleaned = query
        .split('(')
        .next()
        .unwrap_or(query)
        .split('[')
        .next()
        .unwrap_or(query)
        .trim();

    let candidates = search_game_candidates(api_key, cleaned)?;
    if candidates.is_empty() {
        // Intento secundario con query original
        let fallback_candidates = search_game_candidates(api_key, query)?;
        if fallback_candidates.is_empty() {
            return Ok(Vec::new());
        }
        return get_heroes_for_game(api_key, fallback_candidates[0].id);
    }

    // Buscar heroes para el primer candidato con resultados
    for candidate in &candidates {
        if let Ok(heroes) = get_heroes_for_game(api_key, candidate.id) {
            if !heroes.is_empty() {
                return Ok(heroes);
            }
        }
    }

    Ok(Vec::new())
}

pub fn download_hero(hero_url: &str, dest_path: &Path) -> Result<(), String> {
    let client = reqwest::blocking::Client::builder()
        .user_agent("gameFlix/1.0 (Windows)")
        .timeout(std::time::Duration::from_secs(12))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(hero_url)
        .send()
        .map_err(|e| format!("Error en petición HTTP: {}", e))?;
    if !resp.status().is_success() {
        return Err(format!(
            "Error descargando imagen (código status: {})",
            resp.status()
        ));
    }

    if let Some(parent) = dest_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let bytes = resp
        .bytes()
        .map_err(|e| format!("Error leyendo bytes de imagen: {}", e))?;

    // Atomic write to avoid Windows file sharing/locking issues
    let temp_path = dest_path.with_extension("tmp.png");
    let mut file = fs::File::create(&temp_path)
        .map_err(|e| format!("Error creando archivo temporal: {}", e))?;
    file.write_all(&bytes)
        .map_err(|e| format!("Error escribiendo imagen: {}", e))?;
    file.flush()
        .map_err(|e| format!("Error guardando imagen: {}", e))?;
    drop(file);

    if dest_path.exists() {
        let _ = fs::remove_file(dest_path);
    }
    fs::rename(&temp_path, dest_path)
        .map_err(|e| format!("Error finalizando imagen de hero: {}", e))?;

    Ok(())
}

pub fn get_heroes_dir(data_dir: &Path) -> PathBuf {
    let dir = data_dir.join("heroes");
    let _ = fs::create_dir_all(&dir);
    dir
}

pub fn get_logos_for_game(api_key: &str, game_id: u64) -> Result<Vec<SGDBLogo>, String> {
    let client = client_with_auth(api_key)?;
    let url = format!("https://www.steamgriddb.com/api/v2/logos/game/{}", game_id);

    let resp = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key.trim()))
        .send()
        .map_err(|e| format!("Error en petición de logos a SteamGridDB: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!(
            "SteamGridDB respondió con código {}",
            resp.status()
        ));
    }

    #[derive(Deserialize)]
    struct AuthorRaw {
        name: Option<String>,
        avatar: Option<String>,
    }

    #[derive(Deserialize)]
    struct LogoRaw {
        id: u64,
        url: String,
        thumb: String,
        width: u32,
        height: u32,
        style: Option<String>,
        language: Option<String>,
        author: Option<AuthorRaw>,
    }

    #[derive(Deserialize)]
    struct Resp {
        success: bool,
        data: Option<Vec<LogoRaw>>,
    }

    let parsed: Resp = resp
        .json()
        .map_err(|e| format!("Error parseando logos: {}", e))?;
    if !parsed.success {
        return Ok(Vec::new());
    }

    let logos = parsed
        .data
        .unwrap_or_default()
        .into_iter()
        .map(|l| SGDBLogo {
            id: l.id,
            url: l.url,
            thumb: l.thumb,
            width: l.width,
            height: l.height,
            style: l.style,
            language: l.language,
            author: l.author.map(|a| SGDBAuthor {
                name: a.name,
                avatar: a.avatar,
            }),
        })
        .collect();

    Ok(logos)
}

pub fn search_logos(api_key: &str, query: &str) -> Result<Vec<SGDBLogo>, String> {
    let cleaned = query
        .split('(')
        .next()
        .unwrap_or(query)
        .split('[')
        .next()
        .unwrap_or(query)
        .trim();

    let candidates = search_game_candidates(api_key, cleaned)?;
    if candidates.is_empty() {
        let fallback_candidates = search_game_candidates(api_key, query)?;
        if fallback_candidates.is_empty() {
            return Ok(Vec::new());
        }
        return get_logos_for_game(api_key, fallback_candidates[0].id);
    }

    for candidate in &candidates {
        if let Ok(logos) = get_logos_for_game(api_key, candidate.id) {
            if !logos.is_empty() {
                return Ok(logos);
            }
        }
    }

    Ok(Vec::new())
}

pub fn download_logo(logo_url: &str, dest_path: &Path) -> Result<(), String> {
    let client = reqwest::blocking::Client::builder()
        .user_agent("gameFlix/1.0 (Windows)")
        .timeout(std::time::Duration::from_secs(12))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(logo_url)
        .send()
        .map_err(|e| format!("Error en petición HTTP: {}", e))?;
    if !resp.status().is_success() {
        return Err(format!(
            "Error descargando logo (código status: {})",
            resp.status()
        ));
    }

    if let Some(parent) = dest_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let bytes = resp
        .bytes()
        .map_err(|e| format!("Error leyendo bytes de logo: {}", e))?;

    let temp_path = dest_path.with_extension("tmp.png");
    let mut file = fs::File::create(&temp_path)
        .map_err(|e| format!("Error creando archivo temporal: {}", e))?;
    file.write_all(&bytes)
        .map_err(|e| format!("Error escribiendo logo: {}", e))?;
    file.flush()
        .map_err(|e| format!("Error guardando logo: {}", e))?;
    drop(file);

    if dest_path.exists() {
        let _ = fs::remove_file(dest_path);
    }
    fs::rename(&temp_path, dest_path)
        .map_err(|e| format!("Error finalizando imagen de logo: {}", e))?;

    Ok(())
}

pub fn get_logos_dir(data_dir: &Path) -> PathBuf {
    let dir = data_dir.join("logos");
    let _ = fs::create_dir_all(&dir);
    dir
}

pub fn fetch_steamgrid_logo(api_key: &str, game_name: &str, dest_path: &Path) -> Option<String> {
    let key = api_key.trim();
    if key.is_empty() {
        return None;
    }
    if dest_path.exists() {
        return Some(dest_path.to_string_lossy().to_string());
    }

    let logos = search_logos(key, game_name).ok()?;
    let first = logos.into_iter().next()?;
    if download_logo(&first.url, dest_path).is_ok() {
        Some(dest_path.to_string_lossy().to_string())
    } else {
        None
    }
}

pub fn get_grids_for_game(api_key: &str, game_id: u64) -> Result<Vec<SGDBGrid>, String> {
    let client = client_with_auth(api_key)?;
    let url = format!(
        "https://www.steamgriddb.com/api/v2/grids/game/{}?dimensions=600x900",
        game_id
    );

    let resp = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key.trim()))
        .send()
        .map_err(|e| format!("Error en petición de grids a SteamGridDB: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!(
            "SteamGridDB respondió con código {}",
            resp.status()
        ));
    }

    #[derive(Deserialize)]
    struct AuthorRaw {
        name: Option<String>,
        avatar: Option<String>,
    }

    #[derive(Deserialize)]
    struct GridRaw {
        id: u64,
        url: String,
        thumb: String,
        width: u32,
        height: u32,
        score: Option<i32>,
        author: Option<AuthorRaw>,
    }

    #[derive(Deserialize)]
    struct Resp {
        success: bool,
        data: Option<Vec<GridRaw>>,
    }

    let parsed: Resp = resp
        .json()
        .map_err(|e| format!("Error parseando grids: {}", e))?;
    if !parsed.success {
        return Ok(Vec::new());
    }

    let grids = parsed
        .data
        .unwrap_or_default()
        .into_iter()
        .map(|g| SGDBGrid {
            id: g.id,
            url: g.url,
            thumb: g.thumb,
            width: g.width,
            height: g.height,
            score: g.score,
            author: g.author.map(|a| SGDBAuthor {
                name: a.name,
                avatar: a.avatar,
            }),
        })
        .collect();

    Ok(grids)
}

pub fn search_fix_match_candidates(
    api_key: &str,
    title: &str,
    year: Option<i32>,
) -> Result<Vec<FixMatchCandidate>, String> {
    let mut candidates = search_game_candidates(api_key, title)?;
    if candidates.is_empty() {
        let cleaned = title
            .split('(')
            .next()
            .unwrap_or(title)
            .split('[')
            .next()
            .unwrap_or(title)
            .trim();
        if cleaned != title && !cleaned.is_empty() {
            candidates = search_game_candidates(api_key, cleaned)?;
        }
    }

    let mut results: Vec<FixMatchCandidate> = Vec::new();
    for c in candidates.into_iter().take(8) {
        let rel_year = c.release_date.and_then(timestamp_to_year);
        let mut cover_thumb = None;
        let mut cover_url = None;

        if let Ok(grids) = get_grids_for_game(api_key, c.id) {
            if let Some(best) = grids.into_iter().next() {
                cover_thumb = Some(best.thumb);
                cover_url = Some(best.url);
            }
        }

        results.push(FixMatchCandidate {
            id: c.id,
            name: c.name,
            release_year: rel_year,
            cover_thumb,
            cover_url,
            genre: None,
            developer: None,
            publisher: None,
            platform: None,
            region: None,
        });
    }

    if let Some(target_year) = year {
        results.sort_by_key(|c| {
            if let Some(y) = c.release_year {
                (y - target_year).abs()
            } else {
                999
            }
        });
    }

    Ok(results)
}

pub fn download_cover(cover_url: &str, dest_path: &Path) -> Result<(), String> {
    let client = reqwest::blocking::Client::builder()
        .user_agent("gameFlix/1.0 (Windows)")
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(cover_url)
        .send()
        .map_err(|e| format!("Error en petición HTTP: {}", e))?;
    if !resp.status().is_success() {
        return Err(format!(
            "Error descargando carátula (código status: {})",
            resp.status()
        ));
    }

    if let Some(parent) = dest_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let bytes = resp
        .bytes()
        .map_err(|e| format!("Error leyendo bytes de carátula: {}", e))?;

    let temp_path = dest_path.with_extension("tmp.png");
    let mut file = fs::File::create(&temp_path)
        .map_err(|e| format!("Error creando archivo temporal: {}", e))?;
    file.write_all(&bytes)
        .map_err(|e| format!("Error escribiendo carátula: {}", e))?;
    file.flush()
        .map_err(|e| format!("Error guardando carátula: {}", e))?;
    drop(file);

    if dest_path.exists() {
        let _ = fs::remove_file(dest_path);
    }
    fs::rename(&temp_path, dest_path).map_err(|e| format!("Error finalizando carátula: {}", e))?;

    Ok(())
}
