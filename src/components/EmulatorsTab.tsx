import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { EmulatorInfo } from "../types";
import {
  getEmulatorVersions,
  checkEmulatorUpdates,
  updateEmulator,
  updateAllCores,
  getSettings,
  setAutoUpdateCheck,
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

  useEffect(() => {
    getEmulatorVersions().then(setInfos).catch(() => setInfos([]));
    getSettings()
      .then((s) => {
        setAutoCheck(s.auto_update_check ?? true);
        setLastCheck(s.last_emulator_check_secs ?? null);
      })
      .catch(() => {});
  }, []);

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
            </div>
          ))}
      </section>

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
