import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "../hooks/useFocusTrap";
import type { Game, GameMetadata, GameAchievementProgress } from "../types";
import {
  launchGame,
  toggleFavorite,
  getCoverUrl,
  getGameMetadata,
  getGameAchievements,
  refreshGameAchievements,
  getRACredentials,
  onRetroarchExited,
  updateGameTitle,
  findGameVideo,
  scrapeGameVideo,
  getScreenscraperConfig,
  onScrapeVideoProgress,
  loadSlot,
  listSlots,
  deleteSlot,
  autoDownloadHero,
  autoDownloadLogo,
  getSteamGridDBKey,
  type SaveSlot,
} from "../lib/tauri";
import { PLATFORM_COLORS } from "../lib/platforms";
import FixMatchModal from "./FixMatchModal";
import HeroPickerModal from "./HeroPickerModal";
import LogoPickerModal from "./LogoPickerModal";
import NetplayModal from "./NetplayModal";
import {
  DetailLeftColumn,
  DetailToolsBar,
  DetailHeroBanner,
  DetailMetadataChips,
  DetailBottomTabs,
} from "./detail";
import "./GameDetailModal.css";

interface Props {
  game: Game;
  initialAction?: "edit" | "hero" | "logo" | "video" | null;
  onClose: () => void;
  onFavoriteChanged?: (gameId: string, isFav: boolean) => void;
  onHeroChanged?: (gameId: string, heroPath: string | null) => void;
  onLogoChanged?: (gameId: string, logoPath: string | null) => void;
  onGameUpdated?: (updatedGame: Game) => void;
}

export default function GameDetailModal({
  game,
  initialAction,
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
  const [showHeroPicker, setShowHeroPicker] = useState(false);
  const [showLogoPicker, setShowLogoPicker] = useState(false);
  const [showNetplay, setShowNetplay] = useState(false);
  const [netplayCoreName, setNetplayCoreName] = useState("");

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [titleSaving, setTitleSaving] = useState(false);

  const [hasVideo, setHasVideo] = useState(false);
  const [scrapingVideo, setScrapingVideo] = useState(false);
  const [scrapingHero, setScrapingHero] = useState(false);
  const [scrapingLogo, setScrapingLogo] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const color = PLATFORM_COLORS[currentGame.platform] ?? "#333";
  const [coverSrc, setCoverSrc] = useState("");
  const [heroSrc, setHeroSrc] = useState("");
  const [logoSrc, setLogoSrc] = useState("");
  const [metadata, setMetadata] = useState<GameMetadata | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [achievements, setAchievements] = useState<GameAchievementProgress | null>(null);
  const [achievementsLoading, setAchievementsLoading] = useState(false);
  const [hasRACredentials, setHasRACredentials] = useState(false);

  // Save States
  const [bottomTab, setBottomTab] = useState<"saves" | "achievements">("achievements");
  const [saveSlots, setSaveSlots] = useState<SaveSlot[]>([]);

  useEffect(() => {
    setCurrentGame(game);
    findGameVideo(game.rom_path, game.id)
      .then((v) => setHasVideo(!!v))
      .catch(() => setHasVideo(false));
  }, [game]);

  useEffect(() => {
    const unlisten = onScrapeVideoProgress((payload) => {
      if (payload.game_id === currentGame.id) {
        setDownloadProgress(payload.percent);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [currentGame.id]);

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
    if (updated.cover_path) setCoverSrc(getCoverUrl(updated.cover_path));
    if (updated.hero_path) setHeroSrc(getCoverUrl(updated.hero_path));
    if (updated.logo_path) setLogoSrc(getCoverUrl(updated.logo_path));
    getGameMetadata(updated.rom_path)
      .then((meta) => {
        if (meta) setMetadata(meta);
      })
      .catch(console.error);
    onGameUpdated?.(updated);
  }

  const fetchSaveSlots = useCallback(async () => {
    try {
      const s = await listSlots(currentGame.id);
      setSaveSlots(s);
    } catch (err) {
      console.error("Error listing save slots:", err);
    }
  }, [currentGame.id]);

  useEffect(() => {
    fetchSaveSlots();
  }, [fetchSaveSlots]);

  const handleColdLoad = async (file: string) => {
    try {
      const res = await loadSlot(currentGame.id, file);
      if (res === "staged") {
        onClose();
        await launchGame(currentGame.rom_path);
      }
    } catch (err) {
      console.error("Cold load failed:", err);
    }
  };

  const handleDeleteSlot = async (file: string) => {
    try {
      await deleteSlot(currentGame.id, file);
      await fetchSaveSlots();
    } catch (err) {
      console.error("Delete slot failed:", err);
    }
  };

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
          fetchSaveSlots();
        }, 500);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [game.rom_path, fetchSaveSlots]);

  type ModalFocusTarget = "play" | "fav" | "netplay" | "fix-match" | "hero-auto" | "hero-picker" | "logo-auto" | "logo-picker" | "video-downloader" | "close";
  const [modalFocus, setModalFocus] = useState<ModalFocusTarget>("play");

  async function handleLaunch() {
    try {
      await launchGame(game.rom_path);
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

  async function handleNetplay() {
    try {
      const coreName = currentGame.core_name;
      if (!coreName) {
        throw new Error("Core no configurado para este juego");
      }
      setNetplayCoreName(coreName);
      setShowNetplay(true);
    } catch (e) {
      console.error("Netplay failed:", e);
      const msg = e instanceof Error ? e.message : String(e);
      window.dispatchEvent(
        new CustomEvent("app-error", {
          detail: `Error al iniciar netplay: ${msg}`,
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

  async function handleDownloadVideo() {
    setScrapingVideo(true);
    setDownloadProgress(3);
    try {
      const cfg = await getScreenscraperConfig();
      if (!cfg.has_dev_credentials) {
        window.dispatchEvent(
          new CustomEvent("app-error", {
            detail: t("gameDetail.configureSsToast"),
          })
        );
        return;
      }

      const res = await scrapeGameVideo(
        currentGame.id,
        currentGame.rom_path,
        currentGame.platform,
        currentGame.display_name || metadata?.display_name || currentGame.name,
        !currentGame.logo_path
      );

      if (res.success) {
        setDownloadProgress(100);
        if (res.video_path) {
          setHasVideo(true);
        }
        let updatedGame = { ...currentGame };
        if (res.logo_path) {
          setLogoSrc(getCoverUrl(res.logo_path));
          updatedGame = { ...updatedGame, logo_path: res.logo_path };
          setCurrentGame(updatedGame);
          onLogoChanged?.(currentGame.id, res.logo_path);
        }
        onGameUpdated?.(updatedGame);
        window.dispatchEvent(
          new CustomEvent("game-video-updated", {
            detail: {
              gameId: currentGame.id,
              videoPath: res.video_path,
              logoPath: res.logo_path,
            },
          })
        );
      } else {
        window.dispatchEvent(
          new CustomEvent("app-error", {
            detail: res.message || t("gameDetail.videoDownloadFailed"),
          })
        );
      }
    } catch (err) {
      const msg = typeof err === "string" ? err : err instanceof Error ? err.message : t("gameDetail.videoDownloadError");
      window.dispatchEvent(
        new CustomEvent("app-error", {
          detail: msg,
        })
      );
    } finally {
      setScrapingVideo(false);
    }
  }

  async function handleAutoDownloadHero() {
    setScrapingHero(true);
    try {
      const hasKey = await getSteamGridDBKey();
      if (!hasKey) {
        window.dispatchEvent(
          new CustomEvent("app-error", {
            detail: t("gameDetail.configureSgdbToast"),
          })
        );
        return;
      }

      const query = currentGame.display_name || metadata?.display_name || currentGame.name;
      const heroPath = await autoDownloadHero(currentGame.id, query);
      setHeroSrc(getCoverUrl(heroPath));
      const updatedGame = { ...currentGame, hero_path: heroPath };
      setCurrentGame(updatedGame);
      onHeroChanged?.(currentGame.id, heroPath);
      onGameUpdated?.(updatedGame);
      window.dispatchEvent(
        new CustomEvent("game-hero-updated", {
          detail: { gameId: currentGame.id, heroPath },
        })
      );
    } catch (err) {
      const msg = typeof err === "string" ? err : err instanceof Error ? err.message : "Error al descargar Hero";
      window.dispatchEvent(
        new CustomEvent("app-error", {
          detail: msg,
        })
      );
    } finally {
      setScrapingHero(false);
    }
  }

  async function handleAutoDownloadLogo() {
    setScrapingLogo(true);
    try {
      const query = currentGame.display_name || metadata?.display_name || currentGame.name;
      const logoPath = await autoDownloadLogo(currentGame.id, query);
      setLogoSrc(getCoverUrl(logoPath));
      const updatedGame = { ...currentGame, logo_path: logoPath };
      setCurrentGame(updatedGame);
      onLogoChanged?.(currentGame.id, logoPath);
      onGameUpdated?.(updatedGame);
      window.dispatchEvent(
        new CustomEvent("game-logo-updated", {
          detail: { gameId: currentGame.id, logoPath },
        })
      );
    } catch (err) {
      const msg = typeof err === "string" ? err : err instanceof Error ? err.message : "Error al descargar Logo";
      window.dispatchEvent(
        new CustomEvent("app-error", {
          detail: msg,
        })
      );
    } finally {
      setScrapingLogo(false);
    }
  }

  // Keyboard navigation
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (showHeroPicker || showLogoPicker || showFixMatch) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowHeroPicker(false);
          setShowLogoPicker(false);
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
          if (prev === "fav") return "netplay";
          if (prev === "netplay") return "play";
          if (prev === "hero-auto") return "fix-match";
          if (prev === "hero-picker") return "hero-auto";
          if (prev === "logo-auto") return "hero-picker";
          if (prev === "logo-picker") return "logo-auto";
          if (prev === "video-downloader") return "logo-picker";
          if (prev === "close") return "video-downloader";
          return "play";
        });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setModalFocus((prev) => {
          if (prev === "play") return "fav";
          if (prev === "fav") return "netplay";
          if (prev === "netplay") return "play";
          if (prev === "fix-match") return "hero-auto";
          if (prev === "hero-auto") return "hero-picker";
          if (prev === "hero-picker") return "logo-auto";
          if (prev === "logo-auto") return "logo-picker";
          if (prev === "logo-picker") return "video-downloader";
          if (prev === "video-downloader") return "close";
          return "play";
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setModalFocus((prev) => {
          if (prev === "play" || prev === "fav" || prev === "netplay") return "fix-match";
          return prev;
        });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setModalFocus((prev) => {
          if (prev !== "play" && prev !== "fav" && prev !== "netplay") return "play";
          return prev;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (modalFocus === "play") handleLaunch();
        else if (modalFocus === "fav") handleFavorite();
        else if (modalFocus === "netplay") handleNetplay();
        else if (modalFocus === "fix-match") setShowFixMatch(true);
        else if (modalFocus === "hero-auto") handleAutoDownloadHero();
        else if (modalFocus === "hero-picker") setShowHeroPicker(true);
        else if (modalFocus === "logo-auto") handleAutoDownloadLogo();
        else if (modalFocus === "logo-picker") setShowLogoPicker(true);
        else if (modalFocus === "video-downloader") handleDownloadVideo();
        else if (modalFocus === "close") onClose();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalFocus, showHeroPicker, showLogoPicker, showFixMatch, isEditingTitle, game.rom_path, game.id, game.favorite]);

  useEffect(() => {
    if (!initialAction) return;
    if (initialAction === "hero") setShowHeroPicker(true);
    else if (initialAction === "logo") setShowLogoPicker(true);
    else if (initialAction === "edit") setShowFixMatch(true);
    else if (initialAction === "video") handleDownloadVideo();
  }, [initialAction]);

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
        {/* Columna Izquierda: Cover, Jugar, Favorito y Tiempo */}
        <DetailLeftColumn
          game={currentGame}
          coverSrc={coverSrc}
          color={color}
          modalFocus={modalFocus}
          onFavorite={handleFavorite}
          onLaunch={handleLaunch}
          onNetplay={handleNetplay}
        />

        {/* Columna Derecha */}
        <div className="modal-right-column">
          <button className={`modal-close ${modalFocus === "close" ? "focused" : ""}`} onClick={onClose} aria-label={t("common.close")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          {/* Fila 1: Tags de consola + Herramientas */}
          <DetailToolsBar
            game={game}
            color={color}
            modalFocus={modalFocus}
            currentGame={currentGame}
            heroSrc={heroSrc}
            logoSrc={logoSrc}
            hasVideo={hasVideo}
            scrapingHero={scrapingHero}
            scrapingLogo={scrapingLogo}
            scrapingVideo={scrapingVideo}
            downloadProgress={downloadProgress}
            onOpenFixMatch={() => setShowFixMatch(true)}
            onOpenHeroPicker={() => setShowHeroPicker(true)}
            onOpenLogoPicker={() => setShowLogoPicker(true)}
            onAutoDownloadHero={handleAutoDownloadHero}
            onAutoDownloadLogo={handleAutoDownloadLogo}
            onDownloadVideo={handleDownloadVideo}
          />

          {/* Fila 2: Hero con difuminación + Título / Logo editable */}
          <DetailHeroBanner
            heroSrc={heroSrc}
            color={color}
            logoSrc={logoSrc}
            currentGame={currentGame}
            metadata={metadata}
            isEditingTitle={isEditingTitle}
            editedTitle={editedTitle}
            setEditedTitle={setEditedTitle}
            titleSaving={titleSaving}
            onStartEditTitle={handleStartEditTitle}
            onSaveTitle={handleSaveTitle}
            onCancelEditTitle={() => setIsEditingTitle(false)}
            onRestoreTitle={handleRestoreTitle}
          />

          {/* Fila 3: Información de año, compañía, región, etc. */}
          <DetailMetadataChips
            game={currentGame}
            metadata={metadata}
            metaLoading={metaLoading}
          />

          {/* Fila 4: Pestañas de Partidas Guardadas y Logros */}
          <DetailBottomTabs
            bottomTab={bottomTab}
            setBottomTab={setBottomTab}
            hasRACredentials={hasRACredentials}
            saveSlots={saveSlots}
            onLoadSlot={handleColdLoad}
            onDeleteSlot={handleDeleteSlot}
            achievements={achievements}
            achievementsLoading={achievementsLoading}
            onRefreshAchievements={handleRefreshAchievements}
          />
        </div>

        {/* Modal Selector de Heroes */}
        <HeroPickerModal
          game={currentGame}
          isOpen={showHeroPicker}
          onClose={() => setShowHeroPicker(false)}
          onHeroSelected={(newHeroPath) => {
            setHeroSrc(newHeroPath ? getCoverUrl(newHeroPath) : "");
            setCurrentGame((prev) => ({ ...prev, hero_path: newHeroPath }));
            onHeroChanged?.(currentGame.id, newHeroPath);
          }}
        />

        {/* Modal Selector de Logos */}
        <LogoPickerModal
          game={currentGame}
          isOpen={showLogoPicker}
          onClose={() => setShowLogoPicker(false)}
          onLogoSelected={(newLogoPath) => {
            setLogoSrc(newLogoPath ? getCoverUrl(newLogoPath) : "");
            setCurrentGame((prev) => ({ ...prev, logo_path: newLogoPath }));
            onLogoChanged?.(currentGame.id, newLogoPath);
          }}
        />

        {showFixMatch && (
          <FixMatchModal
            game={currentGame}
            onClose={() => setShowFixMatch(false)}
            onMatchApplied={handleFixMatchApplied}
          />
        )}

        {/* Netplay Modal */}
        <NetplayModal
          isOpen={showNetplay}
          onClose={() => setShowNetplay(false)}
          game={currentGame}
          coreName={netplayCoreName}
        />
      </div>
    </div>
  );
}
