import { useState, useEffect } from "react";
import type { Game, SGDBLogo } from "../types";
import {
  getSteamGridDBKey,
  searchSteamGridDBLogos,
  setGameLogo,
  removeGameLogo,
} from "../lib/tauri";

interface Props {
  game: Game;
  isOpen: boolean;
  onClose: () => void;
  onLogoSelected: (newLogoPath: string | null) => void;
}

export default function LogoPickerModal({
  game,
  isOpen,
  onClose,
  onLogoSelected,
}: Props) {
  const [logoQuery, setLogoQuery] = useState("");
  const [logosList, setLogosList] = useState<SGDBLogo[]>([]);
  const [logosLoading, setLogosLoading] = useState(false);
  const [logoActionLoading, setLogoActionLoading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [hasSGDBKey, setHasSGDBKey] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const defaultSearch = game.display_name || game.name;
    setLogoQuery(defaultSearch);
    setLogoError(null);

    getSteamGridDBKey().then((key) => {
      if (!key) {
        setHasSGDBKey(false);
        setLogoError(
          "No has configurado tu API Key de SteamGridDB. Puedes agregarla en Configuración."
        );
      } else {
        setHasSGDBKey(true);
        fetchLogos(defaultSearch);
      }
    }).catch(() => {
      setHasSGDBKey(false);
      setLogoError("No has configurado tu API Key de SteamGridDB. Puedes agregarla en Configuración.");
    });
  }, [isOpen, game]);

  async function fetchLogos(query: string) {
    if (!query.trim()) return;
    setLogosLoading(true);
    setLogoError(null);
    try {
      const results = await searchSteamGridDBLogos(query);
      setLogosList(results);
      if (results.length === 0) {
        setLogoError("No se encontraron logos para esta búsqueda. Intenta con otro nombre.");
      }
    } catch (e) {
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : "Error al buscar logos";
      setLogoError(msg);
      setLogosList([]);
    } finally {
      setLogosLoading(false);
    }
  }

  async function handleSelectLogo(logo: SGDBLogo) {
    setLogoActionLoading(true);
    setLogoError(null);
    try {
      const savedPath = await setGameLogo(game.id, logo.url);
      onLogoSelected(savedPath);
      onClose();
    } catch (e) {
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : "Error al descargar el logo";
      setLogoError(msg);
    } finally {
      setLogoActionLoading(false);
    }
  }

  async function handleRemoveLogo() {
    setLogoActionLoading(true);
    setLogoError(null);
    try {
      await removeGameLogo(game.id);
      onLogoSelected(null);
      onClose();
    } catch (e) {
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : "Error al quitar el logo";
      setLogoError(msg);
    } finally {
      setLogoActionLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="hero-picker-overlay" onClick={onClose}>
      <div className="hero-picker-modal logo-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hero-picker-header">
          <div className="hero-picker-header-text">
            <h3>Elegir Logo en SteamGridDB</h3>
            <p>Selecciona un logo oficial transparente para mostrarlo en el monitor de preview</p>
          </div>
          <button type="button" className="hero-picker-close" onClick={onClose} title="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {hasSGDBKey ? (
          <>
            <form
              className="hero-picker-search"
              onSubmit={(e) => {
                e.preventDefault();
                fetchLogos(logoQuery);
              }}
            >
              <input
                type="text"
                className="hero-picker-input"
                placeholder="Buscar logo por título del juego..."
                value={logoQuery}
                onChange={(e) => setLogoQuery(e.target.value)}
              />
              <button
                type="submit"
                className="hero-picker-btn-search"
                disabled={logosLoading}
              >
                {logosLoading ? "Buscando..." : "Buscar"}
              </button>
            </form>

            {logoError && <p className="hero-picker-error">{logoError}</p>}

            {logosLoading ? (
              <div className="hero-picker-loading">
                <div className="hero-spinner" />
                <span>Buscando logos en SteamGridDB...</span>
              </div>
            ) : (
              <div className="logo-picker-grid">
                {logosList.map((logo) => (
                  <div
                    key={logo.id}
                    className="logo-picker-card"
                    onClick={() => !logoActionLoading && handleSelectLogo(logo)}
                  >
                    <div className="logo-checker-bg">
                      <img
                        src={logo.thumb || logo.url}
                        alt="Logo"
                        className="logo-picker-img"
                        loading="lazy"
                      />
                    </div>
                    <div className="logo-picker-meta">
                      <span>{logo.width} × {logo.height}</span>
                      {logo.author?.name && (
                        <span>por {logo.author.name}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="hero-picker-footer">
              {game.logo_path && (
                <button
                  type="button"
                  className="hero-picker-btn-remove"
                  onClick={handleRemoveLogo}
                  disabled={logoActionLoading}
                >
                  Quitar logo actual
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="hero-picker-no-key">
            <p>{logoError}</p>
          </div>
        )}
      </div>
    </div>
  );
}
