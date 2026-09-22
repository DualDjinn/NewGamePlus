use crate::state::storage::get_binaries_dir;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::net::UdpSocket;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Duration;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CastNetworkInfo {
    pub ip: String,
    pub hostname: String,
    pub is_connected: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LanDevice {
    pub id: String,
    pub name: String,
    pub ip: String,
    pub device_type: String, // "tv", "stick", "pc", "other"
    pub status: String,
    pub protocol: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SunshineStatus {
    pub is_installed: bool,
    pub is_running: bool,
    pub web_ui_url: String,
    pub version: Option<String>,
    pub exe_path: Option<String>,
}

pub fn get_sunshine_exe() -> Option<PathBuf> {
    // 1. Ubicación portable preferida en binaries/Sunshine
    let portable = get_binaries_dir().join("Sunshine").join("sunshine.exe");
    if portable.exists() {
        return Some(portable);
    }

    // 2. Ubicación relativa al ejecutable o directorio de trabajo
    let local = PathBuf::from("src-tauri")
        .join("binaries")
        .join("Sunshine")
        .join("sunshine.exe");
    if local.exists() {
        return Some(local);
    }

    let direct = PathBuf::from("binaries")
        .join("Sunshine")
        .join("sunshine.exe");
    if direct.exists() {
        return Some(direct);
    }

    // 3. Fallback: Instalación global de Sunshine si existe
    let global = PathBuf::from(r"C:\Program Files\LizardByte\Sunshine\sunshine.exe");
    if global.exists() {
        return Some(global);
    }

    None
}

pub fn is_sunshine_running() -> bool {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        if let Ok(output) = Command::new("tasklist")
            .args(["/FI", "IMAGENAME eq sunshine.exe"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        {
            return String::from_utf8_lossy(&output.stdout).contains("sunshine.exe");
        }
    }
    false
}

/// Obtiene la dirección IP local de la máquina y el nombre del equipo
#[tauri::command]
pub fn get_cast_network_info() -> Result<CastNetworkInfo, String> {
    let hostname = std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "Mi-PC".into());

    let local_ip = match UdpSocket::bind("0.0.0.0:0") {
        Ok(socket) => {
            if socket.connect("8.8.8.8:80").is_ok() {
                socket
                    .local_addr()
                    .map(|a| a.ip().to_string())
                    .unwrap_or_else(|_| "127.0.0.1".into())
            } else {
                "127.0.0.1".into()
            }
        }
        Err(_) => "127.0.0.1".into(),
    };

    let is_connected = local_ip != "127.0.0.1";

    Ok(CastNetworkInfo {
        ip: local_ip,
        hostname,
        is_connected,
    })
}

/// Abre la herramienta nativa de proyección y conexión de pantallas inalámbricas de Windows (Miracast)
#[tauri::command]
pub fn open_wireless_display() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("cmd")
            .args([
                "/c",
                "start",
                "ms-settings-connectabledevices:devicediscovery",
            ])
            .spawn()
            .map_err(|e| format!("No se pudo abrir la proyección de Windows: {}", e))?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("La proyección inalámbrica directa sólo está disponible en Windows.".into())
    }
}

/// Escanea dispositivos en la red local mediante SSDP (UPnP) y la tabla ARP
#[tauri::command]
pub fn discover_lan_devices() -> Result<Vec<LanDevice>, String> {
    let mut devices = Vec::new();
    let mut seen_ips = HashSet::new();

    // 1. Detección activa mediante SSDP M-SEARCH (Smart TVs, Sticks, receptores de Cast)
    if let Ok(socket) = UdpSocket::bind("0.0.0.0:0") {
        let _ = socket.set_read_timeout(Some(Duration::from_millis(1200)));
        let _ = socket.set_broadcast(true);

        let msearch = "M-SEARCH * HTTP/1.1\r\n\
                       HOST: 239.255.255.250:1900\r\n\
                       MAN: \"ssdp:discover\"\r\n\
                       MX: 2\r\n\
                       ST: ssdp:all\r\n\r\n";

        let _ = socket.send_to(msearch.as_bytes(), "239.255.255.250:1900");

        let mut buf = [0u8; 2048];
        let start = std::time::Instant::now();

        while start.elapsed() < Duration::from_millis(1300) {
            if let Ok((len, addr)) = socket.recv_from(&mut buf) {
                let ip = addr.ip().to_string();
                if seen_ips.contains(&ip) {
                    continue;
                }
                seen_ips.insert(ip.clone());

                let resp = String::from_utf8_lossy(&buf[..len]).to_lowercase();

                let (device_type, name, protocol) = if resp.contains("webos") || resp.contains("lg")
                {
                    (
                        "tv",
                        "LG Smart TV (webOS)".to_string(),
                        "Miracast / DLNA".to_string(),
                    )
                } else if resp.contains("samsung") || resp.contains("tizen") {
                    (
                        "tv",
                        "Samsung Smart TV".to_string(),
                        "SmartView / DLNA".to_string(),
                    )
                } else if resp.contains("xiaomi") || resp.contains("mitv") || resp.contains("mibox")
                {
                    (
                        "stick",
                        "Xiaomi TV Stick / Android TV".to_string(),
                        "Moonlight / Cast".to_string(),
                    )
                } else if resp.contains("fire") || resp.contains("aft") || resp.contains("amazon") {
                    (
                        "stick",
                        "Amazon Fire TV Stick".to_string(),
                        "Moonlight / Miracast".to_string(),
                    )
                } else if resp.contains("roku") {
                    (
                        "tv",
                        "Roku TV / Streaming Stick".to_string(),
                        "Miracast / AirPlay".to_string(),
                    )
                } else if resp.contains("google") || resp.contains("chromecast") {
                    (
                        "stick",
                        "Google Chromecast / Android TV".to_string(),
                        "Moonlight / Cast".to_string(),
                    )
                } else {
                    (
                        "other",
                        format!("Dispositivo multimedia ({})", ip),
                        "Red Local".to_string(),
                    )
                };

                devices.push(LanDevice {
                    id: format!("device-{}", ip.replace('.', "-")),
                    name,
                    ip,
                    device_type: device_type.to_string(),
                    status: "En línea".to_string(),
                    protocol,
                });
            }
        }
    }

    // 2. Consultar tabla ARP de Windows para encontrar IPs de dispositivos conectados
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        if let Ok(output) = Command::new("arp")
            .arg("-a")
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 3 && parts[2] == "dinámico" {
                    let ip = parts[0];
                    if ip.starts_with("192.168.") || ip.starts_with("10.") || ip.starts_with("172.")
                    {
                        if !seen_ips.contains(ip) && !ip.ends_with(".1") && !ip.ends_with(".255") {
                            seen_ips.insert(ip.to_string());
                            devices.push(LanDevice {
                                id: format!("arp-{}", ip.replace('.', "-")),
                                name: format!("Dispositivo en red ({})", ip),
                                ip: ip.to_string(),
                                device_type: "other".to_string(),
                                status: "Activo en red".to_string(),
                                protocol: "Moonlight / LAN".to_string(),
                            });
                        }
                    }
                }
            }
        }
    }

    Ok(devices)
}

/// Comprueba si Sunshine está disponible y si el servidor está en ejecución
#[tauri::command]
pub fn check_sunshine_status() -> Result<SunshineStatus, String> {
    let exe_path = get_sunshine_exe();
    let is_installed = exe_path.is_some();
    let is_running = is_sunshine_running();

    Ok(SunshineStatus {
        is_installed,
        is_running,
        web_ui_url: "https://localhost:47990".into(),
        version: if is_installed {
            Some("Sunshine Portable v2026+".into())
        } else {
            None
        },
        exe_path: exe_path.map(|p| p.to_string_lossy().to_string()),
    })
}

/// Inicia el servidor Sunshine en segundo plano de forma silenciosa
#[tauri::command]
pub fn start_sunshine() -> Result<String, String> {
    let exe = get_sunshine_exe().ok_or_else(|| {
        "Sunshine Portable no está descargado. Pulsa 'Descargar Sunshine Portable' para prepararlo automáticamente.".to_string()
    })?;

    if is_sunshine_running() {
        return Ok("El servidor Sunshine ya se encuentra en ejecución.".into());
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;

        let working_dir = exe.parent().unwrap_or_else(|| Path::new("."));

        // Asegurar que exista la carpeta config y apps.json con NewGamePlus
        let config_dir = working_dir.join("config");
        let _ = fs::create_dir_all(&config_dir);
        let apps_json_path = config_dir.join("apps.json");
        if !apps_json_path.exists() {
            let default_apps = r#"{
  "env": {},
  "apps": [
    {
      "name": "NewGamePlus",
      "output": "",
      "image-path": "desktop.png"
    },
    {
      "name": "Escritorio Completo",
      "image-path": "desktop.png"
    }
  ]
}"#;
            let _ = fs::write(&apps_json_path, default_apps);
        }

        // Asegurar que existan credenciales iniciales en sunshine_state.json
        let state_json = config_dir.join("sunshine_state.json");
        if !state_json.exists() {
            let _ = Command::new(&exe)
                .current_dir(working_dir)
                .args(["--creds", "admin", "newgameplus"])
                .creation_flags(0x08000000)
                .output();
        }

        // Flag Windows: CREATE_NO_WINDOW (0x08000000) | DETACHED_PROCESS (0x00000008) | CREATE_NEW_PROCESS_GROUP (0x00000200)
        const FLAGS: u32 = 0x08000000 | 0x00000008 | 0x00000200;

        Command::new(&exe)
            .current_dir(working_dir)
            .creation_flags(FLAGS)
            .spawn()
            .map_err(|e| format!("Error iniciando Sunshine: {}", e))?;

        Ok("Servidor Sunshine iniciado correctamente en segundo plano.".into())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Sunshine sólo está disponible para Windows en esta versión.".into())
    }
}

/// Detiene el servidor Sunshine
#[tauri::command]
pub fn stop_sunshine() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let _ = Command::new("taskkill")
            .args(["/F", "/IM", "sunshine.exe"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        Ok("Servidor Sunshine detenido.".into())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok("Detenido.".into())
    }
}

/// Ejecuta el script setup-sunshine.ps1 para descargar Sunshine Portable en 1 clic
#[tauri::command]
pub fn download_sunshine_portable() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let mut script_path = PathBuf::from("setup-sunshine.ps1");
        if !script_path.exists() {
            if let Ok(exe) = std::env::current_exe() {
                if let Some(p) = exe.parent() {
                    let c1 = p.join("setup-sunshine.ps1");
                    if c1.exists() {
                        script_path = c1;
                    } else if let Some(pp) = p.parent() {
                        let c2 = pp.join("setup-sunshine.ps1");
                        if c2.exists() {
                            script_path = c2;
                        }
                    }
                }
            }
        }

        let res = Command::new("powershell")
            .args([
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                &script_path.to_string_lossy(),
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("No se pudo ejecutar setup-sunshine.ps1: {}", e))?;

        if res.status.success() {
            Ok("¡Sunshine Portable se ha descargado y configurado exitosamente!".into())
        } else {
            let stderr = String::from_utf8_lossy(&res.stderr);
            let stdout = String::from_utf8_lossy(&res.stdout);
            Err(format!("Error descargando Sunshine: {} {}", stderr, stdout))
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Descarga sólo soportada en Windows.".into())
    }
}

#[derive(Serialize)]
struct PairPinPayload {
    pin: String,
    name: String,
}

#[derive(Deserialize)]
struct PairPinResponse {
    status: Option<bool>,
}

/// Envía el PIN de 4 dígitos a la API de Sunshine con autenticación HTTP Basic
#[tauri::command]
pub async fn pair_moonlight_pin(pin: String) -> Result<String, String> {
    let pin = pin.trim().to_string();
    if pin.len() != 4 || !pin.chars().all(|c| c.is_ascii_digit()) {
        return Err("El código PIN debe ser exactamente de 4 dígitos numéricos.".into());
    }

    // Si Sunshine no está corriendo, intentar iniciarlo primero
    if !is_sunshine_running() {
        let _ = start_sunshine();
        std::thread::sleep(Duration::from_millis(1500));
    }

    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .timeout(Duration::from_secs(6))
        .build()
        .map_err(|e| format!("Error creando cliente HTTP: {}", e))?;

    let url = "https://localhost:47990/api/pin";
    let payload = PairPinPayload {
        pin: pin.clone(),
        name: "NewGamePlus TV".to_string(),
    };

    let resp = client
        .post(url)
        .basic_auth("admin", Some("newgameplus"))
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Error comunicando con Sunshine: {}", e))?;

    let status = resp.status();
    if status.is_success() {
        if let Ok(body) = resp.json::<PairPinResponse>().await {
            if body.status == Some(true) {
                return Ok(
                    "¡Dispositivo emparejado con éxito! Tu TV ya está conectada a NewGamePlus."
                        .into(),
                );
            } else {
                return Ok("PIN enviado. Si el TV no se vinculó, asegúrate de haber pulsado sobre tu PC en Moonlight antes de ingresar el PIN.".into());
            }
        }
        Ok("PIN enviado exitosamente a Sunshine.".into())
    } else {
        Err(format!("Sunshine respondió con código {}. Asegúrate de que Moonlight en tu TV está en la pantalla solicitando el PIN.", status))
    }
}
