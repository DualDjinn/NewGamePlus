import { useState, useEffect } from "react";
import type { Game, SGDBHero } from "../types";
import {
  getSteamGridDBKey,
  searchSteamGridDBHeroes,
  setGameHero,
  removeGameHero,
} from "../lib/tauri";

interface Props {
  game: Game;
  isOpen: boolean;
  onClose: () => void;
  onHeroSelected: (newHeroPath: string | null) => void;
}

export default function HeroPickerModal({
  game,
  isOpen,
  onClose,
  onHeroSelected,
}: Props) {
  const [heroQuery, setHeroQuery] = useState("");
  const [heroesList, setHeroesList] = useState<SGDBHero[]>([]);
  const [heroesLoading, setHeroesLoading] = useState(false);
  const [heroActionLoading, setHeroActionLoading] = useState(false);
  const [heroError, setHeroError] = useState<string | null>(null);
  const [hasSGDBKey, setHasSGDBKey] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const defaultSearch = game.display_name || game.name;
    setHeroQuery(defaultSearch);
    setHeroError(null);

    getSteamGridDBKey().then((key) => {
      if (!key) {
        setHasSGDBKey(false);
        setHeroError(
          "No has configurado tu API Key de SteamGridDB. Puedes agregarla en Configuración."
        );
      } else {
        setHasSGDBKey(true);
        fetchHeroes(defaultSearch);
      }
    }).catch(() => {
      setHasSGDBKey(false);
      setHeroError("No has configurado tu API Key de SteamGridDB. Puedes agregarla en Configuración.");
    });
  }, [isOpen, game]);

  async function fetchHeroes(query: string) {
    if (!query.trim()) return;
    setHeroesLoading(true);
    setHeroError(null);
    try {
      const results = await searchSteamGridDBHeroes(query);
      setHeroesList(results);
      if (results.length === 0) {
        setHeroError("No se encontraron heroes para esta búsqueda. Intenta con otro nombre.");
      }
    } catch (e) {
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : "Error al buscar heroes";
      setHeroError(msg);
      setHeroesList([]);
    } finally {
      setHeroesLoading(false);
    }
  }

  async function handleSelectHero(hero: SGDBHero) {
    setHeroActionLoading(true);
    setHeroError(null);
    try {
      const savedPath = await setGameHero(game.id, hero.url);
      onHeroSelected(savedPath);
      onClose();
    } catch (e) {
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : "Error al descargar el hero";
      setHeroError(msg);
    } finally {
      setHeroActionLoading(false);
    }
  }

  async function handleRemoveHero() {
    setHeroActionLoading(true);
    setHeroError(null);
    try {
      await removeGameHero(game.id);
      onHeroSelected(null);
      onClose();
    } catch (e) {
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : "Error al quitar el hero";
      setHeroError(msg);
    } finally {
      setHeroActionLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="hero-picker-overlay" onClick={onClose}>
      <div className="hero-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hero-picker-header">
          <div className="hero-picker-title-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
              <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
              <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
              <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
            </svg>
            <h3>Galería de Heroes (SteamGridDB)</h3>
          </div>
          <button className="hero-picker-close" onClick={onClose} title="Cerrar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {hasSGDBKey ? (
          <>
            <div className="hero-picker-search">
              <input
                type="text"
                className="hero-picker-input"
                value={heroQuery}
                onChange={(e) => setHeroQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") fetchHeroes(heroQuery);
                }}
                placeholder="Buscar por nombre del juego..."
              />
              <button
                className="hero-picker-btn-search"
                onClick={() => fetchHeroes(heroQuery)}
                disabled={heroesLoading}
              >
                {heroesLoading ? "Buscando..." : "Buscar"}
              </button>
            </div>

            {heroError && <p className="hero-picker-error">{heroError}</p>}

            {heroesLoading ? (
              <div className="hero-picker-loading">
                <div className="hero-spinner" />
                <span>Buscando banners panorámicos en SteamGridDB...</span>
              </div>
            ) : (
              <div className="hero-picker-grid">
                {heroesList.map((hero) => (
                  <div
                    key={hero.id}
                    className="hero-picker-card"
                    onClick={() => !heroActionLoading && handleSelectHero(hero)}
                  >
                    <img
                      src={hero.thumb || hero.url}
                      alt={`Hero ${hero.id}`}
                      className="hero-picker-card-img"
                      loading="lazy"
                    />
                    <div className="hero-picker-card-overlay">
                      <span className="hero-picker-card-res">
                        {hero.width} × {hero.height}
                      </span>
                      {hero.author?.name && (
                        <span className="hero-picker-card-author">
                          por {hero.author.name}
                        </span>
                      )}
                      <button
                        type="button"
                        className="hero-picker-card-select"
                        disabled={heroActionLoading}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!heroActionLoading) handleSelectHero(hero);
                        }}
                      >
                        {heroActionLoading ? "Descargando..." : "Seleccionar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="hero-picker-footer">
              {game.hero_path && (
                <button
                  type="button"
                  className="hero-picker-btn-remove"
                  onClick={handleRemoveHero}
                  disabled={heroActionLoading}
                >
                  Quitar Hero actual (usar carátula)
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="hero-picker-no-key">
            <p>{heroError}</p>
          </div>
        )}
      </div>
    </div>
  );
}
