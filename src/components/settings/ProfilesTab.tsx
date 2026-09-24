import type { Game } from "../../types";

export interface ProfilesTabProps {
  currentProfile: string;
  profiles: string[];
  handleSwitchProfile: (name: string) => void;
  requestDeleteProfile: (name: string) => void;
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
  newProfileName,
  setNewProfileName,
  handleCreateProfile,
  games,
  uniquePlatforms,
  folders,
}: ProfilesTabProps) {
  return (
    <div className="settings-tab-panel">
      <div className="settings-panel-header">
        <h2>Perfiles &amp; Usuarios</h2>
        <p>Administra perfiles independientes con sus propios favoritos e historial.</p>
      </div>

      {/* Perfil Actual y Switch */}
      <section className="settings-card" id="settings-profiles">
        <h3>Perfil Activo</h3>
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
          {profiles.length > 1 && (
            <button
              type="button"
              className="settings-btn-delete"
              onClick={() => requestDeleteProfile(currentProfile)}
              title="Eliminar perfil actual"
            >
              Eliminar Perfil
            </button>
          )}
        </div>

        <div className="settings-divider" />

        <h3>Crear Nuevo Perfil</h3>
        <div className="settings-input-row" style={{ marginTop: "12px" }}>
          <input
            type="text"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateProfile();
            }}
            placeholder="Nombre del nuevo perfil..."
            className="settings-input"
          />
          <button type="button" onClick={handleCreateProfile} className="settings-btn-add">
            + Crear Perfil
          </button>
        </div>
      </section>

      {/* Estadísticas del Perfil */}
      <section className="settings-card" id="settings-stats">
        <h3>Estadísticas de este Perfil</h3>
        <div className="settings-stats-grid">
          <div className="settings-stat-item">
            <span className="settings-stat-val">{games.length}</span>
            <span className="settings-stat-label">Juegos en Biblioteca</span>
          </div>
          <div className="settings-stat-item">
            <span className="settings-stat-val">
              {games.filter((g) => g.favorite).length}
            </span>
            <span className="settings-stat-label">Juegos Favoritos</span>
          </div>
          <div className="settings-stat-item">
            <span className="settings-stat-val">{uniquePlatforms.length}</span>
            <span className="settings-stat-label">Consolas Disponibles</span>
          </div>
          <div className="settings-stat-item">
            <span className="settings-stat-val">{folders.length}</span>
            <span className="settings-stat-label">Directorios de ROMs</span>
          </div>
        </div>
      </section>
    </div>
  );
}
