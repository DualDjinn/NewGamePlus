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
    #[serde(default)]
    pub screenscraper_user: Option<String>,
    #[serde(default)]
    pub screenscraper_pass: Option<String>,
    #[serde(default)]
    pub screenscraper_dev_id: Option<String>,
    #[serde(default)]
    pub screenscraper_dev_pass: Option<String>,
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
    pub video_folders: Vec<String>,
    #[serde(default)]
    pub last_emulator_check_secs: u64,
    #[serde(default = "default_auto_update_check")]
    pub auto_update_check: bool,
    #[serde(default)]
    pub controller_mapping: ControllerMapping,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct ControllerMapping {
    #[serde(default = "default_btn_a")]
    pub btn_a: String,
    #[serde(default = "default_btn_b")]
    pub btn_b: String,
    #[serde(default = "default_btn_x")]
    pub btn_x: String,
    #[serde(default = "default_btn_y")]
    pub btn_y: String,
    #[serde(default = "default_btn_start")]
    pub btn_start: String,
    #[serde(default = "default_btn_select")]
    pub btn_select: String,
    #[serde(default = "default_btn_l")]
    pub btn_l: String,
    #[serde(default = "default_btn_r")]
    pub btn_r: String,
    #[serde(default = "default_btn_l2")]
    pub btn_l2: String,
    #[serde(default = "default_btn_r2")]
    pub btn_r2: String,
    #[serde(default = "default_btn_l3")]
    pub btn_l3: String,
    #[serde(default = "default_btn_r3")]
    pub btn_r3: String,
    #[serde(default)]
    pub swap_ab_xy: bool,
}

fn default_btn_a() -> String {
    "0".into()
}
fn default_btn_b() -> String {
    "1".into()
}
fn default_btn_x() -> String {
    "2".into()
}
fn default_btn_y() -> String {
    "3".into()
}
fn default_btn_start() -> String {
    "7".into()
}
fn default_btn_select() -> String {
    "6".into()
}
fn default_btn_l() -> String {
    "4".into()
}
fn default_btn_r() -> String {
    "5".into()
}
fn default_btn_l2() -> String {
    "+4".into()
}
fn default_btn_r2() -> String {
    "+5".into()
}
fn default_btn_l3() -> String {
    "8".into()
}
fn default_btn_r3() -> String {
    "9".into()
}

impl Default for ControllerMapping {
    fn default() -> Self {
        Self {
            btn_a: default_btn_a(),
            btn_b: default_btn_b(),
            btn_x: default_btn_x(),
            btn_y: default_btn_y(),
            btn_start: default_btn_start(),
            btn_select: default_btn_select(),
            btn_l: default_btn_l(),
            btn_r: default_btn_r(),
            btn_l2: default_btn_l2(),
            btn_r2: default_btn_r2(),
            btn_l3: default_btn_l3(),
            btn_r3: default_btn_r3(),
            swap_ab_xy: false,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[allow(dead_code)]
pub struct SaveSlotInfo {
    pub slot: u32,
    pub has_save: bool,
    pub screenshot_path: Option<String>,
    pub timestamp_str: Option<String>,
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
                    screenscraper_user: None,
                    screenscraper_pass: None,
                    screenscraper_dev_id: None,
                    screenscraper_dev_pass: None,
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
                video_folders: Vec::new(),
                last_emulator_check_secs: 0,
                auto_update_check: default_auto_update_check(),
                controller_mapping: ControllerMapping::default(),
            },
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LocalVideoStats {
    pub total_games: usize,
    pub games_with_video: usize,
    pub games_missing_video: usize,
}
