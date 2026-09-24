import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "../hooks/useFocusTrap";
import type { Game, GameMetadata, GameAchievementProgress, SGDBHero, SGDBLogo } from "../types";
import {
  launchGame,
  toggleFavorite,
  getCoverUrl,
  getGameMetadata,
  getGameAchievements,
  refreshGameAchievements,
  getRACredentials,
  getSteamGridDBKey,
  searchSteamGridDBHeroes,
  setGameHero,
  removeGameHero,
  searchSteamGridDBLogos,
  setGameLogo,
  removeGameLogo,
  onRetroarchExited,
  updateGameTitle,
} from "../lib/tauri";
import { PLATFORM_COLORS } from "../lib/platforms";
import { ConsoleIcon } from "./ConsoleIcon";
import AchievementList from "./AchievementList";
import FixMatchModal from "./FixMatchModal";
import "./GameDetailModal.css";

interface Props {
  game: Game;
  onClose: () => void;
  onFavoriteChanged?: (gameId: string, isFav: boolean) => void;
  onHeroChanged?: (gameId: string, heroPath: string | null) => void;
  onLogoChanged?: (gameId: string, logoPath: string | null) => void;
  onGameUpdated?: (updatedGame: Game) => void;
}

function formatPlayTime(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "Sin jugar";
  if (seconds < 60) return "< 1 min";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
}

export default function GameDetailModal({
  game,
  onClose,
  onFavoriteChanged,
  onHeroChanged,
  onLogoChanged,
  onGameUpdated,
}: Props) {
  const { t } = useTranslation();
  const trapRef = useFocusTrap<HTMLDivElement>();
  const [currentGame, setCurrentGame] = useState<Game>(game);
  const [showFixMatch, setShowFixMatch] = useState(false);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [titleSaving, setTitleSaving] = useState(false);

  useEffect(() => {
    setCurrentGame(game);
  }, [game]);

  function handleStartEditTitle() {
    setEditedTitle(currentGame.display_name || metadata?.display_name || currentGame.name);
    setIsEditingTitle(true);
  }

  async function handleSaveTitle() {
    if (!editedTitle.trim()) return;
    setTitleSaving(true);
    try {
      const updated = await updateGameTitle(currentGame.id, editedTitle.trim());
      setCurrentGame(updated);
      onGameUpdated?.(updated);
      setIsEditingTitle(false);
    } catch (err) {
      console.error("Error al actualizar título:", err);
    } finally {
      setTitleSaving(false);
    }
  }

  async function handleRestoreTitle() {
    setTitleSaving(true);
    try {
      const updated = await updateGameTitle(currentGame.id, "");
      setCurrentGame(updated);
      onGameUpdated?.(updated);
      setIsEditingTitle(false);
    } catch (err) {
      console.error("Error al restaurar título:", err);
    } finally {
      setTitleSaving(false);
    }
  }

  function handleFixMatchApplied(updated: Game) {
    setCurrentGame(updated);
    if (updated.cover_path) {
      setCoverSrc(getCoverUrl(updated.cover_path));
    }
    if (updated.hero_path) {
      setHeroSrc(getCoverUrl(updated.hero_path));
    }
    if (updated.logo_path) {
      setLogoSrc(getCoverUrl(updated.logo_path));
    }
    getGameMetadata(updated.rom_path)
      .then((meta) => {
        if (meta) setMetadata(meta);
      })
      .catch(console.error);
    onGameUpdated?.(updated);
  }

  const color = PLATFORM_COLORS[currentGame.platform] ?? "#333";
  const [coverSrc, setCoverSrc] = useState("");
  const [heroSrc, setHeroSrc] = useState("");
  const [logoSrc, setLogoSrc] = useState("");
  const [metadata, setMetadata] = useState<GameMetadata | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [achievements, setAchievements] = useState<GameAchievementProgress | null>(null);
  const [achievementsLoading, setAchievementsLoading] = useState(false);
  const [hasRACredentials, setHasRACredentials] = useState(false);

  // SteamGridDB Hero Picker State
  const [showHeroPicker, setShowHeroPicker] = useState(false);
  const [heroQuery, setHeroQuery] = useState("");
  const [heroesList, setHeroesList] = useState<SGDBHero[]>([]);
  const [heroesLoading, setHeroesLoading] = useState(false);
  const [heroActionLoading, setHeroActionLoading] = useState(false);
  const [heroError, setHeroError] = useState<string | null>(null);
  const [hasSGDBKey, setHasSGDBKey] = useState(false);

  // SteamGridDB Logo Picker State
  const [showLogoPicker, setShowLogoPicker] = useState(false);
  const [logoQuery, setLogoQuery] = useState("");
  const [logosList, setLogosList] = useState<SGDBLogo[]>([]);
  const [logosLoading, setLogosLoading] = useState(false);
  const [logoActionLoading, setLogoActionLoading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCoverSrc(getCoverUrl(game.cover_path));
    setHeroSrc(getCoverUrl(game.hero_path));
    setLogoSrc(getCoverUrl(game.logo_path));

    setMetaLoading(true);
    getGameMetadata(game.rom_path)
      .then((meta) => {
        if (!cancelled) {
          setMetadata(meta);
          setMetaLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setMetaLoading(false);
      });

    getRACredentials().then((creds) => {
      if (!cancelled && creds) {
        setHasRACredentials(true);
        setAchievementsLoading(true);
        getGameAchievements(game.rom_path)
          .then((progress) => {
            if (!cancelled) {
              setAchievements(progress);
              setAchievementsLoading(false);
            }
          })
          .catch(() => {
            if (!cancelled) setAchievementsLoading(false);
          });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [game.cover_path, game.hero_path, game.rom_path]);

  async function handleRefreshAchievements() {
    setAchievementsLoading(true);
    try {
      const progress = await refreshGameAchievements(game.rom_path);
      setAchievements(progress);
    } catch (e) {
      console.error("Achievement refresh failed:", e);
    }
    setAchievementsLoading(false);
  }

  // Auto-refresh achievements whenever RetroArch exits this game
  useEffect(() => {
    const unlisten = onRetroarchExited((exitedRomPath) => {
      if (exitedRomPath === game.rom_path) {
        setTimeout(() => {
          handleRefreshAchievements();
        }, 500);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [game.rom_path]);

  type ModalFocusTarget = "play" | "fav" | "fix-match" | "hero-picker" | "logo-picker" | "close";
  const [modalFocus, setModalFocus] = useState<ModalFocusTarget>("play");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (showHeroPicker) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowHeroPicker(false);
        }
        return;
      }

      if (showFixMatch) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowFixMatch(false);
        }
        return;
      }

      if (isEditingTitle) {
        if (e.key === "Escape") {
          e.preventDefault();
          setIsEditingTitle(false);
        }
        return;
      }

      // Si el usuario está enfocado en un input, textarea o select, no capturar flechas ni enter
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setModalFocus((prev) => {
          if (prev === "play") return "fav";
          if (prev === "fav") return "play";
          if (prev === "hero-picker") return "fix-match";
          if (prev === "logo-picker") return "hero-picker";
          if (prev === "close") return "logo-picker";
          return "play";
        });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setModalFocus((prev) => {
          if (prev === "play") return "fav";
          if (prev === "fav") return "play";
          if (prev === "fix-match") return "hero-picker";
          if (prev === "hero-picker") return "logo-picker";
          if (prev === "logo-picker") return "close";
          return "play";
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setModalFocus((prev) => {
          if (prev === "play" || prev === "fav") return "fix-match";
          return prev;
        });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setModalFocus((prev) => {
          if (prev !== "play" && prev !== "fav") return "play";
          return prev;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (modalFocus === "play") {
          handleLaunch();
        } else if (modalFocus === "fav") {
          handleFavorite();
        } else if (modalFocus === "fix-match") {
          setShowFixMatch(true);
        } else if (modalFocus === "hero-picker") {
          handleOpenHeroPicker();
        } else if (modalFocus === "logo-picker") {
          handleOpenLogoPicker();
        } else if (modalFocus === "close") {
          onClose();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalFocus, showHeroPicker, showFixMatch, isEditingTitle, game.rom_path, game.id, game.favorite]);

  async function handleLaunch() {
    try {
      await launchGame(game.rom_path);
      // Auto-refresh achievements after closing the game
      handleRefreshAchievements();
    } catch (e) {
      console.error("Launch failed:", e);
      const msg = e instanceof Error ? e.message : String(e);
      window.dispatchEvent(
        new CustomEvent("app-error", {
          detail: `Error al lanzar el juego: ${msg}`,
        })
      );
    }
  }

  async function handleFavorite() {
    try {
      const isFav = await toggleFavorite(game.id);
      onFavoriteChanged?.(game.id, isFav);
    } catch (e) {
      console.error("Favorite failed:", e);
      window.dispatchEvent(
        new CustomEvent("app-error", { detail: "Error al actualizar favorito" })
      );
    }
  }

  async function handleOpenHeroPicker() {
    setShowHeroPicker(true);
    setHeroError(null);
    const key = await getSteamGridDBKey();
    if (!key) {
      setHasSGDBKey(false);
      setHeroError(
        "No has configurado tu API Key de SteamGridDB. Puedes agregarla en Configuración."
      );
      return;
    }
    setHasSGDBKey(true);
    const defaultSearch = game.display_name || metadata?.display_name || game.name;
    setHeroQuery(defaultSearch);
    fetchHeroes(defaultSearch);
  }

  async function fetchHeroes(query: string) {
    if (!query.trim()) return;
    setHeroesLoading(true);
    setHeroError(null);
    try {
      const results = await searchSteamGridDBHeroes(query);
      setHeroesList(results);
      if (results.length === 0) {
        setHeroError(
          "No se encontraron heroes para esta búsqueda. Intenta con otro nombre."
        );
      }
    } catch (e) {
      const msg =
        typeof e === "string"
          ? e
          : e instanceof Error
          ? e.message
          : "Error al buscar heroes";
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
      setHeroSrc(getCoverUrl(savedPath));
      onHeroChanged?.(game.id, savedPath);
      setShowHeroPicker(false);
    } catch (e) {
      const msg =
        typeof e === "string"
          ? e
          : e instanceof Error
          ? e.message
          : "Error al descargar el hero";
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
      setHeroSrc("");
      onHeroChanged?.(game.id, null);
      setShowHeroPicker(false);
    } catch (e) {
      const msg =
        typeof e === "string"
          ? e
          : e instanceof Error
          ? e.message
          : "Error al quitar el hero";
      setHeroError(msg);
    } finally {
      setHeroActionLoading(false);
    }
  }

  async function handleOpenLogoPicker() {
    setShowLogoPicker(true);
    setLogoError(null);
    const key = await getSteamGridDBKey();
    if (!key) {
      setHasSGDBKey(false);
      setLogoError(
        "No has configurado tu API Key de SteamGridDB. Puedes agregarla en Configuración."
      );
      return;
    }
    setHasSGDBKey(true);
    const defaultSearch = currentGame.display_name || metadata?.display_name || currentGame.name;
    setLogoQuery(defaultSearch);
    fetchLogos(defaultSearch);
  }

  async function fetchLogos(query: string) {
    if (!query.trim()) return;
    setLogosLoading(true);
    setLogoError(null);
    try {
      const results = await searchSteamGridDBLogos(query);
      setLogosList(results);
      if (results.length === 0) {
        setLogoError(
          "No se encontraron logos para esta búsqueda. Intenta con otro nombre."
        );
      }
    } catch (e) {
      const msg =
        typeof e === "string"
          ? e
          : e instanceof Error
          ? e.message
          : "Error al buscar logos";
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
      const savedPath = await setGameLogo(currentGame.id, logo.url);
      setLogoSrc(getCoverUrl(savedPath));
      setCurrentGame((prev) => ({ ...prev, logo_path: savedPath }));
      onLogoChanged?.(currentGame.id, savedPath);
      setShowLogoPicker(false);
    } catch (e) {
      const msg =
        typeof e === "string"
          ? e
          : e instanceof Error
          ? e.message
          : "Error al descargar el logo";
      setLogoError(msg);
    } finally {
      setLogoActionLoading(false);
    }
  }

  async function handleRemoveLogo() {
    setLogoActionLoading(true);
    setLogoError(null);
    try {
      await removeGameLogo(currentGame.id);
      setLogoSrc("");
      setCurrentGame((prev) => ({ ...prev, logo_path: null }));
      onLogoChanged?.(currentGame.id, null);
      setShowLogoPicker(false);
    } catch (e) {
      const msg =
        typeof e === "string"
          ? e
          : e instanceof Error
          ? e.message
          : "Error al quitar el logo";
      setLogoError(msg);
    } finally {
      setLogoActionLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal-widescreen"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={currentGame.display_name || game.name}
        tabIndex={-1}
        ref={trapRef}
      >
        {/* Columna Izquierda: 1 columna y 3 filas (70% Cover, 20% Jugar, 10% Favorito y Tiempo) */}
        <div className="modal-left-column">
          {/* Fila 1 (70%): Cover del juego */}
          <div className="modal-left-row-cover">
            {coverSrc ? (
              <img
                src={coverSrc}
                alt={currentGame.display_name || game.name}
                className="modal-poster-img"
              />
            ) : (
              <div className="modal-poster-placeholder">
                <span className="modal-poster-initial">
                  {(currentGame.display_name || game.name).charAt(0).toUpperCase()}
                </span>
                <span className="modal-poster-plat" style={{ color }}>
                  {game.platform}
                </span>
              </div>
            )}
          </div>

          {/* Fila 2 (10%): Favorito y Tiempo jugado */}
          <div className="modal-left-row-subactions">
            <button
              type="button"
              className={`modal-btn modal-btn-fav ${game.favorite ? "active" : ""} ${modalFocus === "fav" ? "focused" : ""}`}
              onClick={handleFavorite}
              title={game.favorite ? "Quitar de favoritos" : "Añadir a favoritos"}
            >
              {game.favorite ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              )}
              <span>{t("hero.favorite")}</span>
            </button>

            <div className="modal-playtime-chip" title={t("hero.timePlayed")}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="modal-playtime-val">{formatPlayTime(game.play_time_secs)}</span>
            </div>
          </div>

          {/* Fila 3 (20%): Botón JUGAR */}
          <div className="modal-left-row-play">
            <button
              type="button"
              className={`modal-btn modal-btn-play ${modalFocus === "play" ? "focused" : ""}`}
              onClick={handleLaunch}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>{t("hero.playNow").toUpperCase()}</span>
            </button>
          </div>
        </div>

        {/* Columna Derecha: 1 columna y 4 filas */}
        <div className="modal-right-column">
          <button className={`modal-close ${modalFocus === "close" ? "focused" : ""}`} onClick={onClose} aria-label={t("common.close")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          {/* Fila 1: Tags de consola + Botones de herramientas */}
          <div className="modal-row-tags-tools">
            <div className="modal-platform-badge-wrap">
              <span className="modal-platform-pill" style={{ borderColor: color, color }}>
                <ConsoleIcon platform={game.platform} size={14} />
                <span>{game.platform}</span>
              </span>
            </div>

            <div className="modal-action-tools">
              <button
                type="button"
                className={`modal-tool-btn ${modalFocus === "fix-match" ? "focused" : ""}`}
                onClick={() => setShowFixMatch(true)}
                title={t("gameDetail.fixMatch")}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M9 9h6v6H9z" />
                  <path d="m21 15-3-3 3-3" />
                </svg>
                <span>{t("common.edit")}</span>
              </button>
              <button
                type="button"
                className={`modal-tool-btn ${modalFocus === "hero-picker" ? "focused" : ""}`}
                onClick={handleOpenHeroPicker}
                title="Cambiar Hero / Banner en SteamGridDB"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
                  <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
                  <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
                  <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
                </svg>
                <span>{currentGame.hero_path || heroSrc ? "Cambiar Hero" : "Elegir Hero"}</span>
              </button>
              <button
                type="button"
                className={`modal-tool-btn ${modalFocus === "logo-picker" ? "focused" : ""}`}
                onClick={handleOpenLogoPicker}
                title="Cambiar Logo transparente en SteamGridDB"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7V4h16v3" />
                  <path d="M9 20h6" />
                  <path d="M12 4v16" />
                </svg>
                <span>{currentGame.logo_path || logoSrc ? "Cambiar Logo" : "Elegir Logo"}</span>
              </button>
            </div>
          </div>

          {/* Fila 2: Hero con difuminación arriba y abajo + Nombre del juego */}
          <div className="modal-row-hero-title">
            {heroSrc ? (
              <img src={heroSrc} alt="" className="modal-hero-bg-img" />
            ) : (
              <div
                className="modal-hero-fallback-bg"
                style={{ background: `radial-gradient(ellipse at center, ${color}44 0%, rgba(18, 22, 28, 0.95) 75%)` }}
              />
            )}
            <div className="modal-hero-vignette" />

            <div className="modal-hero-content">
              {isEditingTitle ? (
                <div className="modal-title-edit-wrap">
                  <input
                    type="text"
                    className="modal-title-edit-input"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") handleSaveTitle();
                      if (e.key === "Escape") setIsEditingTitle(false);
                    }}
                    autoFocus
                    placeholder="Nombre del juego..."
                  />
                  <div className="modal-title-edit-actions">
                    <button
                      type="button"
                      className="modal-title-btn-save"
                      onClick={handleSaveTitle}
                      disabled={titleSaving || !editedTitle.trim()}
                      title="Guardar nombre"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Guardar</span>
                    </button>
                    <button
                      type="button"
                      className="modal-title-btn-cancel"
                      onClick={() => setIsEditingTitle(false)}
                      disabled={titleSaving}
                      title="Cancelar"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                    {currentGame.custom_title && (
                      <button
                        type="button"
                        className="modal-title-btn-restore"
                        onClick={handleRestoreTitle}
                        disabled={titleSaving}
                        title="Restaurar al nombre por defecto del archivo o metadatos"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 7v6h6" />
                          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                        </svg>
                        <span>Restaurar original</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="modal-title-wrap">
                  {logoSrc ? (
                    <div className="modal-title-logo-wrap" title={currentGame.display_name || metadata?.display_name || currentGame.name}>
                      <img
                        src={logoSrc}
                        alt={currentGame.display_name || metadata?.display_name || currentGame.name}
                        className="modal-title-logo-img"
                      />
                    </div>
                  ) : (
                    <h2 className="modal-title">
                      {currentGame.display_name || metadata?.display_name || currentGame.name}
                    </h2>
                  )}
                  <button
                    type="button"
                    className="modal-btn-edit-title"
                    onClick={handleStartEditTitle}
                    title="Modificar nombre mostrado manualmente"
                  >
                    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      <path d="m15 5 4 4" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Fila 3: Información de año, compañía, región, etc. */}
          <div className="modal-row-metadata">
            {metaLoading ? (
              <div className="modal-meta-loading">Cargando información...</div>
            ) : (
              <div className="modal-meta-chips">
                {metadata?.release_year && (
                  <span className="modal-meta-chip">
                    <svg className="modal-chip-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                      <line x1="16" x2="16" y1="2" y2="6"/>
                      <line x1="8" x2="8" y1="2" y2="6"/>
                      <line x1="3" x2="21" y1="10" y2="10"/>
                    </svg>
                    <span>{metadata.release_year}</span>
                  </span>
                )}
                {(metadata?.genre || game.genre) && (
                  <span className="modal-meta-chip">
                    <svg className="modal-chip-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    <span>{metadata?.genre || game.genre}</span>
                  </span>
                )}
                {metadata?.developer && (
                  <span className="modal-meta-chip">
                    <svg className="modal-chip-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 18 22 12 16 6"/>
                      <polyline points="8 6 2 12 8 18"/>
                    </svg>
                    <span>{metadata.developer}</span>
                  </span>
                )}
                {metadata?.publisher && metadata.publisher !== metadata?.developer && (
                  <span className="modal-meta-chip">
                    <svg className="modal-chip-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
                      <path d="M9 22v-4h6v4"/>
                      <path d="M8 6h.01"/>
                      <path d="M16 6h.01"/>
                      <path d="M8 10h.01"/>
                      <path d="M16 10h.01"/>
                    </svg>
                    <span>{metadata.publisher}</span>
                  </span>
                )}
                {metadata?.region && (
                  <span className="modal-meta-chip">
                    <svg className="modal-chip-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="2" x2="22" y1="12" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                    <span>{metadata.region}</span>
                  </span>
                )}
                {metadata?.rating && (
                  <span className="modal-meta-chip">
                    <svg className="modal-chip-svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    <span>{metadata.rating}</span>
                  </span>
                )}
                {metadata?.franchise && (
                  <span className="modal-meta-chip">
                    <svg className="modal-chip-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="6" x2="10" y1="12" y2="12"/>
                      <line x1="8" x2="8" y1="10" y2="14"/>
                      <line x1="15" x2="15.01" y1="13" y2="13"/>
                      <line x1="18" x2="18.01" y1="11" y2="11"/>
                      <rect width="20" height="12" x="2" y="6" rx="6"/>
                    </svg>
                    <span>{metadata.franchise}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Fila 4: Logros RetroAchievements */}
          {hasRACredentials && (
            <div className="modal-row-achievements">
              {achievementsLoading ? (
                <div className="achievements-loading-box">
                  <span className="meta-loading">Cargando logros de RetroAchievements...</span>
                </div>
              ) : achievements && achievements.total > 0 ? (
                <AchievementList
                  progress={achievements}
                  onRefresh={handleRefreshAchievements}
                  refreshing={achievementsLoading}
                />
              ) : (
                <div className="no-achievements-notice">
                  <div className="no-achievements-icon-wrap">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                      <path d="M4 22h16"/>
                      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                    </svg>
                  </div>
                  <div className="no-achievements-info">
                    <span className="no-achievements-title">RetroAchievements</span>
                    <span className="no-achievements-desc">
                      Este juego no cuenta actualmente con un set de logros publicado en RetroAchievements.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hero Picker Overlay */}
        {showHeroPicker && (
          <div className="hero-picker-overlay" onClick={() => setShowHeroPicker(false)}>
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
                <button className="hero-picker-close" onClick={() => setShowHeroPicker(false)}>
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
                    {(game.hero_path || heroSrc) && (
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
        )}

        {/* Modal Selector de Logos de SteamGridDB */}
        {showLogoPicker && (
          <div className="hero-picker-overlay" onClick={() => setShowLogoPicker(false)}>
            <div
              className="hero-picker-modal logo-picker-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="hero-picker-header">
                <div className="hero-picker-header-text">
                  <h3>Elegir Logo en SteamGridDB</h3>
                  <p>Selecciona un logo oficial transparente para reemplazar el título en texto</p>
                </div>
                <button
                  type="button"
                  className="hero-picker-close"
                  onClick={() => setShowLogoPicker(false)}
                >
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

                  {logoError && (
                    <div className="hero-picker-error">{logoError}</div>
                  )}

                  {logosLoading ? (
                    <div className="hero-picker-loading">
                      <div className="hero-spinner" />
                      <span>Buscando logos transparentes...</span>
                    </div>
                  ) : (
                    <div className="hero-picker-grid logo-picker-grid">
                      {logosList.map((logo) => (
                        <div
                          key={logo.id}
                          className="hero-picker-card logo-picker-card"
                          onClick={() => !logoActionLoading && handleSelectLogo(logo)}
                        >
                          <div className="logo-picker-img-wrapper">
                            <img
                              src={logo.thumb || logo.url}
                              alt={`Logo ${logo.id}`}
                              className="logo-picker-card-img"
                              loading="lazy"
                            />
                          </div>
                          <div className="hero-picker-card-overlay">
                            <span className="hero-picker-card-res">
                              {logo.width} × {logo.height}
                            </span>
                            {logo.author?.name && (
                              <span className="hero-picker-card-author">
                                por {logo.author.name}
                              </span>
                            )}
                            <button
                              type="button"
                              className="hero-picker-card-select"
                              disabled={logoActionLoading}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!logoActionLoading) handleSelectLogo(logo);
                              }}
                            >
                              {logoActionLoading ? "Descargando..." : "Seleccionar"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="hero-picker-footer">
                    {(currentGame.logo_path || logoSrc) && (
                      <button
                        type="button"
                        className="hero-picker-btn-remove"
                        onClick={handleRemoveLogo}
                        disabled={logoActionLoading}
                      >
                        Quitar Logo actual (usar texto)
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
        )}

        {showFixMatch && (
          <FixMatchModal
            game={currentGame}
            onClose={() => setShowFixMatch(false)}
            onMatchApplied={handleFixMatchApplied}
          />
        )}
      </div>
    </div>
  );
}

