use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Game {
    pub id: String,
    pub name: String,
    pub platform: String,
    pub rom_path: String,
    pub core_name: String,
    pub cover_path: Option<String>,
    pub favorite: bool,
    pub last_played: Option<String>,
    #[serde(default)]
    pub genre: Option<String>,
    #[serde(default)]
    pub display_name: Option<String>,
    #[serde(default)]
    pub play_time_secs: Option<u64>,
    #[serde(default)]
    pub hero_path: Option<String>,
    #[serde(default)]
    pub logo_path: Option<String>,
    #[serde(default)]
    pub custom_title: Option<bool>,
    #[serde(default)]
    pub developer: Option<String>,
    #[serde(default)]
    pub publisher: Option<String>,
    #[serde(default)]
    pub release_year: Option<i32>,
    #[serde(default)]
    pub region: Option<String>,
}

pub fn default_theme() -> String {
    "gold".into()
}

pub fn default_layout_style() -> String {
    "classic".into()
}

pub fn default_aspect_ratio() -> String {
    "auto".into()
}

pub fn default_audio_driver() -> String {
    "xaudio".into()
}

pub fn default_audio_latency() -> u32 {
    64
}

pub fn default_audio_volume() -> u32 {
    100
}

pub fn volume_to_db(vol_pct: u32) -> f32 {
    if vol_pct == 0 {
        -80.0
    } else if vol_pct == 100 {
        0.0
    } else if vol_pct < 100 {
        let linear = vol_pct as f32 / 100.0;
        20.0 * linear.log10()
    } else {
        (vol_pct as f32 - 100.0) * 0.12
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct GraphicsSettings {
    #[serde(default)]
    pub video_smooth: bool,
    #[serde(default)]
    pub video_scale_integer: bool,
    #[serde(default = "default_aspect_ratio")]
    pub aspect_ratio: String,
    #[serde(default = "default_audio_driver")]
    pub audio_driver: String,
    #[serde(default)]
    pub audio_device: String,
    #[serde(default = "default_audio_latency")]
    pub audio_latency: u32,
    #[serde(default = "default_audio_volume")]
    pub audio_volume: u32,
    #[serde(default)]
    pub core_options: HashMap<String, String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Profile {
    pub name: String,
    pub favorites: HashSet<String>,
    #[serde(default)]
    pub last_played: HashMap<String, String>,
    #[serde(default)]
    pub play_time_secs: HashMap<String, u64>,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_layout_style")]
    pub layout_style: String,
    #[serde(default)]
    pub ra_username: Option<String>,
    #[serde(default)]
    pub ra_api_key: Option<String>,
    #[serde(default)]
    pub ra_token: Option<String>,
    #[serde(default)]
    pub cheevos_hardcore: bool,
    #[serde(default)]
    pub steamgriddb_api_key: Option<String>,
}

pub fn default_music_volume() -> f32 {
    0.15
}

pub fn default_auto_update_check() -> bool {
    true
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppSettings {
    pub folders: Vec<String>,
    pub kiosk_mode: bool,
    pub profiles: Vec<Profile>,
    pub current_profile: String,
    #[serde(default)]
    pub platform_cores: HashMap<String, String>,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_layout_style")]
    pub layout_style: String,
    #[serde(default)]
    pub bios_folder: Option<String>,
    #[serde(default)]
    pub bios_folders: Vec<String>,
    #[serde(default)]
    pub graphics: GraphicsSettings,
    #[serde(default = "default_music_volume")]
    pub music_volume: f32,
    #[serde(default)]
    pub music_folders: Vec<String>,
    #[serde(default)]
    pub last_emulator_check_secs: u64,
    #[serde(default = "default_auto_update_check")]
    pub auto_update_check: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ScanResult {
    pub games: Vec<Game>,
    pub cores_installed: Vec<String>,
    pub cores_needed: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppState {
    pub games: Vec<Game>,
    pub favorites: HashSet<String>,
    pub settings: AppSettings,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            games: Vec::new(),
            favorites: HashSet::new(),
            settings: AppSettings {
                folders: Vec::new(),
                kiosk_mode: false,
                profiles: vec![Profile {
                    name: "Por defecto".into(),
                    favorites: HashSet::new(),
                    last_played: HashMap::new(),
                    play_time_secs: HashMap::new(),
                    theme: default_theme(),
                    layout_style: default_layout_style(),
                    ra_username: None,
                    ra_api_key: None,
                    ra_token: None,
                    cheevos_hardcore: false,
                    steamgriddb_api_key: None,
                }],
                current_profile: "Por defecto".into(),
                platform_cores: HashMap::new(),
                theme: default_theme(),
                layout_style: default_layout_style(),
                bios_folder: None,
                bios_folders: Vec::new(),
                graphics: GraphicsSettings::default(),
                music_volume: default_music_volume(),
                music_folders: Vec::new(),
                last_emulator_check_secs: 0,
                auto_update_check: default_auto_update_check(),
            },
        }
    }
}
