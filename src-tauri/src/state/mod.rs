pub mod models;
pub mod secrets;
pub mod storage;

pub use models::*;
#[allow(unused_imports)]
pub use storage::*;

use std::sync::{LazyLock, Mutex, MutexGuard};

pub static STATE: LazyLock<Mutex<AppState>> = LazyLock::new(|| Mutex::new(AppState::default()));

/// Bloquea el estado global sin `panic` si el mutex quedó envenenado
/// (un hilo anterior hizo panic mientras lo sostenía): recupera el interior.
/// ponytail: un único punto de acceso; todos los comandos pasan por aquí.
pub fn lock_state() -> MutexGuard<'static, AppState> {
    STATE.lock().unwrap_or_else(|e| e.into_inner())
}
