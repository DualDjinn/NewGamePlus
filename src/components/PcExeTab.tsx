import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import type { Game } from "../types";
import { getGames, associatePcExe, clearPcExe } from "../lib/tauri";

export default function PcExeTab() {
  const { t } = useTranslation();
  const [games, setGames] = useState<Game[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => getGames().then((g) => setGames(g.filter((x) => x.platform === "PC")));
  useEffect(() => { load(); }, []);

  async function handleChange(game: Game) {
    const picked = await openDialog({
      multiple: false,
      filters: [{ name: "Executable", extensions: ["exe", "lnk", "bat", "cmd"] }],
    });
    if (!picked || Array.isArray(picked)) return;
    setBusy(game.id);
    try {
      const updated = await associatePcExe(game.id, picked);
      setGames((prev) => prev.map((g) => (g.id === game.id ? updated : g)));
    } catch (e) {
      alert(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleReset(game: Game) {
    setBusy(game.id);
    try {
      const updated = await clearPcExe(game.id);
      setGames((prev) => prev.map((g) => (g.id === game.id ? updated : g)));
    } catch (e) {
      alert(String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="settings-section">
      <h2>{t("settings.tabs.pcexe")}</h2>
      <p>{t("settings.pcexe.hint")}</p>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {games.map((g) => (
            <tr key={g.id}>
              <td style={{ padding: "6px 0" }}>{g.display_name || g.name}</td>
              <td style={{ padding: "6px 0", fontSize: 12, opacity: 0.7, wordBreak: "break-all" }}>
                {g.rom_path}
                {g.manual_exe ? "  ✓" : ""}
              </td>
              <td style={{ padding: "6px 0", textAlign: "right", whiteSpace: "nowrap" }}>
                <button disabled={busy === g.id} onClick={() => handleChange(g)}>
                  {t("settings.pcexe.change")}
                </button>
                {g.manual_exe && (
                  <button disabled={busy === g.id} onClick={() => handleReset(g)} style={{ marginLeft: 8 }}>
                    {t("settings.pcexe.reset")}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {games.length === 0 && <p>{t("settings.pcexe.empty")}</p>}
    </div>
  );
}
