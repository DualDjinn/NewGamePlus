import type { TFunction } from "i18next";

/**
 * Normalizes raw genre names to a single canonical key so that variants
 * like "RPG", "Role-Playing", and "Rol" are merged into the same category.
 */
export function normalizeGenre(genre: string | undefined | null): string {
  if (!genre || !genre.trim()) return "";
  const trimmed = genre.trim();
  const lower = trimmed.toLowerCase();

  if (
    lower === "rpg" ||
    lower === "role-playing" ||
    lower === "role playing" ||
    lower === "role-playing game" ||
    lower === "jrpg" ||
    lower === "action rpg" ||
    lower === "rol"
  ) {
    return "Role-Playing";
  }
  if (lower === "platform" || lower === "platformer" || lower === "plataformas") {
    return "Platform";
  }
  if (lower === "shoot 'em up" || lower === "shmup") {
    return "Shooter";
  }
  return trimmed;
}

/**
 * Normalizes and localizes genre names dynamically based on the active translation function.
 * If no translation is registered for the genre name, it returns the original genre name cleanly trimmed.
 */
export function getLocalizedGenreName(genre: string | undefined | null, t: TFunction): string {
  if (!genre || !genre.trim()) return "";
  const canonical = normalizeGenre(genre);

  // Try direct lookup in genres.names.<canonical>
  const key = `genres.names.${canonical}`;
  const translated = t(key, { defaultValue: "" });
  if (translated && translated !== key) {
    return translated;
  }

  // Fallback map for common case variations (e.g. "action" -> "Action")
  const capitalized = canonical.charAt(0).toUpperCase() + canonical.slice(1).toLowerCase();
  const capKey = `genres.names.${capitalized}`;
  const capTranslated = t(capKey, { defaultValue: "" });
  if (capTranslated && capTranslated !== capKey) {
    return capTranslated;
  }

  return canonical;
}
