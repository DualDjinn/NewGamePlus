import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Game, SGDBHero } from "../types";
import {
  getSteamGridDBKey,
  searchSteamGridDBHeroes,
  setGameHero,
  removeGameHero,
  autoDownloadHero,
} from "../lib/tauri";
import "./GameDetailModal.css";

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
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;

    const defaultSearch = game.display_name || game.name;
    setHeroQuery(defaultSearch);
    setHeroError(null);

    getSteamGridDBKey().then((key) => {
      if (!key) {
        setHasSGDBKey(false);
        setHeroError(t("pickers.sgdbKeyMissing"));
      } else {
        setHasSGDBKey(true);
        fetchHeroes(defaultSearch);
      }
    }).catch(() => {
      setHasSGDBKey(false);
      setHeroError(t("pickers.sgdbKeyMissing"));
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
        setHeroError(t("pickers.noHeroes"));
      }
    } catch (e) {
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : t("pickers.errHeroSearch");
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
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : t("pickers.errHeroDownload");
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
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : t("pickers.errHeroRemove");
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
            <h3>{t("pickers.heroGallery")}</h3>
          </div>
          <button className="hero-picker-close" onClick={onClose} title={t("common.close")}>
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
                placeholder={t("pickers.heroSearchPh")}
              />
              <button
                className="hero-picker-btn-search"
                onClick={() => fetchHeroes(heroQuery)}
                disabled={heroesLoading || heroActionLoading}
              >
                {heroesLoading ? t("pickers.searching") : t("pickers.searchBtn")}
              </button>
              <button
                type="button"
                className="hero-picker-btn-auto"
                onClick={async () => {
                  setHeroActionLoading(true);
                  try {
                    const saved = await autoDownloadHero(game.id, heroQuery);
                    onHeroSelected(saved);
                    onClose();
                  } catch (e) {
                    const msg = typeof e === "string" ? e : e instanceof Error ? e.message : t("pickers.errDownload");
                    setHeroError(msg);
                  } finally {
                    setHeroActionLoading(false);
                  }
                }}
                disabled={heroesLoading || heroActionLoading}
                title={t("pickers.autoHeroTitle")}
              >
                {heroActionLoading ? t("pickers.downloading") : t("pickers.autoBest")}
              </button>
            </div>

            {heroError && <p className="hero-picker-error">{heroError}</p>}

            {heroesLoading ? (
              <div className="hero-picker-loading">
                <div className="hero-spinner" />
                <span>{t("pickers.loadingHeroes")}</span>
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
                          {t("pickers.byAuthor", { name: hero.author.name })}
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
                        {heroActionLoading ? t("pickers.downloading") : t("pickers.select")}
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
                  {t("pickers.removeHero")}
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
