import { useState, useEffect, useCallback, type ChangeEvent } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  saveBiosFolders,
  getBiosFolders,
  saveVideoFolders,
  getVideoFolders,
  scanLocalVideos,
  scrapeLibraryVideos,
  cancelScrapeLibraryVideos,
  onScrapeBatchProgress,
  batchScrapeSteamGrid,
  cancelBatchScrapeSteamGrid,
  onSteamGridBatchProgress,
  exportLibrary,
  importLibrary,
  type LocalVideoStats,
  type BatchScrapeProgressEvent,
  type SteamGridBatchProgressEvent,
} from "../../lib/tauri";

interface UseLibraryTabSettingsProps {
  onRemoveFolderRequest: (path: string, type: "bios-folder" | "video-folder") => void;
}

export function useLibraryTabSettings({ onRemoveFolderRequest }: UseLibraryTabSettingsProps) {
  const [biosFolders, setBiosFolders] = useState<string[]>([]);
  const [videoFolders, setVideoFolders] = useState<string[]>([]);
  const [videoStats, setVideoStats] = useState<LocalVideoStats | null>(null);
  const [scanningLocalVideos, setScanningLocalVideos] = useState(false);

  const [isBatchScraping, setIsBatchScraping] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchScrapeProgressEvent | null>(null);

  const [isBatchSteamGridScraping, setIsBatchSteamGridScraping] = useState(false);
  const [batchSteamGridProgress, setBatchSteamGridProgress] = useState<SteamGridBatchProgressEvent | null>(null);

  const [regionPref, setRegionPref] = useState(() => {
    return localStorage.getItem("gameflix_region_pref") || "auto";
  });

  const handleScanLocalVideos = useCallback(async () => {
    setScanningLocalVideos(true);
    try {
      const stats = await scanLocalVideos();
      setVideoStats(stats);
    } catch (e) {
      console.error("Failed to scan local videos:", e);
    } finally {
      setScanningLocalVideos(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    getBiosFolders()
      .then((b) => {
        if (!cancelled) setBiosFolders(b);
      })
      .catch(console.error);

    getVideoFolders()
      .then((v) => {
        if (!cancelled) {
          setVideoFolders(v);
          handleScanLocalVideos();
        }
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [handleScanLocalVideos]);

  useEffect(() => {
    const unlisten = onScrapeBatchProgress((payload) => {
      setBatchProgress(payload);
      if (payload.status === "completed" || payload.status === "cancelled" || payload.status === "failed") {
        setIsBatchScraping(false);
        handleScanLocalVideos();
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [handleScanLocalVideos]);

  useEffect(() => {
    const unlisten = onSteamGridBatchProgress((payload) => {
      setBatchSteamGridProgress(payload);
      if (payload.status === "complete" || payload.status === "cancelled") {
        setIsBatchSteamGridScraping(false);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  async function handleAddBiosFolder() {
    let path;
    try {
      path = await open({ directory: true, title: "Seleccionar carpeta de BIOS (PlayStation, Neo Geo, etc.)" });
    } catch (e) {
      console.error("BIOS folder dialog failed:", e);
      window.dispatchEvent(new CustomEvent("app-error", { detail: "Error al abrir selector de carpeta BIOS" }));
      return;
    }
    if (path && !biosFolders.includes(path)) {
      const next = [...biosFolders, path];
      setBiosFolders(next);
      await saveBiosFolders(next).catch(console.error);
    }
  }

  function requestRemoveBiosFolder(path: string) {
    onRemoveFolderRequest(path, "bios-folder");
  }

  async function handleAddVideoFolder() {
    let path;
    try {
      path = await open({ directory: true, title: "Seleccionar carpeta de videos (.mp4) de juegos" });
    } catch (e) {
      console.error("Video folder dialog failed:", e);
      window.dispatchEvent(new CustomEvent("app-error", { detail: "Error al abrir selector de carpeta de videos" }));
      return;
    }
    if (path && !videoFolders.includes(path)) {
      const next = [...videoFolders, path];
      setVideoFolders(next);
      await saveVideoFolders(next).catch(console.error);
      handleScanLocalVideos();
    }
  }

  function requestRemoveVideoFolder(path: string) {
    onRemoveFolderRequest(path, "video-folder");
  }

  async function handleStartBatchScrape(onlyMissing: boolean) {
    setIsBatchScraping(true);
    try {
      await scrapeLibraryVideos(onlyMissing);
    } catch (e) {
      setIsBatchScraping(false);
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : "Error al iniciar descarga masiva";
      window.dispatchEvent(new CustomEvent("app-error", { detail: msg }));
    }
  }

  async function handleCancelBatchScrape() {
    try {
      await cancelScrapeLibraryVideos();
    } catch (e) {
      console.error("Cancel batch scrape failed:", e);
    }
  }

  async function handleStartBatchSteamGrid(
    scrapeHeroes: boolean,
    scrapeLogos: boolean,
    onlyMissing: boolean
  ) {
    setIsBatchSteamGridScraping(true);
    try {
      await batchScrapeSteamGrid(scrapeHeroes, scrapeLogos, onlyMissing);
    } catch (e) {
      setIsBatchSteamGridScraping(false);
      const msg =
        typeof e === "string"
          ? e
          : e instanceof Error
          ? e.message
          : "Error al iniciar descarga masiva de SteamGridDB";
      window.dispatchEvent(new CustomEvent("app-error", { detail: msg }));
    }
  }

  async function handleCancelBatchSteamGrid() {
    try {
      await cancelBatchScrapeSteamGrid();
    } catch (e) {
      console.error("Cancel batch SGDB scrape failed:", e);
    }
  }

  function handleRegionChange(r: string) {
    setRegionPref(r);
    localStorage.setItem("gameflix_region_pref", r);
  }

  async function handleExport() {
    try {
      const json = await exportLibrary();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "gameflix-backup.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
      window.dispatchEvent(new CustomEvent("app-error", { detail: "Error al exportar" }));
    }
  }

  async function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importLibrary(text);
      window.location.reload();
    } catch (err) {
      console.error("Import failed:", err);
      window.dispatchEvent(new CustomEvent("app-error", { detail: "Error al importar" }));
    }
  }

  return {
    biosFolders,
    setBiosFolders,
    handleAddBiosFolder,
    requestRemoveBiosFolder,
    videoFolders,
    setVideoFolders,
    handleAddVideoFolder,
    requestRemoveVideoFolder,
    videoStats,
    scanningLocalVideos,
    handleScanLocalVideos,
    isBatchScraping,
    batchProgress,
    handleStartBatchScrape,
    handleCancelBatchScrape,
    isBatchSteamGridScraping,
    batchSteamGridProgress,
    handleStartBatchSteamGrid,
    handleCancelBatchSteamGrid,
    regionPref,
    handleRegionChange,
    handleExport,
    handleImport,
  };
}
