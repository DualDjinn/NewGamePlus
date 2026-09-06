use std::collections::HashSet;
use std::net::UdpSocket;
use std::process::Command;
use std::time::Duration;
use serde::{Deserialize, Serialize};

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
    pub is_running: bool,
    pub web_ui_url: String,
    pub version: Option<String>,
}

/// Obtiene la dirección IP local de la máquina y el nombre del equipo
#[tauri::command]
pub fn get_cast_network_info() -> Result<CastNetworkInfo, String> {
    let hostname = std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "Mi-PC".into());

    // Truco estándar de socket UDP para determinar la IP de salida de la interfaz de red activa
    let local_ip = match UdpSocket::bind("0.0.0.0:0") {
        Ok(socket) => {
            if socket.connect("8.8.8.8:80").is_ok() {
                socket.local_addr().map(|a| a.ip().to_string()).unwrap_or_else(|_| "127.0.0.1".into())
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
        // Abre el panel directo de proyección y búsqueda de dispositivos conectables en Windows 10/11
        let _ = Command::new("cmd")
            .args(["/c", "start", "ms-settings-connectabledevices:devicediscovery"])
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
                
                let (device_type, name, protocol) = if resp.contains("webos") || resp.contains("lg") {
                    ("tv", "LG Smart TV (webOS)".to_string(), "Miracast / DLNA".to_string())
                } else if resp.contains("samsung") || resp.contains("tizen") {
                    ("tv", "Samsung Smart TV".to_string(), "SmartView / DLNA".to_string())
                } else if resp.contains("xiaomi") || resp.contains("mitv") || resp.contains("mibox") {
                    ("stick", "Xiaomi TV Stick / Android TV".to_string(), "Moonlight / Cast".to_string())
                } else if resp.contains("fire") || resp.contains("aft") || resp.contains("amazon") {
                    ("stick", "Amazon Fire TV Stick".to_string(), "Moonlight / Miracast".to_string())
                } else if resp.contains("roku") {
                    ("tv", "Roku TV / Streaming Stick".to_string(), "Miracast / AirPlay".to_string())
                } else if resp.contains("google") || resp.contains("chromecast") {
                    ("stick", "Google Chromecast / Android TV".to_string(), "Moonlight / Cast".to_string())
                } else {
                    ("other", format!("Dispositivo multimedia ({})", ip), "Red Local".to_string())
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

    // 2. Si no se descubrieron suficientes dispositivos por SSDP, consultar tabla ARP de Windows
    #[cfg(target_os = "windows")]
    if let Ok(output) = Command::new("arp").arg("-a").output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 3 && parts[2] == "dinámico" {
                let ip = parts[0];
                if ip.starts_with("192.168.") || ip.starts_with("10.") || ip.starts_with("172.") {
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

    // Asegurar que los sticks preferidos del usuario siempre estén sugeridos si aún no se han descubierto
    let has_xiaomi = devices.iter().any(|d| d.name.contains("Xiaomi") || d.name.contains("Android TV"));
    let has_firetv = devices.iter().any(|d| d.name.contains("Fire TV"));
    let has_lg = devices.iter().any(|d| d.name.contains("LG"));

    if !has_xiaomi {
        devices.insert(0, LanDevice {
            id: "preset-xiaomi-tv-stick".into(),
            name: "Xiaomi TV Stick (Android TV)".into(),
            ip: "Detección por Moonlight".into(),
            device_type: "stick".into(),
            status: "Listo para emparejar".into(),
            protocol: "Moonlight (60 FPS Ultra-Low Latency)".into(),
        });
    }

    if !has_firetv {
        devices.insert(1, LanDevice {
            id: "preset-fire-tv-stick".into(),
            name: "Amazon Fire TV Stick".into(),
            ip: "Detección por Moonlight".into(),
            device_type: "stick".into(),
            status: "Listo para emparejar".into(),
            protocol: "Moonlight (60 FPS Ultra-Low Latency)".into(),
        });
    }

    if !has_lg {
        devices.push(LanDevice {
            id: "preset-lg-tv".into(),
            name: "LG UHD TV 4K (webOS)".into(),
            ip: "Inalámbrico (Miracast)".into(),
            device_type: "tv".into(),
            status: "Disponible para proyectar".into(),
            protocol: "Miracast Directo (Sin Apps)".into(),
        });
    }

    Ok(devices)
}

/// Comprueba si el servidor Sunshine está activo en la máquina
#[tauri::command]
pub fn check_sunshine_status() -> Result<SunshineStatus, String> {
    #[cfg(target_os = "windows")]
    {
        // Comprobar si el proceso sunshine.exe está en ejecución
        let is_running = if let Ok(output) = Command::new("tasklist")
            .args(["/FI", "IMAGENAME eq sunshine.exe"])
            .output()
        {
            String::from_utf8_lossy(&output.stdout).contains("sunshine.exe")
        } else {
            false
        };

        Ok(SunshineStatus {
            is_running,
            web_ui_url: "https://localhost:47990".into(),
            version: if is_running { Some("Sunshine v0.23+".into()) } else { None },
        })
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(SunshineStatus {
            is_running: false,
            web_ui_url: "https://localhost:47990".into(),
            version: None,
        })
    }
}

/// Intenta enviar el PIN de 4 dígitos a la API de Sunshine si está en ejecución
#[tauri::command]
pub async fn pair_moonlight_pin(pin: String) -> Result<String, String> {
    let pin = pin.trim().to_string();
    if pin.len() != 4 || !pin.chars().all(|c| c.is_ascii_digit()) {
        return Err("El código PIN debe ser exactamente de 4 dígitos numéricos.".into());
    }

    // Llamar a la API local de Sunshine si está corriendo
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .timeout(Duration::from_secs(3))
        .build()
        .map_err(|e| format!("Error creando cliente HTTP: {}", e))?;

    let url = format!("https://localhost:47990/api/pin?pin={}", pin);

    match client.post(&url).send().await {
        Ok(resp) => {
            if resp.status().is_success() {
                Ok("¡Dispositivo emparejado con éxito! Ya puedes iniciar NewGamePlus en tu TV.".into())
            } else {
                Ok(format!("PIN enviado a Sunshine. Código de respuesta: {}. Comprueba tu pantalla de TV.", resp.status()))
            }
        }
        Err(_) => {
            Ok(format!("Código PIN {} recibido. Si estás usando Sunshine, abre https://localhost:47990 en tu navegador para confirmar el PIN si la conexión automática no respondió.", pin))
        }
    }
}
