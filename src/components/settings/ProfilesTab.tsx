import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Game } from "../../types";

export interface ProfilesTabProps {
  currentProfile: string;
  profiles: string[];
  handleSwitchProfile: (name: string) => void;
  requestDeleteProfile: (name: string) => void;
  handleRenameProfile?: (oldName: string, newName: string) => void;
  newProfileName: string;
  setNewProfileName: (name: string) => void;
  handleCreateProfile: () => void;
  games: Game[];
  uniquePlatforms: string[];
  folders: string[];
}

export default function ProfilesTab({
  currentProfile,
  profiles,
  handleSwitchProfile,
  requestDeleteProfile,
  handleRenameProfile,
  newProfileName,
  setNewProfileName,
  handleCreateProfile,
  games,
  uniquePlatforms,
  folders,
}: ProfilesTabProps) {
  const { t } = useTranslation();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const startRenaming = () => {
    setRenameValue(currentProfile);
    setIsRenaming(true);
  };

  const confirmRename = () => {
    if (renameValue.trim() && renameValue.trim() !== currentProfile) {
      handleRenameProfile?.(currentProfile, renameValue.trim());
    }
    setIsRenaming(false);
  };

  return (
    <div className="settings-tab-panel">
      <div className="settings-panel-header">
        <h2>{t("settings.profiles.panelTitle")}</h2>
        <p>{t("settings.profiles.panelDesc")}</p>
      </div>

      {/* Perfil Actual y Switch */}
      <section className="settings-card" id="settings-profiles">
        <h3>{t("settings.profiles.activeProfile")}</h3>
        {isRenaming ? (
          <div className="settings-profile-row" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="text"
              className="settings-input"
              style={{ flex: 1 }}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmRename();
                if (e.key === "Escape") setIsRenaming(false);
              }}
              autoFocus
            />
            <button
              type="button"
              className="settings-btn-add"
              onClick={confirmRename}
            >
              {t("settings.profiles.saveName", "Guardar")}
            </button>
            <button
              type="button"
              className="settings-btn-delete"
              onClick={() => setIsRenaming(false)}
            >
              {t("settings.profiles.cancel", "Cancelar")}
            </button>
          </div>
        ) : (
          <div className="settings-profile-row">
            <select
              className="settings-profile-select"
              value={currentProfile}
              onChange={(e) => handleSwitchProfile(e.target.value)}
            >
              {profiles.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {handleRenameProfile && (
              <button
                type="button"
                className="settings-btn-secondary"
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
                onClick={startRenaming}
                title={t("settings.profiles.renameProfile", "Renombrar Perfil")}
              >
                âœï¸ âœï¸ {t("settings.profiles.renameProfile", "Renombrar")}
              </button>
            )}
            {profiles.length > 1 && (
              <button
                type="button"
                className="settings-btn-delete"
                onClick={() => requestDeleteProfile(currentProfile)}
                title={t("settings.profiles.deleteProfileTitle")}
              >
                {t("settings.profiles.deleteProfile")}
              </button>
            )}
          </div>
        )}

        <div className="settings-divider" />

        <h3>{t("settings.profiles.createProfile")}</h3>
        <div className="settings-input-row" style={{ marginTop: "12px" }}>
          <input
            type="text"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateProfile();
            }}
            placeholder={t("settings.profiles.newProfilePh")}
            className="settings-input"
          />
          <button type="button" onClick={handleCreateProfile} className="settings-btn-add">
            {t("settings.profiles.createBtn")}
          </button>
        </div>
      </section>

      {/* EstadÃ­sticas del Perfil */}
      <section className="settings-card" id="settings-stats">
        <h3>{t("settings.profiles.statsTitle")}</h3>
        <div className="settings-stats-grid">
          <div className="settings-stat-item">
            <span className="settings-stat-val">{games.length}</span>
            <span className="settings-stat-label">{t("settings.profiles.statGames")}</span>
          </div>
          <div className="settings-stat-item">
            <span className="settings-stat-val">
              {games.filter((g) => g.favorite).length}
            </span>
            <span className="settings-stat-label">{t("settings.profiles.statFavs")}</span>
          </div>
          <div className="settings-stat-item">
            <span className="settings-stat-val">{uniquePlatforms.length}</span>
            <span className="settings-stat-label">{t("settings.profiles.statConsoles")}</span>
          </div>
          <div className="settings-stat-item">
            <span className="settings-stat-val">{folders.length}</span>
            <span className="settings-stat-label">{t("settings.profiles.statDirs")}</span>
          </div>
        </div>
      </section>
    </div>
  );
}

