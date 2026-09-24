import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Game, SortKey, LayoutStyle } from "../types";
import type { ScanCompleteResult } from "../components/ScanCompleteModal";
import {
  getGames,
  getSettings,
  scanAndFetchCores,
  checkRetroarch,
  onRetroarchExited,
  onScanProgress,
  onSetupStatus,
  onEmulatorUpdates,
  onCoversUpdated,
  savePlatformCores,
  switchProfile,
  setTheme,
  setLayoutStyle,
} from "../lib/tauri";

interface UseLibraryGamesOptions {
  onRetroarchExitedCallback?: (updatedGames: Game[]) => void;
}

export function useLibraryGames(options?: UseLibraryGamesOptions) {
  const { t } = useTranslation();
  const [games, setGames] = useState<Game[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [kioskMode, setKioskMode] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loaded, setLoaded] = useState<boolean | null>(null);
  const [scanMessage, setScanMessage] = useState("");
  const [setupStatus, setSetupStatus] = useState("");
  const [theme, setThemeState] = useState<string>("gold");
  const [layoutStyle, setLayoutStyleState] = useState<LayoutStyle>("classic");
  const [scanCores, setScanCores] = useState<{ installed: string[]; needed: string[] } | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [profiles, setProfiles] = useState<string[]>([]);
  const [currentProfile, setCurrentProfile] = useState("Por defecto");
  const [scanProgress, setScanProgress] = useState(0);
  const [platformCores, setPlatformCores] = useState<Record<string, string>>({});
  const [emulatorUpdates, setEmulatorUpdates] = useState(false);
  const [scanCompletedResult, setScanCompletedResult] = useState<ScanCompleteResult | null>(null);

  // Auto-download RetroArch on first launch
  useEffect(() => {
    checkRetroarch().catch((e) => {
      console.error("RetroArch setup failed:", e);
      setSetupStatus("Error al instalar RetroArch");
    });
  }, []);

  // Listen for setup progress
  useEffect(() => {
    const unlisten = onSetupStatus((msg) => setSetupStatus(msg));
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Badge no intrusivo cuando el auto-check (cada 4 días) encuentra updates
  useEffect(() => {
    const unlisten = onEmulatorUpdates((infos) => {
      setEmulatorUpdates(infos.some((i) => i.update_available));
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Load persisted data on mount
  useEffect(() => {
    async function init() {
      try {
        const [savedGames, settings] = await Promise.all([
          getGames(),
          getSettings(),
        ]);
        setFolders(settings.folders);
        setKioskMode(settings.kiosk_mode);
        setProfiles(settings.profiles.map((p) => p.name));
        setCurrentProfile(settings.current_profile);
        setPlatformCores(settings.platform_cores || {});
        if (settings.theme) {
          setThemeState(settings.theme);
        }
        if (settings.layout_style) {
          setLayoutStyleState(settings.layout_style as LayoutStyle);
        }
        if (savedGames.length > 0) {
          setGames(savedGames);
        }
      } catch (e) {
        console.error("Failed to load state:", e);
      } finally {
        setLoaded(true);
      }
    }
    init();
  }, []);

  const handleThemeChange = useCallback(async (newTheme: string) => {
    setThemeState(newTheme);
    try {
      await setTheme(newTheme);
    } catch (e) {
      console.error("Failed to save theme:", e);
    }
  }, []);

  const handleLayoutStyleChange = useCallback(async (newStyle: LayoutStyle) => {
    setLayoutStyleState(newStyle);
    try {
      await setLayoutStyle(newStyle);
    } catch (e) {
      console.error("Failed to save layout style:", e);
    }
  }, []);

  // Listen for RetroArch / emulator exit with instant granular update
  useEffect(() => {
    const unlisten = onRetroarchExited((exitedRomPath) => {
      // 1. Inmediata actualización granular en memoria sin re-parsear toda la biblioteca
      const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);
      setGames((prevGames) => {
        let changed = false;
        const mapped = prevGames.map((g) => {
          if (g.rom_path === exitedRomPath) {
            changed = true;
            return {
              ...g,
              last_played: nowStr,
            };
          }
          return g;
        });
        if (changed) {
          options?.onRetroarchExitedCallback?.(mapped);
          return mapped;
        }
        return prevGames;
      });

      // 2. Sincronización en segundo plano con retraso suave (cuando NewGame+ ya está visible y Rust guardó)
      const timer = setTimeout(() => {
        getGames()
          .then((updatedGames) => {
            setGames(updatedGames);
            options?.onRetroarchExitedCallback?.(updatedGames);
          })
          .catch(console.error);
      }, 600);

      return () => clearTimeout(timer);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [options]);

  // Listen for covers updated in background
  useEffect(() => {
    const unlisten = onCoversUpdated(() => {
      getGames()
        .then((updatedGames) => {
          setGames(updatedGames);
        })
        .catch(console.error);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Listen for scan progress
  useEffect(() => {
    const unlisten = onScanProgress((data) => {
      const frac = data.total > 0 ? data.current / data.total : 0;
      const pct =
        data.phase === "scan"
          ? frac * 40
          : data.phase === "roms"
          ? 40 + frac * 50
          : 90 + frac * 10;
      setScanProgress(Math.round(pct));
      setScanMessage(
        data.phase === "scan"
          ? t("scan.scanning", { label: data.label })
          : data.phase === "roms"
          ? t("scan.processing", { current: data.current, total: data.total, label: data.label })
          : t("scan.downloadingCore", { label: data.label })
      );
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [t]);

  const sortGames = useCallback(
    (list: Game[]) => {
      const sorted = [...list];
      if (sortBy === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
      else if (sortBy === "platform") sorted.sort((a, b) => a.platform.localeCompare(b.platform));
      else if (sortBy === "last_played")
        sorted.sort((a, b) => Number(b.last_played ?? 0) - Number(a.last_played ?? 0));
      return sorted;
    },
    [sortBy]
  );

  const featured = useMemo(() => {
    if (games.length === 0) return [];

    const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

    const withHero = shuffle(games.filter((g) => g.hero_path));
    const favs = shuffle(games.filter((g) => g.favorite));
    const recentTop = shuffle(
      [...games]
        .filter((g) => g.last_played)
        .sort((a, b) => Number(b.last_played) - Number(a.last_played))
        .slice(0, 5)
    );
    const random = shuffle(games);

    const seen = new Set<string>();
    const pool: Game[] = [];

    const pickFrom = (source: Game[], max: number) => {
      for (const g of source) {
        if (pool.length >= 7 || max <= 0) break;
        if (!seen.has(g.id)) {
          seen.add(g.id);
          pool.push(g);
          max--;
        }
      }
    };

    pickFrom(withHero, 2); // Up to 2 games with hero art
    pickFrom(favs, 2); // Up to 2 favorites
    pickFrom(recentTop, 1); // 1 from top 5 recently played
    pickFrom(random, 7); // Fill remaining slots with random games

    return pool;
  }, [games]);

  const recentlyPlayed = useMemo(
    () =>
      [...games]
        .filter((g) => g.last_played)
        .sort((a, b) => Number(b.last_played) - Number(a.last_played))
        .slice(0, 10),
    [games]
  );

  const favorites = useMemo(() => games.filter((g) => g.favorite), [games]);

  const handleFavoriteChanged = useCallback((gameId: string, isFav: boolean) => {
    setGames((prev) => prev.map((g) => (g.id === gameId ? { ...g, favorite: isFav } : g)));
  }, []);

  const handleScan = useCallback(
    async (f: string[], onCompletedSection?: () => void) => {
      setScanning(true);
      setScanMessage("Iniciando escaneo...");
      setScanCores(null);
      setScanProgress(0);
      try {
        const result = await scanAndFetchCores(f);
        const updatedGames = await getGames();
        setGames(updatedGames);
        setLoaded(true);
        onCompletedSection?.();
        setScanMessage("");
        setScanCores({ installed: result.cores_installed, needed: result.cores_needed });
        setScanCompletedResult({
          totalGames: updatedGames.length,
          coresInstalled: result.cores_installed,
          coresNeeded: result.cores_needed,
        });
      } catch (e) {
        console.error("Scan failed:", e);
        setScanMessage("Error al escanear");
      } finally {
        setScanning(false);
        setScanProgress(0);
      }
    },
    []
  );

  const dismissScanCompleted = useCallback(() => {
    setScanCompletedResult(null);
  }, []);

  const handleProfilesChange = useCallback(
    async (newProfiles: string[], newCurrent: string) => {
      setProfiles(newProfiles);
      setCurrentProfile(newCurrent);
      try {
        const [updatedGames, updatedSettings] = await Promise.all([
          getGames(),
          getSettings(),
        ]);
        setGames(updatedGames);
        const prof = updatedSettings.profiles.find((p) => p.name === newCurrent);
        if (prof?.theme) {
          setThemeState(prof.theme);
        } else if (updatedSettings.theme) {
          setThemeState(updatedSettings.theme);
        }
        if (prof?.layout_style) {
          setLayoutStyleState(prof.layout_style as LayoutStyle);
        } else if (updatedSettings.layout_style) {
          setLayoutStyleState(updatedSettings.layout_style as LayoutStyle);
        }
      } catch (e) {
        console.error("Failed to reload state for new profile:", e);
      }
    },
    []
  );

  const handlePlatformCoreChange = useCallback(
    async (platform: string, core: string) => {
      setPlatformCores((prev) => {
        const next = { ...prev, [platform]: core };
        savePlatformCores(next).catch(console.error);
        return next;
      });
    },
    []
  );

  const handleProfileSwitch = useCallback(
    async (name: string) => {
      if (name === currentProfile) return;
      try {
        await switchProfile(name);
        setCurrentProfile(name);
        const [updatedGames, updatedSettings] = await Promise.all([
          getGames(),
          getSettings(),
        ]);
        setGames(updatedGames);
        const prof = updatedSettings.profiles.find((p) => p.name === name);
        if (prof?.theme) {
          setThemeState(prof.theme);
        } else if (updatedSettings.theme) {
          setThemeState(updatedSettings.theme);
        }
        if (prof?.layout_style) {
          setLayoutStyleState(prof.layout_style as LayoutStyle);
        } else if (updatedSettings.layout_style) {
          setLayoutStyleState(updatedSettings.layout_style as LayoutStyle);
        }
      } catch (e) {
        console.error("Switch profile failed:", e);
      }
    },
    [currentProfile]
  );

  return {
    games,
    setGames,
    folders,
    setFolders,
    kioskMode,
    setKioskMode,
    scanning,
    loaded,
    scanMessage,
    setupStatus,
    theme,
    handleThemeChange,
    layoutStyle,
    handleLayoutStyleChange,
    scanCores,
    sortBy,
    setSortBy,
    profiles,
    currentProfile,
    scanProgress,
    platformCores,
    emulatorUpdates,
    sortGames,
    featured,
    recentlyPlayed,
    favorites,
    handleFavoriteChanged,
    handleScan,
    scanCompletedResult,
    dismissScanCompleted,
    handleProfilesChange,
    handlePlatformCoreChange,
    handleProfileSwitch,
  };
}
