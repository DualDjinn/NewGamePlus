import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import "./ConfirmModal.css";
import {
  getEdenRequirements,
  importEdenKeysFrom,
  importEdenFirmwareFrom,
  type EdenRequirements,
} from "../lib/tauri";

export interface EdenKeysModalProps {
  romPath: string | null;
  onClose: () => void;
  onPlay: (romPath: string) => void;
}

type FocusBtn = "selectKeys" | "selectFw" | "recheck" | "play" | "close";

// ponytail: un solo modal auto-contenido (trae sus datos); App.tsx solo lo monta.
export default function EdenKeysModal({ romPath, onClose, onPlay }: EdenKeysModalProps) {
  const { t } = useTranslation();
  const [reqs, setReqs] = useState<EdenRequirements | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedBtn, setFocusedBtn] = useState<FocusBtn>("selectKeys");

  const fetchReqs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setReqs(await getEdenRequirements());
    } catch {
      setReqs(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelect = useCallback(
    async (kind: "keys" | "firmware") => {
      setError("");
      try {
        const dir = await openDialog({
          directory: true,
          multiple: false,
          title: t("settings.emulators.edenKeys.selectFolder"),
        });
        if (typeof dir !== "string" || !dir) return;
        setLoading(true);
        const updated =
          kind === "keys"
            ? await importEdenKeysFrom(dir)
            : await importEdenFirmwareFrom(dir);
        setReqs(updated);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    if (romPath) {
      setFocusedBtn("selectKeys");
      fetchReqs();
    }
  }, [romPath, fetchReqs]);

  const ready = !!reqs?.has_prod_keys && !!reqs?.has_firmware;

  const order: FocusBtn[] = ["selectKeys", "selectFw", "recheck", "play", "close"];
  useEffect(() => {
    if (!romPath) return;
    function handleKeyDown(e: KeyboardEvent) {
      const idx = order.indexOf(focusedBtn);
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFocusedBtn(order[(idx - 1 + order.length) % order.length]);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setFocusedBtn(order[(idx + 1) % order.length]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (focusedBtn === "selectKeys") handleSelect("keys");
        else if (focusedBtn === "selectFw") handleSelect("firmware");
        else if (focusedBtn === "recheck") fetchReqs();
        else if (focusedBtn === "play" && ready && romPath) onPlay(romPath);
        else onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [romPath, focusedBtn, ready, fetchReqs, handleSelect, onClose, onPlay]);

  if (!romPath) return null;

  const row = (ok: boolean | undefined, label: string) => (
    <div className="settings-row-option" key={label}>
      <div>
        <span className="settings-option-title">
          {ok ? "✅ " : "❌ "}{label}
        </span>
        <p className="settings-option-desc">
          {ok ? t("settings.emulators.edenKeys.ready") : t("settings.emulators.edenKeys.missing")}
        </p>
      </div>
    </div>
  );

  return (
    <div className="confirm-modal-backdrop" onClick={onClose}>
      <div
        className="confirm-modal-card warning"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="eden-keys-title"
      >
        <div className="confirm-modal-header">
          <div className="confirm-modal-icon-badge warning">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 id="eden-keys-title" className="confirm-modal-title">
            {t("settings.emulators.edenKeys.title")}
          </h2>
        </div>

        <p className="confirm-modal-message">{t("settings.emulators.edenKeys.message")}</p>
        <p className="settings-hint" style={{ marginBottom: "12px" }}>
          {t("settings.emulators.edenKeys.legal")}
        </p>

        {loading && <p>{t("common.loading")}</p>}
        {error && (
          <p className="settings-option-desc" style={{ color: "#f87171" }}>
            {error}
          </p>
        )}
        {!loading && reqs && (
          <>
            {row(reqs.has_prod_keys, t("settings.emulators.edenKeys.prodKeys"))}
            {row(reqs.has_firmware, t("settings.emulators.edenKeys.firmware"))}
            <p className="settings-option-desc" style={{ marginTop: "8px" }}>
              {t("settings.emulators.edenKeys.keysPath")}:{" "}
              <code style={{ userSelect: "text" }}>{reqs.keys_dir}</code>
            </p>
            <p className="settings-option-desc">
              {t("settings.emulators.edenKeys.firmwarePath")}:{" "}
              <code style={{ userSelect: "text" }}>{reqs.firmware_dir}</code>
            </p>
          </>
        )}

        <div className="confirm-modal-actions">
          <button
            type="button"
            className={`confirm-modal-btn btn-cancel ${focusedBtn === "selectKeys" ? "focused" : ""}`}
            onClick={() => handleSelect("keys")}
          >
            {t("settings.emulators.edenKeys.selectKeys")}
          </button>
          <button
            type="button"
            className={`confirm-modal-btn btn-cancel ${focusedBtn === "selectFw" ? "focused" : ""}`}
            onClick={() => handleSelect("firmware")}
          >
            {t("settings.emulators.edenKeys.selectFirmware")}
          </button>
          <button
            type="button"
            className={`confirm-modal-btn btn-cancel ${focusedBtn === "recheck" ? "focused" : ""}`}
            onClick={fetchReqs}
          >
            {t("settings.emulators.edenKeys.recheck")}
          </button>
          {ready ? (
            <button
              type="button"
              className={`confirm-modal-btn btn-confirm warning ${focusedBtn === "play" ? "focused" : ""}`}
              onClick={() => romPath && onPlay(romPath)}
            >
              {t("settings.emulators.edenKeys.play")}
            </button>
          ) : (
            <button
              type="button"
              className={`confirm-modal-btn btn-cancel ${focusedBtn === "close" ? "focused" : ""}`}
              onClick={onClose}
            >
              {t("settings.emulators.edenKeys.close")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
