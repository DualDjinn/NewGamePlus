import { useState, useEffect } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import type { Game, FixMatchCandidate, SGDBGrid } from "../types";
import { fixMatchSearch, fixMatchGetCovers, applyFixMatch, getSteamGridDBKey } from "../lib/tauri";
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
        setError("No se encontraron coincidencias. Prueba modificando el título o cambiando de agente.");
      }
    } catch (e) {
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : "Error al buscar";
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
      setError("Este candidato no tiene una URL de carátula válida.");
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
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : "Error al aplicar cambios";
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
        setError("No se encontraron carátulas adicionales para este juego.");
      }
    } catch (e) {
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : "Error al obtener carátulas";
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
        aria-label="Corregir Coincidencia"
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
            <h2 className="fixmatch-title">Corregir Coincidencia</h2>
          </div>
          <button className="fixmatch-close-btn" onClick={onClose} aria-label="Cerrar">
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
            Opciones de Búsqueda
          </button>
          {activeCandidate && (
            <button type="button" className="fixmatch-tab active">
              Carátulas: {activeCandidate.name}
            </button>
          )}
        </div>

        <div className="fixmatch-body">
          {!activeCandidate ? (
            <>
              {/* Formulario de búsqueda estilo Plex */}
              <div className="fixmatch-form-grid">
                <div className="fixmatch-field">
                  <label htmlFor="fixmatch-input-title">Título</label>
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
                    placeholder="Ej. Need for Speed Carbon"
                    autoFocus
                  />
                </div>

                <div className="fixmatch-field">
                  <label htmlFor="fixmatch-select-agent">Agente</label>
                  <select
                    id="fixmatch-select-agent"
                    className="fixmatch-select"
                    value={agent}
                    onChange={(e) => setAgent(e.target.value as "steamgriddb" | "libretro" | "steam")}
                  >
                    <option value="steam">Steam Store (PC)</option>
                    <option value="steamgriddb">SteamGridDB (Carátulas HD)</option>
                    <option value="libretro">Libretro (Repositorio Libre)</option>
                  </select>
                </div>

                <div className="fixmatch-field">
                  <label htmlFor="fixmatch-input-year">Año (opcional)</label>
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
                    placeholder="Ej. 2006"
                  />
                </div>

                <div className="fixmatch-field">
                  <label htmlFor="fixmatch-select-platform">Plataforma</label>
                  <select
                    id="fixmatch-select-platform"
                    className="fixmatch-select"
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    title="Filtrar por plataforma"
                  >
                    {game.platform && (
                      <option value={game.platform}>Actual ({game.platform})</option>
                    )}
                    <option value="">Todas las plataformas</option>
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
                  <span><strong>Nota:</strong> No has configurado tu API Key de SteamGridDB. Puedes agregar una clave gratuita en <em>Configuración</em> para acceder a miles de carátulas HD de la comunidad, o cambiar el agente a <strong>Steam Store</strong> o <strong>Libretro</strong>.</span>
                </div>
              )}

              <div className="fixmatch-form-actions">
                <button type="button" className="fixmatch-btn fixmatch-btn-cancel" onClick={onClose}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="fixmatch-btn fixmatch-btn-search"
                  onClick={handleSearch}
                  disabled={loading || !title.trim()}
                >
                  {loading ? "Buscando…" : "Buscar"}
                </button>
              </div>

              {/* Mensajes de error */}
              {error && <div className="fixmatch-error">{error}</div>}

              {/* Indicador de carga */}
              {loading && (
                <div className="fixmatch-loading-wrap">
                  <div className="fixmatch-spinner" />
                  <p>Buscando coincidencias en la base de datos…</p>
                </div>
              )}

              {/* Resultados */}
              {!loading && searched && candidates.length > 0 && (
                <div className="fixmatch-results-wrap">
                  <h3 className="fixmatch-results-title">
                    Coincidencias encontradas ({candidates.length})
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
                              <span className="fixmatch-chip fixmatch-chip-dev" title={`Desarrollador: ${cand.developer}`}>
                                🛠 {cand.developer}
                              </span>
                            )}
                            {cand.publisher && cand.publisher !== cand.developer && (
                              <span className="fixmatch-chip fixmatch-chip-pub" title={`Distribuidor: ${cand.publisher}`}>
                                🏢 {cand.publisher}
                              </span>
                            )}
                            {cand.region && (
                              <span className="fixmatch-chip fixmatch-chip-region" title={`Región: ${cand.region}`}>
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
                              title="Aplica la carátula y los datos del juego (nombre, año, género, etc.)"
                            >
                              {applying ? "Aplicando…" : "Aplicar todo"}
                            </button>

                            <button
                              type="button"
                              className="fixmatch-btn-secondary"
                              onClick={() => handleApplyCandidate(cand, "metadata")}
                              disabled={applying}
                              title="Aplica solo el nombre y datos/tags sin alterar la carátula actual"
                            >
                              Solo datos
                            </button>

                            <button
                              type="button"
                              className="fixmatch-btn-secondary"
                              onClick={() => handleApplyCandidate(cand, "cover")}
                              disabled={applying || (!cand.cover_url && !cand.cover_thumb)}
                              title="Descarga y aplica solo la carátula sin alterar los datos ni tags del juego"
                            >
                              Solo carátula
                            </button>

                            {agent === "steamgriddb" && (
                              <button
                                type="button"
                                className="fixmatch-btn-variants"
                                onClick={() => handleViewCoverVariants(cand)}
                                title="Ver otras variantes de arte vertical para este juego"
                              >
                                Más carátulas
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
                  ← Volver a resultados
                </button>
                <span className="fixmatch-variants-title">
                  Elige el diseño de portada para <strong>{activeCandidate.name}</strong>
                </span>
              </div>

              {variantsLoading && (
                <div className="fixmatch-loading-wrap">
                  <div className="fixmatch-spinner" />
                  <p>Cargando diseños disponibles…</p>
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
                        alt={`Carátula ${grid.id}`}
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
                            title="Aplica solo esta carátula sin modificar los datos del juego"
                          >
                            Solo carátula
                          </button>
                          <button
                            type="button"
                            className="fixmatch-grid-select-btn fixmatch-grid-select-all"
                            disabled={applying}
                            onClick={() => handleApplyCandidate(activeCandidate, "all", grid.url)}
                            title="Aplica esta carátula y los datos del juego"
                          >
                            Carátula + datos
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
