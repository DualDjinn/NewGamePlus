import { useState, useEffect, useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  getAudioOutputDevices,
  getMusicTracks,
  openMusicFolder,
  saveMusicVolume,
  getMusicVolume,
  saveMusicFolders,
  getMusicFolders,
} from "../../lib/tauri";

interface UseSoundSettingsProps {
  onRemoveFolderRequest: (path: string, type: "music-folder") => void;
}

export function useSoundSettings({ onRemoveFolderRequest }: UseSoundSettingsProps) {
  const [audioDevices, setAudioDevices] = useState<string[]>([]);
  const [refreshingAudio, setRefreshingAudio] = useState(false);

  const [musicVolume, setMusicVolume] = useState<number>(() => {
    const saved = localStorage.getItem("gameflix_music_volume");
    return saved !== null ? parseFloat(saved) : 0.3;
  });

  const [sfxVolume, setSfxVolume] = useState<number>(() => {
    const saved = localStorage.getItem("gameflix_sfx_volume");
    return saved !== null ? parseFloat(saved) : 0.5;
  });

  const [musicFolders, setMusicFolders] = useState<string[]>([]);
  const [musicTrackCount, setMusicTrackCount] = useState<number | null>(null);
  const [scanningMusic, setScanningMusic] = useState(false);
  const [musicFeedback, setMusicFeedback] = useState<string | null>(null);

  const [previewVideoMuted, setPreviewVideoMuted] = useState<boolean>(() => {
    return localStorage.getItem("gameflix_preview_video_muted") !== "false";
  });
  const [previewVideoVolume, setPreviewVideoVolume] = useState<number>(() => {
    const saved = localStorage.getItem("gameflix_preview_video_volume");
    return saved !== null ? parseFloat(saved) : 0.5;
  });

  const refreshAudioDevices = useCallback(() => {
    setRefreshingAudio(true);
    getAudioOutputDevices()
      .then((devs) => setAudioDevices(devs))
      .catch((e) => console.error("Failed to get audio devices:", e))
      .finally(() => setRefreshingAudio(false));
  }, []);

  const handleScanMusic = useCallback(() => {
    setScanningMusic(true);
    setMusicFeedback(null);
    getMusicTracks()
      .then((tracks) => {
        setMusicTrackCount(tracks.length);
        setMusicFeedback(
          tracks.length > 0
            ? `Se encontraron ${tracks.length} pista(s) de música de fondo.`
            : "No se encontraron archivos de música compatibles (.mp3, .ogg, .flac, .wav)."
        );
      })
      .catch((e) => {
        console.error("Scan music failed:", e);
        setMusicFeedback("Error al escanear pistas de música.");
      })
      .finally(() => setScanningMusic(false));
  }, []);

  useEffect(() => {
    let cancelled = false;

    getAudioOutputDevices()
      .then((devs) => {
        if (!cancelled) setAudioDevices(devs);
      })
      .catch(console.error);

    getMusicVolume()
      .then((v) => {
        if (!cancelled) setMusicVolume(v);
      })
      .catch(console.error);

    getMusicFolders()
      .then((f) => {
        if (!cancelled) setMusicFolders(f);
      })
      .catch(console.error);

    getMusicTracks()
      .then((tracks) => {
        if (!cancelled) setMusicTrackCount(tracks.length);
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, []);

  function handleMusicVolumeChange(val: number) {
    setMusicVolume(val);
    localStorage.setItem("gameflix_music_volume", val.toString());
    saveMusicVolume(val).catch(console.error);
    window.dispatchEvent(new CustomEvent("music-volume-changed", { detail: val }));
  }

  function handleSfxVolumeChange(val: number) {
    setSfxVolume(val);
    localStorage.setItem("gameflix_sfx_volume", val.toString());
  }

  function handlePreviewVideoMutedChange(muted: boolean) {
    setPreviewVideoMuted(muted);
    localStorage.setItem("gameflix_preview_video_muted", muted ? "true" : "false");
    window.dispatchEvent(new CustomEvent("preview-video-muted-changed", { detail: muted }));
  }

  function handlePreviewVideoVolumeChange(val: number) {
    setPreviewVideoVolume(val);
    localStorage.setItem("gameflix_preview_video_volume", val.toString());
    window.dispatchEvent(new CustomEvent("preview-video-volume-changed", { detail: val }));
  }

  async function handleAddMusicFolder() {
    let path;
    try {
      path = await open({ directory: true, title: "Seleccionar carpeta de música (MP3, OGG, FLAC, WAV, etc.)" });
    } catch (e) {
      console.error("Music folder dialog failed:", e);
      window.dispatchEvent(new CustomEvent("app-error", { detail: "Error al abrir selector de carpeta de música" }));
      return;
    }
    if (path && !musicFolders.includes(path)) {
      const next = [...musicFolders, path];
      setMusicFolders(next);
      await saveMusicFolders(next).catch(console.error);
      handleScanMusic();
    }
  }

  function requestRemoveMusicFolder(path: string) {
    onRemoveFolderRequest(path, "music-folder");
  }

  function handleOpenMusicFolder() {
    openMusicFolder().catch(console.error);
  }

  return {
    audioDevices,
    refreshingAudio,
    refreshAudioDevices,
    musicVolume,
    handleMusicVolumeChange,
    sfxVolume,
    handleSfxVolumeChange,
    musicFolders,
    setMusicFolders,
    handleAddMusicFolder,
    requestRemoveMusicFolder,
    musicTrackCount,
    scanningMusic,
    musicFeedback,
    handleScanMusic,
    handleOpenMusicFolder,
    previewVideoMuted,
    handlePreviewVideoMutedChange,
    previewVideoVolume,
    handlePreviewVideoVolumeChange,
  };
}
