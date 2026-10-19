import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { Game, GameMetadata } from "../../types";
import { getPlatformDisplayName } from "../../lib/platforms";
import {
  updateGameTitle,
  autoDownloadHero,
  autoDownloadLogo,
  getSteamGridDBKey,
} from "../../lib/tauri";
import { ConsoleIcon } from "../ConsoleIcon";

interface WheelQuickEditMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeGame: Game;
  metadata: GameMetadata | null;
  activeBrandColor: string;
  onOpenFixMatch: () => void;
  onOpenHeroPicker: () => void;
  onOpenLogoPicker: () => void;
  onDownloadVideo: () => void;
  scrapingVideo: boolean;
  downloadProgress: number;
  videoSrc: string | null;
  onGameUpdated?: (updatedGame: Game) => void;
}

export function WheelQuickEditMenu({
  isOpen,
  onClose,
  activeGame,
  metadata,
  activeBrandColor,
  onOpenFixMatch,
  onOpenHeroPicker,
  onOpenLogoPicker,
  onDownloadVideo,
  scrapingVideo,
  downloadProgress,
  videoSrc,
  onGameUpdated,
}: WheelQuickEditMenuProps) {
  const { t } = useTranslation();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [titleSaving, setTitleSaving] = useState(false);
  const editTitleInputRef = useRef<HTMLInputElement | null>(null);

  const handleStartEditTitle = useCallback(() => {
    setEditedTitle(activeGame.display_name || metadata?.display_name || activeGame.name);
    setIsEditingTitle(true);
    setTimeout(() => {
      editTitleInputRef.current?.focus();
      editTitleInputRef.current?.select();
    }, 50);
  }, [activeGame, metadata]);

  const handleSaveTitle = useCallback(async () => {
    if (!editedTitle.trim()) return;
    setTitleSaving(true);
    try {
      const updated = await updateGameTitle(activeGame.id, editedTitle.trim());
      setIsEditingTitle(false);
      onGameUpdated?.(updated);
    } catch (e) {
      console.error("Error al actualizar título:", e);
      window.dispatchEvent(
        new CustomEvent("app-error", {
          detail: t("wheelEdit.titleUpdateFailed"),
        })
      );
    } finally {
      setTitleSaving(false);
    }
  }, [activeGame.id, editedTitle, onGameUpdated]);

  const handleRestoreTitle = useCallback(async () => {
    setTitleSaving(true);
    try {
      const original = metadata?.display_name || "";
      const updated = await updateGameTitle(activeGame.id, original);
      setIsEditingTitle(false);
      onGameUpdated?.(updated);
    } catch (e) {
      console.error("Error al restaurar título:", e);
      window.dispatchEvent(
        new CustomEvent("app-error", {
          detail: t("wheelEdit.titleRestoreFailed"),
        })
      );
    } finally {
      setTitleSaving(false);
    }
  }, [activeGame.id, metadata?.display_name, onGameUpdated]);

  const [scrapingHero, setScrapingHero] = useState(false);
  const [scrapingLogo, setScrapingLogo] = useState(false);

  const handleQuickAutoHero = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
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
        const query = activeGame.display_name || metadata?.display_name || activeGame.name;
        const heroPath = await autoDownloadHero(activeGame.id, query);
        const updated = { ...activeGame, hero_path: heroPath };
        onGameUpdated?.(updated);
        window.dispatchEvent(
          new CustomEvent("game-hero-updated", {
            detail: { gameId: activeGame.id, heroPath },
          })
        );
      } catch (err) {
        const msg =
          typeof err === "string" ? err : err instanceof Error ? err.message : t("pickers.errHeroDownload");
        window.dispatchEvent(new CustomEvent("app-error", { detail: msg }));
      } finally {
        setScrapingHero(false);
      }
    },
    [activeGame, metadata, onGameUpdated]
  );

  const handleQuickAutoLogo = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      setScrapingLogo(true);
      try {
        const query = activeGame.display_name || metadata?.display_name || activeGame.name;
        const logoPath = await autoDownloadLogo(activeGame.id, query);
        const updated = { ...activeGame, logo_path: logoPath };
        onGameUpdated?.(updated);
        window.dispatchEvent(
          new CustomEvent("game-logo-updated", {
            detail: { gameId: activeGame.id, logoPath },
          })
        );
      } catch (err) {
        const msg =
          typeof err === "string" ? err : err instanceof Error ? err.message : t("pickers.errLogoDownload");
        window.dispatchEvent(new CustomEvent("app-error", { detail: msg }));
      } finally {
        setScrapingLogo(false);
      }
    },
    [activeGame, metadata, onGameUpdated]
  );

  // Handle dedicated keyboard shortcuts when edit menu is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is editing the title, let the input handle standard keys
      if (isEditingTitle) {
        if (e.key === "Escape") {
          e.preventDefault();
          setIsEditingTitle(false);
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "F2" || e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleStartEditTitle();
        return;
      }
      if (e.key === "1") {
        e.preventDefault();
        onClose();
        onOpenFixMatch();
        return;
      }
      if (e.key === "2") {
        e.preventDefault();
        onClose();
        onOpenHeroPicker();
        return;
      }
      if (e.key === "3") {
        e.preventDefault();
        onClose();
        onOpenLogoPicker();
        return;
      }
      if (e.key === "4") {
        e.preventDefault();
        onClose();
        onDownloadVideo();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isOpen,
    isEditingTitle,
    onClose,
    handleStartEditTitle,
    onOpenFixMatch,
    onOpenHeroPicker,
    onOpenLogoPicker,
    onDownloadVideo,
  ]);

  if (!isOpen) return null;

  return (
    <div
      className="osu-edit-modal-backdrop"
      onClick={() => {
        setIsEditingTitle(false);
        onClose();
      }}
    >
      <div
        className="osu-edit-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="osu-edit-modal-header">
          <div className="osu-edit-modal-title-wrap">
            <div
              className="osu-edit-modal-badge"
              style={{
                backgroundColor: `${activeBrandColor}22`,
                borderColor: `${activeBrandColor}66`,
                color: activeBrandColor,
              }}
            >
              <ConsoleIcon platform={activeGame.platform} size={15} />
              <span>{getPlatformDisplayName(activeGame.platform)}</span>
            </div>

            {isEditingTitle ? (
              <div className="osu-edit-modal-title-edit-form">
                <input
                  ref={editTitleInputRef}
                  type="text"
                  className="osu-edit-modal-title-input"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveTitle();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      setIsEditingTitle(false);
                    }
                  }}
                  placeholder={t("wheelEdit.namePh")}
                  autoFocus
                />
                <div className="osu-edit-modal-title-actions">
                  <button
                    type="button"
                    className="osu-edit-title-btn osu-edit-title-btn-save"
                    onClick={handleSaveTitle}
                    disabled={titleSaving || !editedTitle.trim()}
                    title={t("wheelEdit.saveNameEnter")}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{titleSaving ? t("wheelEdit.saving") : t("common.save")}</span>
                  </button>
                  <button
                    type="button"
                    className="osu-edit-title-btn osu-edit-title-btn-cancel"
                    onClick={() => setIsEditingTitle(false)}
                    disabled={titleSaving}
                    title={t("wheelEdit.cancelEsc")}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span>{t("common.cancel")}</span>
                  </button>
                  {activeGame.custom_title && (
                    <button
                      type="button"
                      className="osu-edit-title-btn osu-edit-title-btn-restore"
                      onClick={handleRestoreTitle}
                      disabled={titleSaving}
                      title={t("wheelEdit.restoreOriginalTitle")}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 7v6h6" />
                        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                      </svg>
                      <span>{t("wheelEdit.restoreOriginal")}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="osu-edit-modal-title-row">
                <h3
                  className="osu-edit-modal-title"
                  title={t("wheelEdit.clickRename")}
                  onClick={handleStartEditTitle}
                >
                  {activeGame.display_name || metadata?.display_name || activeGame.name}
                </h3>
                <button
                  type="button"
                  className="osu-edit-modal-btn-rename"
                  onClick={handleStartEditTitle}
                  title={t("wheelEdit.renameTitle")}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                  <span>{t("wheelEdit.renameBtn")}</span>
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className="osu-edit-modal-close"
            onClick={() => {
              setIsEditingTitle(false);
              onClose();
            }}
            title={t("wheelEdit.closeEsc")}
          >
            ✕
          </button>
        </div>

        <div className="osu-edit-modal-list">
          {/* Option 1: Editar datos */}
          <button
            type="button"
            className="osu-edit-item-card"
            onClick={() => {
              onClose();
              onOpenFixMatch();
            }}
          >
            <div className="osu-edit-item-num">1</div>
            <div className="osu-edit-item-icon icon-data">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 9h6v6H9z" />
                <path d="m21 15-3-3 3-3" />
              </svg>
            </div>
            <div className="osu-edit-item-content">
              <div className="osu-edit-item-title-row">
                <span className="osu-edit-item-title">{t("wheelEdit.editData")}</span>
              </div>
              <span className="osu-edit-item-desc">
                {t("wheelEdit.editDataDesc")}
              </span>
            </div>
            <div className="osu-edit-item-arrow">›</div>
          </button>

          {/* Option 2: Galeria de Hero */}
          <button
            type="button"
            className="osu-edit-item-card"
            onClick={() => {
              onClose();
              onOpenHeroPicker();
            }}
          >
            <div className="osu-edit-item-num">2</div>
            <div className="osu-edit-item-icon icon-hero">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
                <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
                <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
                <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
              </svg>
            </div>
            <div className="osu-edit-item-content">
              <div className="osu-edit-item-title-row">
                <span className="osu-edit-item-title">{t("wheelEdit.heroGallery")}</span>
                {activeGame.hero_path && (
                  <span className="osu-edit-tag-ok">{t("wheelEdit.bannerActive")}</span>
                )}
                <button
                  type="button"
                  className="osu-edit-tag-btn"
                  onClick={handleQuickAutoHero}
                  disabled={scrapingHero}
                  title={t("pickers.autoHeroTitle")}
                >
                  {scrapingHero ? t("pickers.searching") : t("wheelEdit.autoHero")}
                </button>
              </div>
              <span className="osu-edit-item-desc">
                {t("wheelEdit.heroDesc")}
              </span>
            </div>
            <div className="osu-edit-item-arrow">›</div>
          </button>

          {/* Option 3: Buscar Logo */}
          <button
            type="button"
            className="osu-edit-item-card"
            onClick={() => {
              onClose();
              onOpenLogoPicker();
            }}
          >
            <div className="osu-edit-item-num">3</div>
            <div className="osu-edit-item-icon icon-logo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7V4h16v3" />
                <path d="M9 20h6" />
                <path d="M12 4v16" />
              </svg>
            </div>
            <div className="osu-edit-item-content">
              <div className="osu-edit-item-title-row">
                <span className="osu-edit-item-title">{t("wheelEdit.logoSearch")}</span>
                {activeGame.logo_path && (
                  <span className="osu-edit-tag-ok">{t("wheelEdit.logoActive")}</span>
                )}
                <button
                  type="button"
                  className="osu-edit-tag-btn"
                  onClick={handleQuickAutoLogo}
                  disabled={scrapingLogo}
                  title={t("pickers.autoLogoTitle")}
                >
                  {scrapingLogo ? t("pickers.searching") : t("wheelEdit.autoLogo")}
                </button>
              </div>
              <span className="osu-edit-item-desc">
                {t("wheelEdit.logoDesc")}
              </span>
            </div>
            <div className="osu-edit-item-arrow">›</div>
          </button>

          {/* Option 4: Descargar Gameplay */}
          <button
            type="button"
            className={`osu-edit-item-card ${scrapingVideo ? "loading" : ""}`}
            onClick={() => {
              onClose();
              onDownloadVideo();
            }}
            disabled={scrapingVideo}
          >
            <div className="osu-edit-item-num">4</div>
            <div className="osu-edit-item-icon icon-video">
              {scrapingVideo ? (
                <span className="osu-btn-spinner" />
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect width="14" height="14" x="1" y="5" rx="2" ry="2" />
                </svg>
              )}
            </div>
            <div className="osu-edit-item-content">
              <div className="osu-edit-item-title-row">
                <span className="osu-edit-item-title">{t("wheelEdit.dlGameplay")}</span>
                {videoSrc && !scrapingVideo && (
                  <span className="osu-edit-tag-video">{t("wheelEdit.videoReady")}</span>
                )}
                {scrapingVideo && (
                  <span className="osu-edit-tag-downloading">{downloadProgress}%</span>
                )}
              </div>
              <span className="osu-edit-item-desc">
                {videoSrc
                  ? t("wheelEdit.redownload")
                  : t("wheelEdit.downloadClip")}
              </span>
            </div>
            <div className="osu-edit-item-arrow">›</div>
          </button>
        </div>

        <div className="osu-edit-modal-footer">
          <span className="osu-edit-hint">{t("wheelEdit.shortcutsHint")}</span>
        </div>
      </div>
    </div>
  );
}
