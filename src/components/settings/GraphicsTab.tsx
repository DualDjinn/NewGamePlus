import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <div className="settings-tab-panel">
      <div
        className="settings-panel-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <h2>{t("settings.graphics.panelTitle")}</h2>
          <p>{t("settings.graphics.panelDesc")}</p>
        </div>
        {savedToast && <span className="settings-badge-ok">{t("settings.sound.saved")}</span>}
      </div>

      {/* Sub-selector de consolas */}
      <div className="settings-console-tabs settings-card--wide">
        <button
          type="button"
          className={`settings-console-pill ${activeGraphicsConsole === "citra" ? "active" : ""}`}
          onClick={() => setActiveGraphicsConsole("citra")}
        >
          ðŸŽ®            ðŸŽ® 3DS (Citra)
        </button>
        <button
          type="button"
          className={`settings-console-pill ${activeGraphicsConsole === "pcsx2" ? "active" : ""}`}
          onClick={() => setActiveGraphicsConsole("pcsx2")}
        >
          ðŸŽ®            ðŸŽ® PS2 (PCSX2)
        </button>
        <button
          type="button"
          className={`settings-console-pill ${activeGraphicsConsole === "dolphin" ? "active" : ""}`}
          onClick={() => setActiveGraphicsConsole("dolphin")}
        >
          ðŸŽ®            ðŸŽ® GameCube / Wii
        </button>
        <button
          type="button"
          className={`settings-console-pill ${activeGraphicsConsole === "ppsspp" ? "active" : ""}`}
          onClick={() => setActiveGraphicsConsole("ppsspp")}
        >
          ðŸŽ®            ðŸŽ® PSP (PPSSPP)
        </button>
        <button
          type="button"
          className={`settings-console-pill ${activeGraphicsConsole === "ps1" ? "active" : ""}`}
          onClick={() => setActiveGraphicsConsole("ps1")}
        >
          ðŸŽ® PS1
        </button>
        <button
          type="button"
          className={`settings-console-pill ${activeGraphicsConsole === "n64" ? "active" : ""}`}
          onClick={() => setActiveGraphicsConsole("n64")}
        >
          ðŸŽ® N64
        </button>
        <button
          type="button"
          className={`settings-console-pill ${activeGraphicsConsole === "nds" ? "active" : ""}`}
          onClick={() => setActiveGraphicsConsole("nds")}
        >
          ðŸŽ®            ðŸŽ® NDS (MelonDS)
        </button>
        <button
          type="button"
          className={`settings-console-pill ${activeGraphicsConsole === "global" ? "active" : ""}`}
          onClick={() => setActiveGraphicsConsole("global")}
        >
          ðŸŒŸ            {t("settings.graphics.globalPill")}
        </button>
      </div>

      {/* --- CITRA (3DS) --- */}
      {activeGraphicsConsole === "citra" && (
        <section className="settings-card settings-card--wide" id="settings-graphics-citra">
          <div className="settings-card-header">
            <div>
              <h3>{t("settings.graphics.citraTitle")}</h3>
              <p>{t("settings.graphics.citraDesc")}</p>
            </div>
          </div>

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">{t("settings.graphics.resolution")}</span>
              <p className="settings-option-desc">{t("settings.graphics.citraResolutionDesc")}</p>
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
              <span className="settings-option-title">{t("settings.graphics.screenLayout")}</span>
              <p className="settings-option-desc">{t("settings.graphics.screenLayoutDesc")}</p>
            </div>
            <select
              className="settings-select"
              value={graphics.core_options["citra_layout_option"] || "Default Top-Bottom Screen"}
              onChange={(e) => updateCoreOption("citra_layout_option", e.target.value)}
            >
              <option value="Default Top-Bottom Screen">{t("settings.graphics.layoutTopBottom")}</option>
              <option value="Side by Side">{t("settings.graphics.layoutSide")}</option>
              <option value="Single Screen Only">{t("settings.graphics.layoutSingle")}</option>
              <option value="Large Screen, Small Screen">{t("settings.graphics.layoutLarge")}</option>
            </select>
          </div>

          <div className="settings-divider" />

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">{t("settings.graphics.textureFilter")}</span>
              <p className="settings-option-desc">{t("settings.graphics.textureFilterDesc")}</p>
            </div>
            <select
              className="settings-select"
              value={graphics.core_options["citra_texture_filter"] || "none"}
              onChange={(e) => updateCoreOption("citra_texture_filter", e.target.value)}
            >
              <option value="none">{t("settings.graphics.filterOff")}</option>
              <option value="Anime4K Ultrafast">Anime4K Ultrafast</option>
              <option value="Bicubic">{t("settings.graphics.bicubic")}</option>
              <option value="ScaleForce">ScaleForce</option>
              <option value="xBRZ">xBRZ HD</option>
            </select>
          </div>

          <div className="settings-divider" />

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">{t("settings.graphics.shaderTitle")}</span>
              <p className="settings-option-desc">{t("settings.graphics.shaderDesc")}</p>
            </div>
            <select
              className="settings-select"
              value={graphics.core_options["citra_post_processing_shader"] || "none"}
              onChange={(e) => updateCoreOption("citra_post_processing_shader", e.target.value)}
            >
              <option value="none">{t("settings.graphics.filterNone")}</option>
              <option value="fxaa">{t("settings.graphics.fxaa")}</option>
              <option value="hq4x">HQ4x</option>
            </select>
          </div>

          <div className="settings-divider" />

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">{t("settings.graphics.linearFilter")}</span>
              <p className="settings-option-desc">{t("settings.graphics.linearFilterDesc")}</p>
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
        <section className="settings-card settings-card--wide" id="settings-graphics-pcsx2">
          <div className="settings-card-header">
            <div>
              <h3>{t("settings.graphics.pcsx2Title")}</h3>
              <p>{t("settings.graphics.pcsx2Desc")}</p>
            </div>
          </div>

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">{t("settings.graphics.resolution")}</span>
              <p className="settings-option-desc">
                {t("settings.graphics.pcsx2ResolutionDesc")}
              </p>
            </div>
            <select
              className="settings-select"
              value={graphics.core_options["pcsx2_upscale_multiplier"] || "1"}
              onChange={(e) => updateCoreOption("pcsx2_upscale_multiplier", e.target.value)}
            >
              <option value="1">{t("settings.graphics.resNative")}</option>
              <option value="2">2x (720p HD)</option>
              <option value="3">3x (1080p Full HD)</option>
              <option value="4">4x (1440p 2K)</option>
              <option value="6">6x (4K Ultra HD)</option>
            </select>
          </div>

          <div className="settings-divider" />

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">{t("settings.graphics.aniso")}</span>
              <p className="settings-option-desc">{t("settings.graphics.anisoDesc")}</p>
            </div>
            <select
              className="settings-select"
              value={graphics.core_options["pcsx2_anisotropic_filtering"] || "0"}
              onChange={(e) => updateCoreOption("pcsx2_anisotropic_filtering", e.target.value)}
            >
              <option value="0">{t("settings.graphics.filterDisabled")}</option>
              <option value="2">2x</option>
              <option value="4">4x</option>
              <option value="8">8x</option>
              <option value="16">{t("settings.graphics.maxQuality")}</option>
            </select>
          </div>

          <div className="settings-divider" />

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">{t("settings.graphics.widescreenPatches")}</span>
              <p className="settings-option-desc">
                {t("settings.graphics.widescreenPatchesDesc")}
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

      {/* --- DOLPHIN (           ðŸŽ® GameCube / Wii) --- */}
      {activeGraphicsConsole === "dolphin" && (
        <section className="settings-card settings-card--wide" id="settings-graphics-dolphin">
          <div className="settings-card-header">
            <div>
              <h3>{t("settings.graphics.dolphinTitle")}</h3>
              <p>{t("settings.graphics.dolphinDesc")}</p>
            </div>
          </div>

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">{t("settings.graphics.efbScale")}</span>
              <p className="settings-option-desc">{t("settings.graphics.efbScaleDesc")}</p>
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
              <span className="settings-option-title">{t("settings.graphics.msaa")}</span>
              <p className="settings-option-desc">{t("settings.graphics.msaaDesc")}</p>
            </div>
            <select
              className="settings-select"
              value={graphics.core_options["dolphin_anti_aliasing"] || "None"}
              onChange={(e) => updateCoreOption("dolphin_anti_aliasing", e.target.value)}
            >
              <option value="None">{t("settings.graphics.msaaNone")}</option>
              <option value="2x MSAA">2x MSAA</option>
              <option value="4x MSAA">4x MSAA</option>
              <option value="8x MSAA">8x MSAA</option>
            </select>
          </div>

          <div className="settings-divider" />

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">{t("settings.graphics.widescreenHack")}</span>
              <p className="settings-option-desc">
                {t("settings.graphics.widescreenHackDesc")}
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
        <section className="settings-card settings-card--wide" id="settings-graphics-ppsspp">
          <div className="settings-card-header">
            <div>
              <h3>{t("settings.graphics.ppssppTitle")}</h3>
              <p>{t("settings.graphics.ppssppDesc")}</p>
            </div>
          </div>

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">{t("settings.graphics.renderResolution")}</span>
              <p className="settings-option-desc">{t("settings.graphics.ppssppResolutionDesc")}</p>
            </div>
            <select
              className="settings-select"
              value={graphics.core_options["ppsspp_internal_resolution"] || "480x272"}
              onChange={(e) => updateCoreOption("ppsspp_internal_resolution", e.target.value)}
            >
              <option value="480x272">{t("settings.graphics.resPspNative")}</option>
              <option value="960x544">2x (960x544 - 2x PSP / PS Vita)</option>
              <option value="1440x816">3x (1440x816 - 720p HD)</option>
              <option value="1920x1088">4x (1920x1088 - 1080p Full HD)</option>
              <option value="2400x1360">5x (2400x1360 - 2K)</option>
            </select>
          </div>

          <div className="settings-divider" />

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">{t("settings.graphics.hdTextureScale")}</span>
              <p className="settings-option-desc">{t("settings.graphics.hdTextureScaleDesc")}</p>
            </div>
            <select
              className="settings-select"
              value={graphics.core_options["ppsspp_texture_scaling_type"] || "off"}
              onChange={(e) => updateCoreOption("ppsspp_texture_scaling_type", e.target.value)}
            >
              <option value="off">{t("settings.graphics.filterDisabled")}</option>
              <option value="xbrz">xBRZ HD</option>
              <option value="hybrid">{t("settings.graphics.hybrid")}</option>
              <option value="bicubic">{t("settings.graphics.bicubic")}</option>
            </select>
          </div>
        </section>
      )}

      {/* --- PS1 --- */}
      {activeGraphicsConsole === "ps1" && (
        <section className="settings-card settings-card--wide" id="settings-graphics-ps1">
          <div className="settings-card-header">
            <div>
              <h3>{t("settings.graphics.ps1Title")}</h3>
              <p>{t("settings.graphics.ps1Desc")}</p>
            </div>
          </div>

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">{t("settings.graphics.neonMode")}</span>
              <p className="settings-option-desc">{t("settings.graphics.neonModeDesc")}</p>
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
              <span className="settings-option-title">{t("settings.graphics.neonSmooth")}</span>
              <p className="settings-option-desc">{t("settings.graphics.neonSmoothDesc")}</p>
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
        <section className="settings-card settings-card--wide" id="settings-graphics-n64">
          <div className="settings-card-header">
            <div>
              <h3>{t("settings.graphics.n64Title")}</h3>
              <p>{t("settings.graphics.n64Desc")}</p>
            </div>
          </div>

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">{t("settings.graphics.renderResolution")}</span>
              <p className="settings-option-desc">{t("settings.graphics.n64ResolutionDesc")}</p>
            </div>
            <select
              className="settings-select"
              value={graphics.core_options["mupen64plus-next-43screensize"] || "640x480"}
              onChange={(e) => updateCoreOption("mupen64plus-next-43screensize", e.target.value)}
            >
              <option value="640x480">{t("settings.graphics.resN64Native")}</option>
              <option value="960x720">960x720 (HD)</option>
              <option value="1440x1080">1440x1080 (Full HD)</option>
              <option value="1920x1440">1920x1440 (2K)</option>
            </select>
          </div>
        </section>
      )}

      {/* --- NDS --- */}
      {activeGraphicsConsole === "nds" && (
        <section className="settings-card settings-card--wide" id="settings-graphics-nds">
          <div className="settings-card-header">
            <div>
              <h3>{t("settings.graphics.ndsTitle")}</h3>
              <p>{t("settings.graphics.ndsDesc")}</p>
            </div>
          </div>

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">{t("settings.graphics.ndsLayout")}</span>
              <p className="settings-option-desc">{t("settings.graphics.ndsLayoutDesc")}</p>
            </div>
            <select
              className="settings-select"
              value={graphics.core_options["melonds_screen_layout"] || "Top/Bottom"}
              onChange={(e) => updateCoreOption("melonds_screen_layout", e.target.value)}
            >
              <option value="Top/Bottom">{t("settings.graphics.ndsTopBottom")}</option>
              <option value="Left/Right">{t("settings.graphics.ndsLeftRight")}</option>
              <option value="Top Only">{t("settings.graphics.ndsTopOnly")}</option>
              <option value="Bottom Only">{t("settings.graphics.ndsBottomOnly")}</option>
            </select>
          </div>

          <div className="settings-divider" />

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">{t("settings.graphics.ndsTouchMode")}</span>
              <p className="settings-option-desc">{t("settings.graphics.ndsTouchModeDesc")}</p>
            </div>
            <select
              className="settings-select"
              value={graphics.core_options["melonds_touch_mode"] || "Mouse"}
              onChange={(e) => updateCoreOption("melonds_touch_mode", e.target.value)}
            >
              <option value="Mouse">{t("settings.graphics.ndsTouchMouse")}</option>
              <option value="Joystick">{t("settings.graphics.ndsTouchJoystick")}</option>
              <option value="Touch">{t("settings.graphics.ndsTouchTouch")}</option>
              <option value="Disabled">{t("settings.graphics.ndsTouchDisabled")}</option>
            </select>
          </div>

          <div className="settings-divider" />

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">{t("settings.graphics.ndsCursor")}</span>
              <p className="settings-option-desc">{t("settings.graphics.ndsCursorDesc")}</p>
            </div>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={graphics.core_options["melonds_cursor"] !== "disabled"}
                onChange={(e) =>
                  updateCoreOption("melonds_cursor", e.target.checked ? "enabled" : "disabled")
                }
              />
              <span className="settings-toggle-slider" />
            </label>
          </div>
        </section>
      )}

      {/* --- GLOBALES --- */}
      {activeGraphicsConsole === "global" && (
        <section className="settings-card settings-card--wide" id="settings-graphics-global">
          <div className="settings-card-header">
            <div>
              <h3>{t("settings.graphics.globalTitle")}</h3>
              <p>{t("settings.graphics.globalDesc")}</p>
            </div>
          </div>

          <div className="settings-row-option">
            <div>
              <span className="settings-option-title">{t("settings.graphics.bilinear")}</span>
              <p className="settings-option-desc">{t("settings.graphics.bilinearDesc")}</p>
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
              <span className="settings-option-title">{t("settings.graphics.intScale")}</span>
              <p className="settings-option-desc">{t("settings.graphics.intScaleDesc")}</p>
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
              <span className="settings-option-title">{t("settings.graphics.aspectGlobal")}</span>
              <p className="settings-option-desc">{t("settings.graphics.aspectGlobalDesc")}</p>
            </div>
            <select
              className="settings-select"
              value={graphics.aspect_ratio || "auto"}
              onChange={(e) => updateGlobalGraphic("aspect_ratio", e.target.value)}
            >
              <option value="auto">{t("settings.graphics.aspectAuto")}</option>
              <option value="4:3">{t("settings.graphics.aspect43")}</option>
              <option value="16:9">{t("settings.graphics.aspect169")}</option>
              <option value="16:10">{t("settings.graphics.aspect1610")}</option>
            </select>
          </div>
        </section>
      )}
    </div>
  );
}

