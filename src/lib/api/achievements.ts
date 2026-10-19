import { invoke } from "@tauri-apps/api/core";
import type { GameAchievementProgress } from "../../types";

export async function saveRACredentials(username: string, password: string, apiKey: string): Promise<void> {
  return invoke("save_ra_credentials", { username, password, apiKey });
}

export async function getRACredentials(): Promise<string | null> {
  return invoke<string | null>("get_ra_credentials");
}

export async function clearRACredentials(): Promise<void> {
  return invoke("clear_ra_credentials");
}

export async function getGameAchievements(romPath: string): Promise<GameAchievementProgress | null> {
  return invoke<GameAchievementProgress | null>("get_game_achievements", { romPath });
}

export async function refreshGameAchievements(romPath: string): Promise<GameAchievementProgress | null> {
  return invoke<GameAchievementProgress | null>("refresh_game_achievements", { romPath });
}

export async function setCheevosHardcore(enabled: boolean): Promise<void> {
  return invoke("set_cheevos_hardcore", { enabled });
}
