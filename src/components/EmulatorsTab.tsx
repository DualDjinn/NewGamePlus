import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import type { EmulatorInfo } from "../types";
import {
  getEmulatorVersions,
  checkEmulatorUpdates,
  updateEmulator,
  updateAllCores,
  getSettings,
  setAutoUpdateCheck,
  getEdenRequirements,
  openEdenKeysFolder,
  openEdenFirmwareFolder,
  importEdenKeysFrom,
  importEdenFirmwareFrom,
  getEdenDlcStatus,
  stageEdenUpdateFiles,
  openEdenGui,
  type EdenRequirements,
  type EdenDlcStatus,
} from "../lib/tauri";

// ponytail: estado local + comandos existentes; sin stores ni polling (el backend emite eventos).
export default function EmulatorsTab() {
  const { t } = useTranslation();
  const [infos, setInfos] = useState<EmulatorInfo[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updatingCores, setUpdatingCores] = useState(false);
  const [message, setMessage] = useState("");
  const [autoCheck, setAutoCheck] = useState(true);
  const [lastCheck, setLastCheck] = useState<number | null>(null);
  const [edenReqs, setEdenReqs] = useState<EdenRequirements | null>(null);

  useEffect(() => {
    getEmulatorVersions().then(setInfos).catch(() => setInfos([]));
    getSettings()
      .then((s) => {
        setAutoCheck(s.auto_update_check ?? true);
        setLastCheck(s.last_emulator_check_secs ?? null);
      })
      .catch(() => {});
  }, []);

  const refreshEdenReqs = useCallback(() => {
    getEdenRequirements().then(setEdenReqs).catch(() => setEdenReqs(null));
  }, []);

  const [dlcStatus, setDlcStatus] = useState<EdenDlcStatus | null>(null);

  const refreshDlcStatus = useCallback(() => {
    getEdenDlcStatus().then(setDlcStatus).catch(() => setDlcStatus(null));
  }, []);

  const handleSelectEdenFolder = useCallback(async (kind: "keys" | "firmware") => {
    setMessage("");
    try {
      const dir = await openDialog({
        directory: true,
        multiple: false,
        title: t("settings.emulators.edenKeys.selectFolder"),
      });
      if (typeof dir !== "string" || !dir) return;
      const reqs =
        kind === "keys"
          ? await importEdenKeysFrom(dir)
          : await importEdenFirmwareFrom(dir);
      setEdenReqs(reqs);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }, [t]);

  const handleSelectDlcFiles = useCallback(async () => {
    setMessage("");
    try {
      const picked = await openDialog({
        directory: false,
        multiple: true,
        title: t("settings.emulators.edenDlc.selectFiles"),
        filters: [{ name: "Switch update/DLC", extensions: ["nsp", "xci"] }],
      });
      const files = Array.isArray(picked) ? picked : picked ? [picked] : [];
      if (files.length === 0) return;
      setDlcStatus(await stageEdenUpdateFiles(files));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }, [t]);

  const handleOpenEdenGui = useCallback(async () => {
    setMessage("");
    try {
      setMessage(await openEdenGui());
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    if (infos?.some((i) => i.id === "eden" && i.installed)) {
      refreshEdenReqs();
      refreshDlcStatus();
    } else {
      setEdenReqs(null);
      setDlcStatus(null);
    }
  }, [infos, refreshEdenReqs, refreshDlcStatus]);

  const handleCheck = useCallback(async () => {
    setChecking(true);
    setMessage("");
    try {
      const res = await checkEmulatorUpdates();
      setInfos(res);
      const s = await getSettings().catch(() => null);
      if (s) setLastCheck(s.last_emulator_check_secs ?? null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setChecking(false);
    }
  }, []);

  const handleUpdate = useCallback(async (id: string) => {
    setUpdatingId(id);
    setMessage("");
    try {
      const msg = await updateEmulator(id);
      setMessage(msg);
      setInfos(await getEmulatorVersions());
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const handleUpdateCores = useCallback(async () => {
    setUpdatingCores(true);
    setMessage("");
    try {
      const updated = await updateAllCores();
      setMessage(`${updated.length} ${t("settings.emulators.coresUpdated")}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setUpdatingCores(false);
    }
  }, [t]);

  const handleAutoCheck = useCallback(async (enabled: boolean) => {
    setAutoCheck(enabled);
    try {
      await setAutoUpdateCheck(enabled);
    } catch (e) {
      setAutoCheck(!enabled);
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const lastCheckLabel =
    lastCheck && lastCheck > 0
      ? new Date(lastCheck * 1000).toLocaleString()
      : t("settings.emulators.neverChecked");

  return (
    <div className="settings-tab-panel">
      <div className="settings-panel-header">
        <h2>{t("settings.tabs.emulators")}</h2>
        <p>{t("settings.emulators.subtitle")}</p>
      </div>

      <section className="settings-card" id="settings-emulators-check">
        <div className="settings-card-header">
          <div>
            <h3>{t("settings.emulators.checkNow")}</h3>
            <p>
              {t("settings.emulators.lastCheck")}: {lastCheckLabel}
            </p>
          </div>
          <button
            type="button"
            className="settings-btn-secondary"
            onClick={handleCheck}
            disabled={checking}
          >
            {checking ? t("settings.emulators.checking") : t("settings.emulators.checkNow")}
          </button>
        </div>
        <div className="settings-row-option">
          <div>
            <span className="settings-option-title">{t("settings.emulators.autoCheck")}</span>
            <p className="settings-option-desc">{t("settings.emulators.autoCheckDesc")}</p>
          </div>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={autoCheck}
              onChange={(e) => handleAutoCheck(e.target.checked)}
            />
            <span className="settings-toggle-slider" />
          </label>
        </div>
      </section>

      <section className="settings-card" id="settings-emulators-list">
        <div className="settings-card-header">
          <div>
            <h3>{t("settings.tabs.emulators")}</h3>
          </div>
        </div>
        {infos === null && <p>{t("common.loading")}</p>}
        {infos !== null &&
          infos.map((info) => (
            <div className="settings-row-option" key={info.id}>
              <div>
                <span className="settings-option-title">{info.display_name}</span>
                <p className="settings-option-desc">
                  {t("settings.emulators.installed")}:{" "}
                  {info.installed
                    ? (info.installed_version ?? t("settings.emulators.unknownVersion"))
                    : t("settings.emulators.notInstalled")}
                  {" • "}
                  {t("settings.emulators.latest")}:{" "}
                  {info.latest_version ?? t("settings.emulators.unknownVersion")}
                  {" • "}
                  {info.update_available ? (
                    <strong>{t("settings.emulators.updateAvailable")}</strong>
                  ) : (
                    t("settings.emulators.upToDate")
                  )}
                </p>
              </div>
              {info.installed && (
                <button
                  type="button"
                  className="settings-btn-secondary"
                  onClick={() => handleUpdate(info.id)}
                  disabled={updatingId !== null || updatingCores}
                >
                  {updatingId === info.id
                    ? t("settings.emulators.updating")
                    : t("settings.emulators.update")}
                </button>
              )}
              {info.id === "eden" && info.installed && (
                <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <p className="settings-option-desc">
                    {t("settings.emulators.edenKeys.inUse")}:{" "}
                    <code style={{ userSelect: "text" }}>{info.exe_path ?? "…"}</code>
                  </p>
                  <p className="settings-option-desc">{t("settings.emulators.edenKeys.inUseDesc")}</p>
                  <p className="settings-option-desc">{t("settings.emulators.edenKeys.miiNote")}</p>
                  {edenReqs && (
                  <>
                  <p className="settings-option-desc">
                    {t("settings.emulators.edenKeys.prodKeys")}:{" "}
                    {edenReqs.has_prod_keys ? "✅" : "❌"}{" "}
                    <code style={{ userSelect: "text" }}>{edenReqs.keys_dir}</code>{" "}
                    <button
                      type="button"
                      className="settings-btn-secondary"
                      onClick={() => handleSelectEdenFolder("keys")}
                    >
                      {t("settings.emulators.edenKeys.selectFolder")}
                    </button>{" "}
                    <button
                      type="button"
                      className="settings-btn-secondary"
                      onClick={() =>
                        openEdenKeysFolder().then(refreshEdenReqs).catch(() => {})
                      }
                    >
                      {t("settings.emulators.edenKeys.openFolder")}
                    </button>
                  </p>
                  <p className="settings-option-desc">
                    {t("settings.emulators.edenKeys.firmware")}:{" "}
                    {edenReqs.has_firmware ? "✅" : "❌"}{" "}
                    <code style={{ userSelect: "text" }}>{edenReqs.firmware_dir}</code>{" "}
                    <button
                      type="button"
                      className="settings-btn-secondary"
                      onClick={() => handleSelectEdenFolder("firmware")}
                    >
                      {t("settings.emulators.edenKeys.selectFolder")}
                    </button>{" "}
                    <button
                      type="button"
                      className="settings-btn-secondary"
                      onClick={() =>
                        openEdenFirmwareFolder().then(refreshEdenReqs).catch(() => {})
                      }
                    >
                      {t("settings.emulators.edenKeys.openFolderFirmware")}
                    </button>
                  </p>
                  </>
                  )}
                </div>
              )}
            </div>
          ))}
      </section>

      {infos?.some((i) => i.id === "eden" && i.installed) && (
        <section className="settings-card" id="settings-emulators-eden-dlc">
          <div className="settings-card-header">
            <div>
              <h3>{t("settings.emulators.edenDlc.title")}</h3>
              <p>{t("settings.emulators.edenDlc.subtitle")}</p>
            </div>
          </div>
          {dlcStatus === null ? (
            <p>{t("common.loading")}</p>
          ) : (
            <>
              <div className="settings-row-option">
                <div>
                  <span className="settings-option-title">
                    {t("settings.emulators.edenDlc.installed", { count: dlcStatus.installed_entries })}
                  </span>
                  <p className="settings-option-desc">
                    {t("settings.emulators.edenDlc.staged", { count: dlcStatus.staging_count })}{" "}
                    <code style={{ userSelect: "text" }}>{dlcStatus.staging_dir}</code>
                  </p>
                </div>
              </div>
              <ol className="settings-option-desc" style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <li>{t("settings.emulators.edenDlc.step1")}</li>
                <li>{t("settings.emulators.edenDlc.step2")}</li>
                <li>{t("settings.emulators.edenDlc.step3")}</li>
                <li>{t("settings.emulators.edenDlc.step4")}</li>
              </ol>
              <p className="settings-hint">{t("settings.emulators.edenDlc.mergedNote")}</p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
                <button
                  type="button"
                  className="settings-btn-secondary"
                  onClick={handleSelectDlcFiles}
                >
                  {t("settings.emulators.edenDlc.selectFiles")}
                </button>
                <button
                  type="button"
                  className="settings-btn-secondary"
                  onClick={handleOpenEdenGui}
                >
                  {t("settings.emulators.edenDlc.openEden")}
                </button>
                <button
                  type="button"
                  className="settings-btn-secondary"
                  onClick={refreshDlcStatus}
                >
                  {t("settings.emulators.edenKeys.recheck")}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      <section className="settings-card" id="settings-emulators-cores">
        <div className="settings-card-header">
          <div>
            <h3>{t("settings.emulators.updateCores")}</h3>
            <p>Nightly libretro — {t("settings.emulators.subtitle")}</p>
          </div>
          <button
            type="button"
            className="settings-btn-secondary"
            onClick={handleUpdateCores}
            disabled={updatingCores || updatingId !== null}
          >
            {updatingCores
              ? t("settings.emulators.updatingCores")
              : t("settings.emulators.updateCores")}
          </button>
        </div>
      </section>

      {message && (
        <section className="settings-card" id="settings-emulators-message">
          <p>{message}</p>
        </section>
      )}
    </div>
  );
}
