import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "../hooks/useFocusTrap";
import type { Game, FixMatchCandidate, SGDBGrid } from "../types";
import { fixMatchSearch, fixMatchGetCovers, applyFixMatch, getSteamGridDBKey, updateGameTitle } from "../lib/tauri";
import "./FixMatchModal.css";

interface Props {
  game: Game;
  onClose: () => void;
  onMatchApplied: (updatedGame: Game) => void;
}

function cleanTitle(name: string): string {
  return name
    .replace(/\.[a-zA-Z0-9]+$/, "")
    .split(" (")[0]
    .split(" [")[0]
    .trim();
}

export default function FixMatchModal({ game, onClose, onMatchApplied }: Props) {
  const { t } = useTranslation();
  const trapRef = useFocusTrap<HTMLDivElement>();
  const [title, setTitle] = useState(
    game.display_name || cleanTitle(game.name)
  );
  const [year, setYear] = useState<string>("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>(game.platform || "");
  const [agent, setAgent] = useState<"steamgriddb" | "libretro" | "steam">(
    game.platform === "PC" ? "steam" : "steamgriddb"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<FixMatchCandidate[]>([]);
  const [searched, setSearched] = useState(false);
  const [hasSGDBKey, setHasSGDBKey] = useState<boolean>(true);

  // Vista de variantes de carátula para un candidato específico
  const [activeCandidate, setActiveCandidate] = useState<FixMatchCandidate | null>(null);
  const [coverVariants, setCoverVariants] = useState<SGDBGrid[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);

  const [applying, setApplying] = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);

  async function handleSaveTitleOnly() {
    if (!title.trim()) return;
    setSavingTitle(true);
    setError(null);
    try {
      const updated = await updateGameTitle(game.id, title.trim());
      onMatchApplied(updated);
      onClose();
    } catch (e) {
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : t("pickers.errSaveTitle");
      setError(msg);
      setSavingTitle(false);
    }
  }

  useEffect(() => {
    getSteamGridDBKey().then((k) => {
      if (!k) {
        setHasSGDBKey(false);
      }
    }).catch(() => setHasSGDBKey(false));
  }, []);

  async function handleSearch() {
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    setActiveCandidate(null);
    setCoverVariants([]);
    setSearched(true);

    try {
      const yearNum = year.trim() ? parseInt(year.trim(), 10) : undefined;
      const results = await fixMatchSearch(
        title.trim(),
        isNaN(yearNum as number) ? undefined : yearNum,
        agent,
        selectedPlatform.trim() ? selectedPlatform.trim() : undefined
      );
      setCandidates(results);
      if (results.length === 0) {
        setError(t("pickers.noMatches"));
      }
    } catch (e) {
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : t("pickers.errSearch");
      setError(msg);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyCandidate(
    candidate: FixMatchCandidate,
    mode: "all" | "metadata" | "cover" = "all",
    customCoverUrl?: string
  ) {
    const applyMetadata = mode === "all" || mode === "metadata";
    const applyCover = mode === "all" || mode === "cover";

    const chosenUrl = customCoverUrl || candidate.cover_url || candidate.cover_thumb;
    if (applyCover && !chosenUrl) {
      setError(t("pickers.noCoverUrl"));
      return;
    }

    setApplying(true);
    setError(null);
    try {
      const updated = await applyFixMatch(
        game.id,
        applyMetadata ? candidate.name : null,
        applyCover ? chosenUrl : null,
        applyMetadata ? (candidate.release_year ?? undefined) : undefined,
        applyMetadata ? (candidate.genre ?? undefined) : undefined,
        applyMetadata ? (candidate.developer ?? undefined) : undefined,
        applyMetadata ? (candidate.publisher ?? undefined) : undefined,
        applyMetadata ? (candidate.region ?? undefined) : undefined,
        applyMetadata,
        applyCover
      );
      onMatchApplied(updated);
      onClose();
    } catch (e) {
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : t("pickers.errApply");
      setError(msg);
      setApplying(false);
    }
  }

  async function handleViewCoverVariants(candidate: FixMatchCandidate) {
    setActiveCandidate(candidate);
    setVariantsLoading(true);
    setError(null);
    try {
      const grids = await fixMatchGetCovers(candidate.id);
      setCoverVariants(grids);
      if (grids.length === 0) {
        setError(t("pickers.noExtraCovers"));
      }
    } catch (e) {
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : t("pickers.errCovers");
      setError(msg);
      setCoverVariants([]);
    } finally {
      setVariantsLoading(false);
    }
  }

  return (
    <div className="fixmatch-overlay" onClick={onClose}>
      <div
        className="fixmatch-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("pickers.fixAria")}
        tabIndex={-1}
        ref={trapRef}
      >
        {/* Encabezado Plex style */}
        <div className="fixmatch-header">
          <div className="fixmatch-title-wrap">
            <svg className="fixmatch-badge-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 9h6v6H9z" />
              <path d="m21 15-3-3 3-3" />
            </svg>
            <h2 className="fixmatch-title">{t("pickers.fixTitle")}</h2>
          </div>
          <button className="fixmatch-close-btn" onClick={onClose} aria-label={t("common.close")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Pestañas / Subheader */}
        <div className="fixmatch-nav-tabs">
          <button
            type="button"
            className={`fixmatch-tab ${!activeCandidate ? "active" : ""}`}
            onClick={() => setActiveCandidate(null)}
          >
            {t("pickers.searchOptions")}
          </button>
          {activeCandidate && (
            <button type="button" className="fixmatch-tab active">
              {t("pickers.coversFor", { name: activeCandidate.name })}
            </button>
          )}
        </div>

        <div className="fixmatch-body">
          {!activeCandidate ? (
            <>
              {/* Formulario de búsqueda estilo Plex */}
              <div className="fixmatch-form-grid">
                <div className="fixmatch-field">
                  <label htmlFor="fixmatch-input-title">{t("pickers.titleLabel")}</label>
                  <input
                    id="fixmatch-input-title"
                    type="text"
                    className="fixmatch-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") handleSearch();
                    }}
                    placeholder={t("pickers.titlePh")}
                    autoFocus
                  />
                </div>

                <div className="fixmatch-field">
                  <label htmlFor="fixmatch-select-agent">{t("pickers.fixAgent")}</label>
                  <select
                    id="fixmatch-select-agent"
                    className="fixmatch-select"
                    value={agent}
                    onChange={(e) => setAgent(e.target.value as "steamgriddb" | "libretro" | "steam")}
                  >
                    <option value="steam">Steam Store (PC)</option>
                    <option value="steamgriddb">{t("pickers.fixAgentSgdb")}</option>
                    <option value="libretro">{t("pickers.fixAgentLibretro")}</option>
                  </select>
                </div>

                <div className="fixmatch-field">
                  <label htmlFor="fixmatch-input-year">{t("pickers.fixYear")}</label>
                  <input
                    id="fixmatch-input-year"
                    type="text"
                    maxLength={4}
                    className="fixmatch-input"
                    value={year}
                    onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") handleSearch();
                    }}
                    placeholder={t("pickers.fixYearPh")}
                  />
                </div>

                <div className="fixmatch-field">
                  <label htmlFor="fixmatch-select-platform">{t("pickers.fixPlatform")}</label>
                  <select
                    id="fixmatch-select-platform"
                    className="fixmatch-select"
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    title={t("pickers.fixFilterPlatform")}
                  >
                    {game.platform && (
                      <option value={game.platform}>{t("pickers.fixCurrent")} ({game.platform})</option>
                    )}
                    <option value="">{t("pickers.fixAllPlatforms")}</option>
                    <option value="GBA">Game Boy Advance (GBA)</option>
                    <option value="SNES">Super Nintendo (SNES)</option>
                    <option value="NES">NES</option>
                    <option value="N64">Nintendo 64</option>
                    <option value="NDS">Nintendo DS</option>
                    <option value="3DS">Nintendo 3DS</option>
                    <option value="PS1">PlayStation 1</option>
                    <option value="PS2">PlayStation 2</option>
                    <option value="PS3">PlayStation 3</option>
                    <option value="PSP">PlayStation Portable</option>
                    <option value="GAMECUBE">GameCube</option>
                    <option value="WII">Nintendo Wii</option>
                    <option value="MEGA_DRIVE">Mega Drive / Genesis</option>
                    <option value="ARCADE">Arcade / FBNeo / MAME</option>
                  </select>
                </div>
              </div>

              {!hasSGDBKey && agent === "steamgriddb" && (
                <div className="fixmatch-alert-box">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f5a623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
                    <path d="M9 18h6"/>
                    <path d="M10 22h4"/>
                  </svg>
                  <span><strong>{t("pickers.fixNote")}</strong> {t("pickers.sgdbKeyMissing")} {t("pickers.fixNoteAlt")}</span>
                </div>
              )}

              <div className="fixmatch-form-actions">
                <button
                  type="button"
                  className="fixmatch-btn fixmatch-btn-cancel"
                  onClick={onClose}
                  disabled={applying || savingTitle}
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  className="fixmatch-btn fixmatch-btn-save-title"
                  onClick={handleSaveTitleOnly}
                  disabled={savingTitle || loading || applying || !title.trim()}
                  title={t("pickers.fixSaveTitleHint")}
                >
                  {savingTitle ? t("pickers.fixSaving") : t("pickers.fixSaveTitleOnly")}
                </button>
                <button
                  type="button"
                  className="fixmatch-btn fixmatch-btn-search"
                  onClick={handleSearch}
                  disabled={loading || savingTitle || applying || !title.trim()}
                >
                  {loading ? t("pickers.fixSearching") : t("pickers.fixSearch")}
                </button>
              </div>

              {/* Mensajes de error */}
              {error && <div className="fixmatch-error">{error}</div>}

              {/* Indicador de carga */}
              {loading && (
                <div className="fixmatch-loading-wrap">
                  <div className="fixmatch-spinner" />
                  <p>{t("pickers.fixSearchingDb")}</p>
                </div>
              )}

              {/* Resultados */}
              {!loading && searched && candidates.length > 0 && (
                <div className="fixmatch-results-wrap">
                  <h3 className="fixmatch-results-title">
                    {t("pickers.fixMatchesFound", { count: candidates.length })}
                  </h3>
                  <div className="fixmatch-candidates-grid">
                    {candidates.map((cand) => (
                      <div key={cand.id} className="fixmatch-candidate-card">
                        <div className="fixmatch-candidate-poster-wrap">
                          {cand.cover_thumb ? (
                            <img
                              src={cand.cover_thumb}
                              alt={cand.name}
                              className="fixmatch-candidate-poster"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                const parent = e.currentTarget.parentElement;
                                const placeholder = parent?.querySelector(".fixmatch-candidate-poster-placeholder") as HTMLElement;
                                if (placeholder) placeholder.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <div
                            className="fixmatch-candidate-poster-placeholder"
                            style={{ display: cand.cover_thumb ? "none" : "flex" }}
                          >
                            <span>?</span>
                          </div>
                          {cand.release_year && (
                            <span className="fixmatch-candidate-year-badge">
                              {cand.release_year}
                            </span>
                          )}
                        </div>

                        <div className="fixmatch-candidate-info">
                          <h4 className="fixmatch-candidate-name" title={cand.name}>
                            {cand.name}
                          </h4>

                          <div className="fixmatch-candidate-meta-chips">
                            {cand.platform && (
                              <span className="fixmatch-chip fixmatch-chip-platform">
                                {cand.platform}
                              </span>
                            )}
                            {cand.genre && (
                              <span className="fixmatch-chip fixmatch-chip-genre">
                                {cand.genre}
                              </span>
                            )}
                            {cand.developer && (
                              <span className="fixmatch-chip fixmatch-chip-dev" title={t("pickers.fixDev", { name: cand.developer })}>
                                🛠 {cand.developer}
                              </span>
                            )}
                            {cand.publisher && cand.publisher !== cand.developer && (
                              <span className="fixmatch-chip fixmatch-chip-pub" title={t("pickers.fixPub", { name: cand.publisher })}>
                                🏢 {cand.publisher}
                              </span>
                            )}
                            {cand.region && (
                              <span className="fixmatch-chip fixmatch-chip-region" title={t("pickers.fixRegion", { name: cand.region })}>
                                🌐 {cand.region}
                              </span>
                            )}
                          </div>

                          <div className="fixmatch-candidate-actions">
                            <button
                              type="button"
                              className="fixmatch-btn-apply"
                              onClick={() => handleApplyCandidate(cand, "all")}
                              disabled={applying || (!cand.cover_url && !cand.cover_thumb)}
                              title={t("pickers.fixApplyAllHint")}
                            >
                              {applying ? t("pickers.fixApplying") : t("pickers.fixApplyAll")}
                            </button>

                            <button
                              type="button"
                              className="fixmatch-btn-secondary"
                              onClick={() => handleApplyCandidate(cand, "metadata")}
                              disabled={applying}
                              title={t("pickers.fixOnlyDataHint")}
                            >
                              {t("pickers.fixOnlyData")}
                            </button>

                            <button
                              type="button"
                              className="fixmatch-btn-secondary"
                              onClick={() => handleApplyCandidate(cand, "cover")}
                              disabled={applying || (!cand.cover_url && !cand.cover_thumb)}
                              title={t("pickers.fixOnlyCoverHint")}
                            >
                              {t("pickers.fixOnlyCover")}
                            </button>

                            {agent === "steamgriddb" && (
                              <button
                                type="button"
                                className="fixmatch-btn-variants"
                                onClick={() => handleViewCoverVariants(cand)}
                                title={t("pickers.fixMoreCoversHint")}
                              >
                                {t("pickers.fixMoreCovers")}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Vista de variantes de carátula para el candidato activo */
            <div className="fixmatch-variants-view">
              <div className="fixmatch-variants-header">
                <button
                  type="button"
                  className="fixmatch-btn-back"
                  onClick={() => setActiveCandidate(null)}
                >
                  {t("pickers.fixBackResults")}
                </button>
                <span className="fixmatch-variants-title">
                  {t("pickers.fixChooseCover")} <strong>{activeCandidate.name}</strong>
                </span>
              </div>

              {variantsLoading && (
                <div className="fixmatch-loading-wrap">
                  <div className="fixmatch-spinner" />
                  <p>{t("pickers.fixLoadingDesigns")}</p>
                </div>
              )}

              {error && <div className="fixmatch-error">{error}</div>}

              {!variantsLoading && coverVariants.length > 0 && (
                <div className="fixmatch-grids-gallery">
                  {coverVariants.map((grid) => (
                    <div
                      key={grid.id}
                      className="fixmatch-grid-card"
                    >
                      <img
                        src={grid.thumb}
                        alt={t("pickers.fixCoverAlt", { id: grid.id })}
                        className="fixmatch-grid-img"
                        loading="lazy"
                      />
                      <div className="fixmatch-grid-overlay">
                        <span className="fixmatch-grid-dimensions">
                          {grid.width}x{grid.height}
                        </span>
                        <div className="fixmatch-grid-actions-group">
                          <button
                            type="button"
                            className="fixmatch-grid-select-btn fixmatch-grid-select-cover"
                            disabled={applying}
                            onClick={() => handleApplyCandidate(activeCandidate, "cover", grid.url)}
                            title={t("pickers.fixOnlyCoverHint")}
                          >
                            {t("pickers.fixOnlyCover")}
                          </button>
                          <button
                            type="button"
                            className="fixmatch-grid-select-btn fixmatch-grid-select-all"
                            disabled={applying}
                            onClick={() => handleApplyCandidate(activeCandidate, "all", grid.url)}
                            title={t("pickers.fixCoverPlusDataHint")}
                          >
                            {t("pickers.fixCoverPlusData")}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
