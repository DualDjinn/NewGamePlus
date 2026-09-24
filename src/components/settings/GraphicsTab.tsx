import type { GraphicsSettings } from "../../lib/tauri";
import type { GraphicsConsole } from "../../types";

export interface GraphicsTabProps {
  graphics: GraphicsSettings;
  activeGraphicsConsole: GraphicsConsole;
  setActiveGraphicsConsole: (c: GraphicsConsole) => void;
  updateGlobalGraphic: <K extends keyof GraphicsSettings>(key: K, value: GraphicsSettings[K]) => void;
  updateCoreOption: (key: string, value: string) => void;
  savedToast: boolean;
}

export default function GraphicsTab({
  graphics,
  activeGraphicsConsole,
  setActiveGraphicsConsole,
  updateGlobalGraphic,
  updateCoreOption,
  savedToast,
}: GraphicsTabProps) {
  return (
    <div className="settings-tab-panel">
      <div
        className="settings-panel-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <h2>Opciones Gráficas &amp; Renderizado HD</h2>
          <p>Configura resolución interna, filtros de texturas, shaders y escalado por consola.</p>
        </div>
        {savedToast && <span className="settings-badge-ok">✓ Guardado</span>}
      </div>

      {/* Sub-selector de consolas */}
      <div className="settings-console-tabs">
        <button
          type="button"
          className={`settings-console-pill ${activeGraphicsConsole === "citra" ? "active" : ""}`}
          onClick={() => setActiveGraphicsConsole("citra")}
        >
          🎮 3DS (Citra)
        </button>
        <button
          type="button"
          className={`settings-console-pill ${activeGraphicsConsole === "pcsx2" ? "active" : ""}`}
          onClick={() => setActiveGraphicsConsole("pcsx2")}
        >
          🎮 PS2 (PCSX2)
        </button>
        <button
          type="button"
          className={`settings-console-pill ${activeGraphicsConsole === "dolphin" ? "active" : ""}`}
          onClick={() => setActiveGraphicsConsole("dolphin")}
        >
          🎮 GameCube / Wii
        </button>
        <button
          type="button"
          className={`settings-console-pill ${activeGraphicsConsole === "ppsspp" ? "active" : ""}`}
          onClick={() => setActiveGraphicsConsole("ppsspp")}
        >
          🎮 PSP (PPSSPP)
        </button>
        <button
          type="button"
          className={`settings-console-pill ${activeGraphicsConsole === "ps1" ? "active" : ""}`}
          onClick={() => setActiveGraphicsConsole("ps1")}
        >
          🎮 PS1
        </button>
        <button
          type="button"
          className={`settings-console-pill ${activeGraphicsConsole === "n64" ? "active" : ""}`}
          onClick={() => setActiveGraphicsConsole("n64")}
        >
          🎮 N64
        </button>
        <button
          type="button"
          className={`settings-console-pill ${activeGraphicsConsole === "nds" ? "active" : ""}`}
          onClick={() => setActiveGraphicsConsole("nds")}
        >
          🎮 NDS (MelonDS)
        </button>
        <button
          type="button"
          className={`settings-console-pill ${activeGraphicsConsole === "global" ? "active" : ""}`}
          onClick={() => setActiveGraphicsConsole("global")}
        >
          🌟 Globales
        </button>
      </div>

      {/* --- CITRA (3DS) --- */}
      {activeGraphicsConsole === "citra" && (
        <section className="settings-card" id="settings-graphics-citra">
          <div className="settings-card-header">
            <div>
              <h3>Nintendo 3DS (Core Citra)</h3>
              <p>Opciones de renderizado 3D y distribución de pantallas.</p>
            </div>
          </div>

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">Resolución Interna (Upscaling)</span>
              <p className="settings-option-desc">Multiplica la resolución nativa de 3DS para gráficos nítidos en HD.</p>
            </div>
            <select
              className="settings-select"
              value={graphics.core_options["citra_resolution_factor"] || "1x (Native)"}
              onChange={(e) => updateCoreOption("citra_resolution_factor", e.target.value)}
            >
              <option value="1x (Native)">1x (Nativa - 400x240)</option>
              <option value="2x">2x (800x480 - HD)</option>
              <option value="3x">3x (1200x720 - 720p HD)</option>
              <option value="4x">4x (1600x960 - 1080p Full HD)</option>
              <option value="5x">5x (2000x1200 - 1440p 2K)</option>
            </select>
          </div>

          <div className="settings-divider" />

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">Disposición de Pantallas</span>
              <p className="settings-option-desc">Cómo se organizan la pantalla superior y táctil en tu monitor.</p>
            </div>
            <select
              className="settings-select"
              value={graphics.core_options["citra_layout_option"] || "Default Top-Bottom Screen"}
              onChange={(e) => updateCoreOption("citra_layout_option", e.target.value)}
            >
              <option value="Default Top-Bottom Screen">Arriba / Abajo (Estándar)</option>
              <option value="Side by Side">Lado a Lado (Horizontal)</option>
              <option value="Single Screen Only">Solo Pantalla Principal</option>
              <option value="Large Screen, Small Screen">Pantalla Principal Grande</option>
            </select>
          </div>

          <div className="settings-divider" />

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">Filtro de Texturas (Texture Filter)</span>
              <p className="settings-option-desc">Algoritmo de mejora y escalado de texturas 3D.</p>
            </div>
            <select
              className="settings-select"
              value={graphics.core_options["citra_texture_filter"] || "none"}
              onChange={(e) => updateCoreOption("citra_texture_filter", e.target.value)}
            >
              <option value="none">Desactivado (Original)</option>
              <option value="Anime4K Ultrafast">Anime4K Ultrafast</option>
              <option value="Bicubic">Bicúbico</option>
              <option value="ScaleForce">ScaleForce</option>
              <option value="xBRZ">xBRZ HD</option>
            </select>
          </div>

          <div className="settings-divider" />

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">Post-Processing Shader (Anti-Aliasing)</span>
              <p className="settings-option-desc">Suavizado de bordes y dientes de sierra en polígonos.</p>
            </div>
            <select
              className="settings-select"
              value={graphics.core_options["citra_post_processing_shader"] || "none"}
              onChange={(e) => updateCoreOption("citra_post_processing_shader", e.target.value)}
            >
              <option value="none">Ninguno</option>
              <option value="fxaa">FXAA (Anti-Aliasing Suave)</option>
              <option value="hq4x">HQ4x</option>
            </select>
          </div>

          <div className="settings-divider" />

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">Filtro Lineal de Pantalla</span>
              <p className="settings-option-desc">Suavizado de visualización entre pantallas.</p>
            </div>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={graphics.core_options["citra_linear_filter"] !== "disabled"}
                onChange={(e) =>
                  updateCoreOption("citra_linear_filter", e.target.checked ? "enabled" : "disabled")
                }
              />
              <span className="settings-toggle-slider" />
            </label>
          </div>
        </section>
      )}

      {/* --- PCSX2 (PS2) --- */}
      {activeGraphicsConsole === "pcsx2" && (
        <section className="settings-card" id="settings-graphics-pcsx2">
          <div className="settings-card-header">
            <div>
              <h3>PlayStation 2 (Core PCSX2 / LRPS2)</h3>
              <p>Mejoras de renderizado y escalado 3D de alta fidelidad.</p>
            </div>
          </div>

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">Resolución Interna (Upscaling)</span>
              <p className="settings-option-desc">
                Multiplicador de resolución para gráficos de PS2 en Full HD o 4K.
              </p>
            </div>
            <select
              className="settings-select"
              value={graphics.core_options["pcsx2_upscale_multiplier"] || "1"}
              onChange={(e) => updateCoreOption("pcsx2_upscale_multiplier", e.target.value)}
            >
              <option value="1">1x (Nativo PS2 480i/p)</option>
              <option value="2">2x (720p HD)</option>
              <option value="3">3x (1080p Full HD)</option>
              <option value="4">4x (1440p 2K)</option>
              <option value="6">6x (4K Ultra HD)</option>
            </select>
          </div>

          <div className="settings-divider" />

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">Filtrado Anisótropo (Anisotropic Filtering)</span>
              <p className="settings-option-desc">Aumenta la claridad de las texturas en ángulos oblicuos.</p>
            </div>
            <select
              className="settings-select"
              value={graphics.core_options["pcsx2_anisotropic_filtering"] || "0"}
              onChange={(e) => updateCoreOption("pcsx2_anisotropic_filtering", e.target.value)}
            >
              <option value="0">Desactivado (Off)</option>
              <option value="2">2x</option>
              <option value="4">4x</option>
              <option value="8">8x</option>
              <option value="16">16x (Máxima calidad)</option>
            </select>
          </div>

          <div className="settings-divider" />

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">Parches Widescreen 16:9</span>
              <p className="settings-option-desc">
                Aplica parches automáticos para expandir juegos 4:3 a pantalla ancha 16:9.
              </p>
            </div>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={graphics.core_options["pcsx2_widescreen_patches"] === "enabled"}
                onChange={(e) =>
                  updateCoreOption("pcsx2_widescreen_patches", e.target.checked ? "enabled" : "disabled")
                }
              />
              <span className="settings-toggle-slider" />
            </label>
          </div>
        </section>
      )}

      {/* --- DOLPHIN (GameCube / Wii) --- */}
      {activeGraphicsConsole === "dolphin" && (
        <section className="settings-card" id="settings-graphics-dolphin">
          <div className="settings-card-header">
            <div>
              <h3>Nintendo GameCube / Wii (Core Dolphin)</h3>
              <p>Opciones de renderizado EFB, antialiasing y resolución.</p>
            </div>
          </div>

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">Resolución Interna EFB</span>
              <p className="settings-option-desc">Escalado de renderizado 3D.</p>
            </div>
            <select
              className="settings-select"
              value={graphics.core_options["dolphin_efb_scale"] || "x1 (640x528)"}
              onChange={(e) => updateCoreOption("dolphin_efb_scale", e.target.value)}
            >
              <option value="x1 (640x528)">1x (640x528 - Nativa 480p)</option>
              <option value="x2 (1280x1056)">2x (1280x1056 - 720p HD)</option>
              <option value="x3 (1920x1584)">3x (1920x1584 - 1080p FHD)</option>
              <option value="x4 (2560x2112)">4x (2560x2112 - 1440p 2K)</option>
            </select>
          </div>

          <div className="settings-divider" />

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">Anti-Aliasing (MSAA)</span>
              <p className="settings-option-desc">Suavizado de polígonos.</p>
            </div>
            <select
              className="settings-select"
              value={graphics.core_options["dolphin_anti_aliasing"] || "None"}
              onChange={(e) => updateCoreOption("dolphin_anti_aliasing", e.target.value)}
            >
              <option value="None">Ninguno</option>
              <option value="2x MSAA">2x MSAA</option>
              <option value="4x MSAA">4x MSAA</option>
              <option value="8x MSAA">8x MSAA</option>
            </select>
          </div>

          <div className="settings-divider" />

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">Widescreen Hack 16:9</span>
              <p className="settings-option-desc">
                Fuerza renderizado panorámico 16:9 en juegos de GameCube.
              </p>
            </div>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={graphics.core_options["dolphin_widescreen_hack"] === "enabled"}
                onChange={(e) =>
                  updateCoreOption("dolphin_widescreen_hack", e.target.checked ? "enabled" : "disabled")
                }
              />
              <span className="settings-toggle-slider" />
            </label>
          </div>
        </section>
      )}

      {/* --- PPSSPP (PSP) --- */}
      {activeGraphicsConsole === "ppsspp" && (
        <section className="settings-card" id="settings-graphics-ppsspp">
          <div className="settings-card-header">
            <div>
              <h3>PlayStation Portable (Core PPSSPP)</h3>
              <p>Resolución y filtros de texturas HD para PSP.</p>
            </div>
          </div>

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">Resolución de Renderizado</span>
              <p className="settings-option-desc">Multiplica la resolución nativa de PSP (480x272).</p>
            </div>
            <select
              className="settings-select"
              value={graphics.core_options["ppsspp_internal_resolution"] || "480x272"}
              onChange={(e) => updateCoreOption("ppsspp_internal_resolution", e.target.value)}
            >
              <option value="480x272">1x (480x272 - Nativa)</option>
              <option value="960x544">2x (960x544 - 2x PSP / PS Vita)</option>
              <option value="1440x816">3x (1440x816 - 720p HD)</option>
              <option value="1920x1088">4x (1920x1088 - 1080p Full HD)</option>
              <option value="2400x1360">5x (2400x1360 - 2K)</option>
            </select>
          </div>

          <div className="settings-divider" />

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">Escalado de Texturas HD</span>
              <p className="settings-option-desc">Algoritmo para reescalar texturas 2D y 3D en alta definición.</p>
            </div>
            <select
              className="settings-select"
              value={graphics.core_options["ppsspp_texture_scaling_type"] || "off"}
              onChange={(e) => updateCoreOption("ppsspp_texture_scaling_type", e.target.value)}
            >
              <option value="off">Desactivado (Off)</option>
              <option value="xbrz">xBRZ HD</option>
              <option value="hybrid">Híbrido</option>
              <option value="bicubic">Bicúbico</option>
            </select>
          </div>
        </section>
      )}

      {/* --- PS1 --- */}
      {activeGraphicsConsole === "ps1" && (
        <section className="settings-card" id="settings-graphics-ps1">
          <div className="settings-card-header">
            <div>
              <h3>PlayStation 1 (Core PCSX-ReARMed / Beetle PSX)</h3>
              <p>Mejoras de alta resolución y tramado para PS1.</p>
            </div>
          </div>

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">Modo Alta Resolución HD (Neon Enhanced)</span>
              <p className="settings-option-desc">Duplica la resolución de renderizado 3D de PS1 a 480p.</p>
            </div>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={graphics.core_options["pcsx_rearmed_neon_enhancement_enable"] === "enabled"}
                onChange={(e) =>
                  updateCoreOption(
                    "pcsx_rearmed_neon_enhancement_enable",
                    e.target.checked ? "enabled" : "disabled"
                  )
                }
              />
              <span className="settings-toggle-slider" />
            </label>
          </div>

          <div className="settings-divider" />

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">Suavizado de Texturas HD</span>
              <p className="settings-option-desc">Aplica filtrado suave a las texturas 3D en modo de alta resolución.</p>
            </div>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={graphics.core_options["pcsx_rearmed_neon_enhancement_no_main"] === "enabled"}
                onChange={(e) =>
                  updateCoreOption(
                    "pcsx_rearmed_neon_enhancement_no_main",
                    e.target.checked ? "enabled" : "disabled"
                  )
                }
              />
              <span className="settings-toggle-slider" />
            </label>
          </div>
        </section>
      )}

      {/* --- N64 --- */}
      {activeGraphicsConsole === "n64" && (
        <section className="settings-card" id="settings-graphics-n64">
          <div className="settings-card-header">
            <div>
              <h3>Nintendo 64 (Core Mupen64Plus-Next)</h3>
              <p>Resolución 3D y escalado de texturas.</p>
            </div>
          </div>

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">Resolución de Renderizado</span>
              <p className="settings-option-desc">Resolución del plugin gráfico GLideN64.</p>
            </div>
            <select
              className="settings-select"
              value={graphics.core_options["mupen64plus-next-43screensize"] || "640x480"}
              onChange={(e) => updateCoreOption("mupen64plus-next-43screensize", e.target.value)}
            >
              <option value="640x480">640x480 (Nativa N64)</option>
              <option value="960x720">960x720 (HD)</option>
              <option value="1440x1080">1440x1080 (Full HD)</option>
              <option value="1920x1440">1920x1440 (2K)</option>
            </select>
          </div>
        </section>
      )}

      {/* --- NDS --- */}
      {activeGraphicsConsole === "nds" && (
        <section className="settings-card" id="settings-graphics-nds">
          <div className="settings-card-header">
            <div>
              <h3>Nintendo DS (Core MelonDS)</h3>
              <p>Disposición y modo táctil de pantallas.</p>
            </div>
          </div>

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">Distribución de Pantallas</span>
              <p className="settings-option-desc">Orientación de las dos pantallas de Nintendo DS.</p>
            </div>
            <select
              className="settings-select"
              value={graphics.core_options["melonds_screen_layout"] || "Top/Bottom"}
              onChange={(e) => updateCoreOption("melonds_screen_layout", e.target.value)}
            >
              <option value="Top/Bottom">Arriba / Abajo (Vertical)</option>
              <option value="Left/Right">Izquierda / Derecha (Horizontal)</option>
              <option value="Top Only">Solo Pantalla Superior</option>
              <option value="Bottom Only">Solo Pantalla Táctil</option>
            </select>
          </div>
        </section>
      )}

      {/* --- GLOBALES --- */}
      {activeGraphicsConsole === "global" && (
        <section className="settings-card" id="settings-graphics-global">
          <div className="settings-card-header">
            <div>
              <h3>Opciones Gráficas Globales</h3>
              <p>Filtros aplicables a todas las consolas y juegos 2D/3D.</p>
            </div>
          </div>

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">Filtro de Suavizado Bilineal (Linear Filter)</span>
              <p className="settings-option-desc">Suaviza los bordes de la imagen para pantallas grandes.</p>
            </div>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={graphics.video_smooth}
                onChange={(e) => updateGlobalGraphic("video_smooth", e.target.checked)}
              />
              <span className="settings-toggle-slider" />
            </label>
          </div>

          <div className="settings-divider" />

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">Escalado por Enteros (Pixel-Perfect)</span>
              <p className="settings-option-desc">Garantiza que los píxeles 2D de consolas retro no se distorsionen.</p>
            </div>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={graphics.video_scale_integer}
                onChange={(e) => updateGlobalGraphic("video_scale_integer", e.target.checked)}
              />
              <span className="settings-toggle-slider" />
            </label>
          </div>

          <div className="settings-divider" />

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">Relación de Aspecto Global</span>
              <p className="settings-option-desc">Proporción de pantalla al reproducir juegos.</p>
            </div>
            <select
              className="settings-select"
              value={graphics.aspect_ratio || "auto"}
              onChange={(e) => updateGlobalGraphic("aspect_ratio", e.target.value)}
            >
              <option value="auto">Automática (Provista por el Core)</option>
              <option value="4:3">4:3 (Televisor Clásico)</option>
              <option value="16:9">16:9 (Pantalla Ancha)</option>
              <option value="16:10">16:10 (Monitor PC / Steam Deck)</option>
            </select>
          </div>
        </section>
      )}
    </div>
  );
}
