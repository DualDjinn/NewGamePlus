import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { renameProfile, createProfile, switchProfile } from "../lib/tauri";
import "./CreateUserModal.css";

interface CreateUserModalProps {
  isOpen: boolean;
  currentProfile: string;
  existingProfiles: string[];
  onComplete: (name: string) => void;
}

export default function CreateUserModal({
  isOpen,
  currentProfile,
  existingProfiles,
  onComplete,
}: CreateUserModalProps) {
  const { t } = useTranslation();
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen);
  const inputRef = useRef<HTMLInputElement>(null);

  const defaultSuggestedName = "Perfil 1";
  const [profileName, setProfileName] = useState(defaultSuggestedName);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Pre-fill with Perfil 1 and auto-select text so typing immediately replaces it
      setProfileName(defaultSuggestedName);
      setError(null);
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const trimmed = profileName.trim();
  const avatarLetter = (trimmed.charAt(0) || "P").toUpperCase();

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (submitting) return;

    const finalName = profileName.trim();
    if (!finalName) {
      setError(t("createUser.errorEmpty", "El nombre del perfil no puede estar vacío"));
      inputRef.current?.focus();
      return;
    }

    // Check if conflicting with an existing profile different from current
    const nameExists = existingProfiles.some(
      (p) => p.toLowerCase() === finalName.toLowerCase() && p !== currentProfile
    );
    if (nameExists) {
      setError(t("createUser.errorExists", "Ya existe un perfil con ese nombre"));
      inputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (existingProfiles.includes(currentProfile)) {
        if (currentProfile !== finalName) {
          await renameProfile(currentProfile, finalName);
        }
      } else {
        await createProfile(finalName);
        await switchProfile(finalName);
      }
      localStorage.setItem("newgameplus_user_profile_configured", "true");
      onComplete(finalName);
    } catch (err: unknown) {
      console.error("Failed to set up user profile:", err);
      // Fallback: try creating if rename wasn't available
      try {
        await createProfile(finalName);
        await switchProfile(finalName);
        localStorage.setItem("newgameplus_user_profile_configured", "true");
        onComplete(finalName);
      } catch (fallbackErr) {
        console.error("Fallback create profile failed:", fallbackErr);
        setError(String(err || "Error al configurar el perfil"));
        setSubmitting(false);
      }
    }
  }

  return (
    <div
      className="create-user-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-user-title"
    >
      <div className="create-user-card" ref={trapRef}>
        <div className="create-user-avatar-wrap">
          <div className="create-user-avatar-glow" />
          <div className="create-user-avatar">{avatarLetter}</div>
        </div>

        <span className="create-user-badge">
          {t("createUser.badge", "Nuevo Jugador")}
        </span>

        <h2 id="create-user-title" className="create-user-title">
          {t("createUser.title", "Crear un Usuario")}
        </h2>

        <p className="create-user-subtitle">
          {t(
            "createUser.subtitle",
            "¡Te damos la bienvenida a NewGame+! Elige un nombre para tu perfil de jugador para comenzar:"
          )}
        </p>

        <form className="create-user-form" onSubmit={handleSubmit}>
          <div className="create-user-input-wrap">
            <label className="create-user-label" htmlFor="user-profile-name">
              {t("createUser.label", "Nombre del perfil")}
            </label>
            <input
              id="user-profile-name"
              ref={inputRef}
              type="text"
              maxLength={24}
              className="create-user-input"
              value={profileName}
              onChange={(e) => {
                setProfileName(e.target.value);
                if (error) setError(null);
              }}
              placeholder={t("createUser.placeholder", "Ej: Jugador 1, Stefano...")}
              disabled={submitting}
              autoComplete="off"
              spellCheck="false"
            />
            {error && <div className="create-user-error">⚠️ {error}</div>}
            <p className="create-user-hint">
              {t(
                "createUser.hint",
                "Este perfil guardará de forma independiente tus partidas, estados de guardado, favoritos y estadísticas de juego."
              )}
            </p>
          </div>

          <button
            type="submit"
            className="create-user-btn"
            disabled={submitting || !profileName.trim()}
          >
            {submitting ? "..." : t("createUser.btn", "Comenzar")} →
          </button>
        </form>
      </div>
    </div>
  );
}
