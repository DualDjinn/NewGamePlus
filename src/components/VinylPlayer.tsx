import React, { useState, useEffect, useRef } from "react";
import { Game } from "../types";
import { useMusic } from "../context/MusicContext";

interface VinylPlayerProps {
  games?: Game[];
  collapsed?: boolean;
  mode?: "sidebar" | "navbar" | "collapsed";
}

export const VinylPlayer: React.FC<VinylPlayerProps> = ({ collapsed = false, mode = "sidebar" }) => {
  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    coverUrl,
    togglePlay,
    handleNextTrack,
    handlePrevTrack,
    handleVolumeChange,
    toggleMute,
  } = useMusic();

  const [expanded, setExpanded] = useState(false);
  const navbarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!expanded) return;
    const handleOutside = (e: MouseEvent) => {
      if (navbarRef.current && !navbarRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    window.addEventListener("click", handleOutside);
    return () => window.removeEventListener("click", handleOutside);
  }, [expanded]);

  if (mode === "navbar") {
    if (!expanded) {
      return (
        <div
          ref={navbarRef}
          className="vinyl-player-navbar vinyl-player-navbar-compact"
          title={`${currentTrack.title} — ${currentTrack.game} (Clic para abrir reproductor)`}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
          role="button"
          tabIndex={0}
          aria-label="Abrir reproductor de música"
        >
          <div className="vinyl-disc-wrapper vinyl-navbar-disc">
            <div className={`vinyl-disc-body ${isPlaying ? "vinyl-spinning" : "vinyl-paused"}`}>
              {coverUrl ? (
                <img src={coverUrl} alt={currentTrack.game} className="vinyl-center-cover" />
              ) : (
                <div className="vinyl-center-placeholder"><span>♪</span></div>
              )}
              <div className="vinyl-center-spindle" />
            </div>
            {isPlaying && <div className="vinyl-playing-indicator" />}
          </div>
        </div>
      );
    }

    return (
      <div
        ref={navbarRef}
        className="vinyl-player-navbar vinyl-player-navbar-expanded"
        title={`${currentTrack.title} — ${currentTrack.game}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mini disco de vinilo - al hacer clic colapsa */}
        <div
          className="vinyl-disc-wrapper vinyl-navbar-disc"
          onClick={() => setExpanded(false)}
          role="button"
          tabIndex={0}
          aria-label="Minimizar reproductor"
          title="Minimizar reproductor"
        >
          <div className={`vinyl-disc-body ${isPlaying ? "vinyl-spinning" : "vinyl-paused"}`}>
            {coverUrl ? (
              <img src={coverUrl} alt={currentTrack.game} className="vinyl-center-cover" />
            ) : (
              <div className="vinyl-center-placeholder"><span>♪</span></div>
            )}
            <div className="vinyl-center-spindle" />
          </div>
          {isPlaying && <div className="vinyl-playing-indicator" />}
        </div>

        {/* Waveform animado */}
        <div
          className={`vinyl-navbar-waves ${isPlaying ? "active" : ""}`}
          onClick={togglePlay}
          role="button"
          tabIndex={0}
          title={isPlaying ? "Pausar" : "Reproducir"}
        >
          <span className="wave-bar bar-1" />
          <span className="wave-bar bar-2" />
          <span className="wave-bar bar-3" />
          <span className="wave-bar bar-4" />
        </div>

        {/* Info */}
        <div className="vinyl-navbar-info">
          <span className="vinyl-navbar-title">{currentTrack.title}</span>
          <span className="vinyl-navbar-sep">•</span>
          <span className="vinyl-navbar-game">{currentTrack.game}</span>
        </div>

        {/* Controles de reproducción */}
        <div className="vinyl-navbar-controls">
          <button
            type="button"
            onClick={handlePrevTrack}
            className="vinyl-btn-icon vinyl-navbar-btn"
            title="Pista anterior"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="vinyl-btn-play vinyl-navbar-play-btn"
            title={isPlaying ? "Pausa" : "Play"}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={handleNextTrack}
            className="vinyl-btn-icon vinyl-navbar-btn"
            title="Pista siguiente"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>

        {/* Separador */}
        <div className="vinyl-navbar-divider" />

        {/* Control de Volumen */}
        <div className="vinyl-navbar-volume">
          <button
            type="button"
            onClick={toggleMute}
            className="vinyl-btn-mute vinyl-navbar-mute-btn"
            title={isMuted || volume === 0 ? "Activar sonido" : "Silenciar"}
          >
            {isMuted || volume === 0 ? (
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="vinyl-volume-slider vinyl-navbar-volume-slider"
            title={`Volumen: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            aria-label="Volumen"
          />
        </div>

        {/* Botón cerrar/colapsar */}
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="vinyl-navbar-close-btn"
          title="Minimizar reproductor"
          aria-label="Minimizar reproductor"
        >
          ✕
        </button>
      </div>
    );
  }

  if (collapsed || mode === "collapsed") {
    return (
      <div className="vinyl-player-collapsed" title={`${currentTrack.title} — ${currentTrack.game} (Click para reproducir/pausar)`}>
        <div
          className="vinyl-disc-wrapper"
          onClick={togglePlay}
          role="button"
          tabIndex={0}
          aria-label={isPlaying ? "Pausar música" : "Reproducir música"}
        >
          <div className={`vinyl-disc-body ${isPlaying ? "vinyl-spinning" : "vinyl-paused"}`}>
            {coverUrl ? (
              <img src={coverUrl} alt={currentTrack.game} className="vinyl-center-cover" />
            ) : (
              <div className="vinyl-center-placeholder"><span>♪</span></div>
            )}
            <div className="vinyl-center-spindle" />
          </div>
          {isPlaying && <div className="vinyl-playing-indicator" />}
        </div>
      </div>
    );
  }

  return (
    <div className="vinyl-player-card" title={`${currentTrack.title} — ${currentTrack.game}`}>
      {/* Fila Superior: Disco de Vinilo + Info Amplia */}
      <div className="vinyl-card-top">
        <div
          className="vinyl-disc-wrapper"
          onClick={togglePlay}
          role="button"
          tabIndex={0}
          aria-label={isPlaying ? "Pausar música" : "Reproducir música"}
        >
          <div className={`vinyl-disc-body ${isPlaying ? "vinyl-spinning" : "vinyl-paused"}`}>
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={currentTrack.game}
                className="vinyl-center-cover"
              />
            ) : (
              <div className="vinyl-center-placeholder">
                <span>♪</span>
              </div>
            )}
            <div className="vinyl-center-spindle" />
          </div>
          {isPlaying && <div className="vinyl-playing-indicator" />}
        </div>

        <div className="vinyl-card-info">
          <div className="vinyl-track-title" title={currentTrack.title}>
            {currentTrack.title}
          </div>
          <div className="vinyl-track-game" title={currentTrack.game}>
            <span className="vinyl-platform-tag">{currentTrack.platform}</span>
            <span className="vinyl-game-name">{currentTrack.game}</span>
          </div>
        </div>
      </div>

      {/* Fila Inferior: Controles de Reproducción y Slider de Volumen */}
      <div className="vinyl-card-bottom">
        <div className="vinyl-controls-section">
          <button
            type="button"
            onClick={handlePrevTrack}
            className="vinyl-btn-icon"
            title="Pista anterior"
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="vinyl-btn-play"
            title={isPlaying ? "Pausa" : "Play"}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={handleNextTrack}
            className="vinyl-btn-icon"
            title="Pista siguiente"
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>

        <div className="vinyl-volume-section">
          <button
            type="button"
            onClick={toggleMute}
            className="vinyl-btn-mute"
            title={isMuted || volume === 0 ? "Activar sonido" : "Silenciar"}
          >
            {isMuted || volume === 0 ? (
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="vinyl-volume-slider"
            aria-label="Volumen"
          />
        </div>
      </div>
    </div>
  );
};
