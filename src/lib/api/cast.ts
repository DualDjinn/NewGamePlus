import { invoke } from "@tauri-apps/api/core";

export interface CastNetworkInfo {
  ip: string;
  hostname: string;
  is_connected: boolean;
}

export interface LanDevice {
  id: string;
  name: string;
  ip: string;
  device_type: string;
  status: string;
  protocol: string;
}

export interface SunshineStatus {
  is_installed: boolean;
  is_running: boolean;
  web_ui_url: string;
  version: string | null;
  exe_path: string | null;
}

export async function getCastNetworkInfo(): Promise<CastNetworkInfo> {
  return invoke<CastNetworkInfo>("get_cast_network_info");
}

export async function openWirelessDisplay(): Promise<void> {
  return invoke<void>("open_wireless_display");
}

export async function discoverLanDevices(): Promise<LanDevice[]> {
  return invoke<LanDevice[]>("discover_lan_devices");
}

export async function checkSunshineStatus(): Promise<SunshineStatus> {
  return invoke<SunshineStatus>("check_sunshine_status");
}

export async function startSunshine(): Promise<string> {
  return invoke<string>("start_sunshine");
}

export async function stopSunshine(): Promise<string> {
  return invoke<string>("stop_sunshine");
}

export async function downloadSunshinePortable(): Promise<string> {
  return invoke<string>("download_sunshine_portable");
}

export async function pairMoonlightPin(pin: string): Promise<string> {
  return invoke<string>("pair_moonlight_pin", { pin });
}
