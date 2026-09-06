use serde::Deserialize;
use std::fs;
use std::io::Write;
use std::path::Path;

#[allow(dead_code)]
#[derive(Deserialize, Debug)]
struct GridItem {
    id: u64,
    url: String,
    thumb: String,
    width: u32,
    height: u32,
}

#[allow(dead_code)]
#[derive(Deserialize, Debug)]
struct GridResp {
    success: bool,
    data: Option<Vec<GridItem>>,
}

/// Busca y descarga la mejor carátula vertical (Grid 600x900) desde SteamGridDB
pub fn fetch_steamgrid_boxart(api_key: &str, game_name: &str, dest_path: &Path) -> Option<String> {
    let key = api_key.trim();
    if key.is_empty() {
        return None;
    }

    // 1. Buscar el game_id por nombre en SteamGridDB
    let search_url = format!(
        "https://www.steamgriddb.com/api/v2/search/autocomplete/{}",
        urlencoding::encode(game_name.trim())
    );

    let client = reqwest::blocking::Client::builder()
        .user_agent("gameFlix/1.0 (Windows)")
        .timeout(std::time::Duration::from_secs(4))
        .build()
        .ok()?;

    let search_resp = client
        .get(&search_url)
        .header("Authorization", format!("Bearer {}", key))
        .send()
        .ok()?;

    if !search_resp.status().is_success() {
        return None;
    }

    #[allow(dead_code)]
    #[derive(Deserialize)]
    struct Candidate {
        id: u64,
    }
    #[allow(dead_code)]
    #[derive(Deserialize)]
    struct SearchResp {
        success: bool,
        data: Option<Vec<Candidate>>,
    }

    let search_data: SearchResp = search_resp.json().ok()?;
    let game_id = search_data.data?.into_iter().next()?.id;

    // 2. Obtener grids verticales de dimensión 600x900 (ratio 2:3 estándar para boxart)
    let grid_url = format!(
        "https://www.steamgriddb.com/api/v2/grids/game/{}?dimensions=600x900",
        game_id
    );

    let grid_resp = client
        .get(&grid_url)
        .header("Authorization", format!("Bearer {}", key))
        .send()
        .ok()?;

    if !grid_resp.status().is_success() {
        return None;
    }

    let grid_data: GridResp = grid_resp.json().ok()?;
    let grids = grid_data.data?;
    let best_grid = grids.into_iter().next()?;

    // 3. Descargar la imagen
    let img_resp = client.get(&best_grid.url).send().ok()?;
    if !img_resp.status().is_success() {
        return None;
    }

    let bytes = img_resp.bytes().ok()?;
    let temp_dest = dest_path.with_extension("tmp.png");
    if let Ok(mut f) = fs::File::create(&temp_dest) {
        if f.write_all(&bytes).is_ok() {
            let _ = fs::rename(&temp_dest, dest_path);
            return Some(dest_path.to_string_lossy().to_string());
        }
    }
    let _ = fs::remove_file(&temp_dest);

    None
}
