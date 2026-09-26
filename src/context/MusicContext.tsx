import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { Game, MusicTrack } from "../types";
import { getCoverUrl, getMusicTracks, saveMusicVolume, getMusicVolume, onRetroarchExited } from "../lib/tauri";
import { convertFileSrc } from "@tauri-apps/api/core";
import { MUSIC_TRACKS } from "../data/musicTracks";

export interface MusicContextType {
  tracks: MusicTrack[];
  currentTrack: MusicTrack;
  currentIndex: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  coverUrl: string | null;
  togglePlay: () => void;
  handleNextTrack: () => void;
  handlePrevTrack: () => void;
  handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggleMute: () => void;
}

const MusicContext = createContext<MusicContextType | null>(null);

export const MusicProvider: React.FC<{ games: Game[]; children: React.ReactNode }> = ({ games, children }) => {
  const [tracks, setTracks] = useState<MusicTrack[]>(MUSIC_TRACKS);
  const [currentIndex, setCurrentIndex] = useState<number>(() =>
    Math.floor(Math.random() * (MUSIC_TRACKS.length || 1))
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem("gameflix_music_volume");
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed)) return Math.max(0, Math.min(1, parsed));
    }
    return 0.15;
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wasPlayingBeforeGameRef = useRef<boolean>(false);
  const userInteractedRef = useRef<boolean>(false);
  const fadeIntervalRef = useRef<number | null>(null);
  const isTransitioningRef = useRef<boolean>(false);

  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;
  const volumeRef = useRef<number>(volume);
  volumeRef.current = volume;
  const isMutedRef = useRef<boolean>(isMuted);
  isMutedRef.current = isMuted;

  const clearFade = () => {
    if (fadeIntervalRef.current !== null) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  };

  const fadeIn = (audio: HTMLAudioElement, targetVol: number, durationMs: number = 800) => {
    clearFade();
    if (isMuted || targetVol <= 0) {
      audio.volume = 0;
      audio.play().catch(() => {});
      return;
    }

    const startVol = Math.max(0.01, targetVol * 0.25);
    audio.volume = startVol;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          const steps = 16;
          const stepTime = durationMs / steps;
          const volStep = (targetVol - startVol) / steps;
          let currentStep = 0;

          fadeIntervalRef.current = window.setInterval(() => {
            currentStep++;
            const nextVol = Math.min(targetVol, startVol + volStep * currentStep);
            if (audio) audio.volume = nextVol;

            if (currentStep >= steps) {
              clearFade();
              if (audio) audio.volume = targetVol;
            }
          }, stepTime);
        })
        .catch(() => {
          setIsPlaying(false);
          audio.volume = targetVol;
        });
    }
  };

  const fadeOut = (audio: HTMLAudioElement, durationMs: number = 600, onComplete?: () => void) => {
    clearFade();
    if (audio.paused || audio.volume <= 0) {
      audio.pause();
      setIsPlaying(false);
      onComplete?.();
      return;
    }

    const startVol = audio.volume;
    const steps = 16;
    const stepTime = durationMs / steps;
    const volStep = startVol / steps;
    let currentStep = 0;

    fadeIntervalRef.current = window.setInterval(() => {
      currentStep++;
      const nextVol = Math.max(0, startVol - volStep * currentStep);
      if (audio) audio.volume = nextVol;

      if (currentStep >= steps || nextVol <= 0) {
        clearFade();
        if (audio) {
          audio.pause();
          audio.volume = isMuted ? 0 : volume;
        }
        setIsPlaying(false);
        onComplete?.();
      }
    }, stepTime);
  };

  useEffect(() => {
    getMusicVolume()
      .then((savedVol) => {
        if (typeof savedVol === "number" && !isNaN(savedVol)) {
          const clamped = Math.max(0, Math.min(1, savedVol));
          setVolume(clamped);
          localStorage.setItem("gameflix_music_volume", clamped.toString());
          if (audioRef.current && fadeIntervalRef.current === null) {
            audioRef.current.volume = isMuted ? 0 : clamped;
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let isMounted = true;
    function loadTracks() {
      getMusicTracks()
        .then((scanned) => {
          if (isMounted && scanned.length > 0) {
            setTracks(scanned);
          }
        })
        .catch(console.error);
    }
    loadTracks();
    window.addEventListener("music-scanned", loadTracks);
    return () => {
      isMounted = false;
      window.removeEventListener("music-scanned", loadTracks);
    };
  }, []);

  useEffect(() => {
    function handleVolumeSync(e: Event) {
      const customEvent = e as CustomEvent<number>;
      if (typeof customEvent.detail === "number") {
        const val = Math.max(0, Math.min(1, customEvent.detail));
        setVolume(val);
        if (audioRef.current && fadeIntervalRef.current === null) {
          audioRef.current.volume = isMuted ? 0 : val;
        }
      }
    }
    window.addEventListener("music-volume-changed", handleVolumeSync);
    return () => {
      window.removeEventListener("music-volume-changed", handleVolumeSync);
    };
  }, [isMuted]);

  const currentTrack: MusicTrack = tracks[currentIndex] || tracks[0] || MUSIC_TRACKS[0];

  const getTrackAudioSrc = (track: MusicTrack): string => {
    if (track.file_path) {
      try {
        return convertFileSrc(track.file_path);
      } catch {
        // fallback
      }
    }
    return encodeURI(track.file);
  };

  useEffect(() => {
    const targetGameName = (currentTrack.game || "").toLowerCase();

    const matchedGame = targetGameName
      ? games.find((g) => {
          const name = (g.display_name || g.name).toLowerCase();
          return name.includes(targetGameName) || targetGameName.includes(name);
        })
      : null;

    if (matchedGame && matchedGame.cover_path) {
      setCoverUrl(getCoverUrl(matchedGame.cover_path));
    } else {
      setCoverUrl(null);
    }
  }, [currentIndex, games, currentTrack]);

  useEffect(() => {
    if (audioRef.current && fadeIntervalRef.current === null) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    return () => {
      clearFade();
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    const targetSrc = getTrackAudioSrc(currentTrack);
    audio.src = targetSrc;
    audio.load();
    audio.volume = isMuted ? 0 : volume;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          fadeIn(audio, isMuted ? 0 : volume, 800);
        })
        .catch(() => {
          setIsPlaying(false);
          const handleFirstInteraction = () => {
            if (!userInteractedRef.current && audioRef.current) {
              userInteractedRef.current = true;
              audioRef.current.volume = isMuted ? 0 : volume;
              fadeIn(audioRef.current, isMuted ? 0 : volume, 800);
            }
            window.removeEventListener("click", handleFirstInteraction);
            window.removeEventListener("keydown", handleFirstInteraction);
          };

          window.addEventListener("click", handleFirstInteraction);
          window.addEventListener("keydown", handleFirstInteraction);
        });
    }
  }, [currentTrack?.id]);

  useEffect(() => {
    function handleGameLaunched() {
      const audio = audioRef.current;
      if (audio) {
        // Record if music was actively playing when game launched
        const currentlyPlaying = (!audio.paused && !audio.ended) || isPlayingRef.current;
        wasPlayingBeforeGameRef.current = currentlyPlaying;
        if (currentlyPlaying) {
          fadeOut(audio, 500);
        } else {
          audio.pause();
          setIsPlaying(false);
        }
      }
    }

    function handleGameClosed() {
      const audio = audioRef.current;
      if (wasPlayingBeforeGameRef.current && audio) {
        // Reset flag so it only triggers once per game session
        wasPlayingBeforeGameRef.current = false;
        fadeIn(audio, isMutedRef.current ? 0 : volumeRef.current, 800);
      }
    }

    window.addEventListener("game-launched", handleGameLaunched);
    window.addEventListener("game-closed", handleGameClosed);

    // Also listen directly to onRetroarchExited as a direct fallback
    let unlistenRetroarch: (() => void) | null = null;
    onRetroarchExited(() => {
      handleGameClosed();
    })
      .then((unlisten) => {
        unlistenRetroarch = unlisten;
      })
      .catch(() => {});

    return () => {
      window.removeEventListener("game-launched", handleGameLaunched);
      window.removeEventListener("game-closed", handleGameClosed);
      if (unlistenRetroarch) {
        unlistenRetroarch();
      }
    };
  }, []);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      fadeOut(audio, 600);
    } else {
      fadeIn(audio, isMuted ? 0 : volume, 800);
    }
  }

  function changeTrack(direction: 1 | -1) {
    const audio = audioRef.current;
    const applyNext = () => {
      isTransitioningRef.current = false;
      setCurrentIndex((prev) => {
        const len = tracks.length || 1;
        return (prev + direction + len) % len;
      });
    };

    if (audio && !audio.paused && isPlaying && !isTransitioningRef.current) {
      isTransitioningRef.current = true;
      fadeOut(audio, 600, applyNext);
    } else {
      clearFade();
      applyNext();
    }
  }

  function handleNextTrack() {
    changeTrack(1);
  }

  function handlePrevTrack() {
    changeTrack(-1);
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    localStorage.setItem("gameflix_music_volume", newVol.toString());
    saveMusicVolume(newVol).catch(console.error);
    window.dispatchEvent(new CustomEvent("music-volume-changed", { detail: newVol }));
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
    }
    if (audioRef.current) {
      clearFade();
      audioRef.current.volume = isMuted ? 0 : newVol;
    }
  }

  function toggleMute() {
    setIsMuted((prev) => !prev);
  }

  return (
    <MusicContext.Provider
      value={{
        tracks,
        currentTrack,
        currentIndex,
        isPlaying,
        volume,
        isMuted,
        coverUrl,
        togglePlay,
        handleNextTrack,
        handlePrevTrack,
        handleVolumeChange,
        toggleMute,
      }}
    >
      <audio ref={audioRef} onEnded={handleNextTrack} preload="auto" />
      {children}
    </MusicContext.Provider>
  );
};

export function useMusic(): MusicContextType {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error("useMusic must be used within a MusicProvider");
  }
  return context;
}
