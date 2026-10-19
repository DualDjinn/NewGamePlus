import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Game, SGDBLogo } from "../types";
import {
  getSteamGridDBKey,
  searchSteamGridDBLogos,
  setGameLogo,
  removeGameLogo,
  autoDownloadLogo,
} from "../lib/tauri";
import "./GameDetailModal.css";

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
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;

    const defaultSearch = game.display_name || game.name;
    setLogoQuery(defaultSearch);
    setLogoError(null);

    getSteamGridDBKey().then((key) => {
      if (!key) {
        setHasSGDBKey(false);
        setLogoError(t("pickers.sgdbKeyMissing"));
      } else {
        setHasSGDBKey(true);
        fetchLogos(defaultSearch);
      }
    }).catch(() => {
      setHasSGDBKey(false);
      setLogoError(t("pickers.sgdbKeyMissing"));
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
        setLogoError(t("pickers.noLogos"));
      }
    } catch (e) {
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : t("pickers.errLogoSearch");
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
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : t("pickers.errLogoDownload");
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
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : t("pickers.errLogoRemove");
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
            <h3>{t("pickers.logoTitle")}</h3>
            <p>{t("pickers.logoDesc")}</p>
          </div>
          <button type="button" className="hero-picker-close" onClick={onClose} title={t("common.close")}>
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
                placeholder={t("pickers.logoSearchPh")}
                value={logoQuery}
                onChange={(e) => setLogoQuery(e.target.value)}
              />
              <button
                type="submit"
                className="hero-picker-btn-search"
                disabled={logosLoading || logoActionLoading}
              >
                {logosLoading ? t("pickers.searching") : t("pickers.searchBtn")}
              </button>
              <button
                type="button"
                className="hero-picker-btn-auto"
                onClick={async () => {
                  setLogoActionLoading(true);
                  try {
                    const saved = await autoDownloadLogo(game.id, logoQuery);
                    onLogoSelected(saved);
                    onClose();
                  } catch (e) {
                    const msg = typeof e === "string" ? e : e instanceof Error ? e.message : t("pickers.errDownload");
                    setLogoError(msg);
                  } finally {
                    setLogoActionLoading(false);
                  }
                }}
                disabled={logosLoading || logoActionLoading}
                title={t("pickers.autoLogoTitle")}
              >
                {logoActionLoading ? t("pickers.downloading") : t("pickers.autoBest")}
              </button>
            </form>

            {logoError && <p className="hero-picker-error">{logoError}</p>}

            {logosLoading ? (
              <div className="hero-picker-loading">
                <div className="hero-spinner" />
                <span>{t("pickers.loadingLogos")}</span>
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
                        alt={t("pickers.altLogo")}
                        className="logo-picker-img"
                        loading="lazy"
                      />
                    </div>
                    <div className="logo-picker-meta">
                      <span>{logo.width} × {logo.height}</span>
                      {logo.author?.name && (
                        <span>{t("pickers.byAuthor", { name: logo.author.name })}</span>
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
                  {t("pickers.removeLogo")}
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
