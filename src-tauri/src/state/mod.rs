pub mod models;
pub mod storage;

pub use models::*;
#[allow(unused_imports)]
pub use storage::*;

use std::sync::{LazyLock, Mutex};

pub static STATE: LazyLock<Mutex<AppState>> = LazyLock::new(|| Mutex::new(AppState::default()));
