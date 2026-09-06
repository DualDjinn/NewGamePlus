import type { Game } from "../types";
import { getPlatformCompany, getPlatformDisplayName } from "./platforms";

const POPULAR_FRANCHISES: { name: string; patterns: (string | RegExp)[] }[] = [
  { name: "Super Mario", patterns: [/\bmario\b/i, /\bluigi\b/i, /\byoshi\b/i, /\bwario\b/i, /\bkart\b/i] },
  { name: "The Legend of Zelda", patterns: [/\bzelda\b/i, /\blink\b/i, /\btriforce\b/i] },
  { name: "Pokémon", patterns: [/\bpokemon\b/i, /\bpokémon\b/i, /\bpikachu\b/i] },
  { name: "Metroid", patterns: [/\bmetroid\b/i, /\bsamus\b/i] },
  { name: "Donkey Kong", patterns: [/\bdonkey kong\b/i, /\bdk country\b/i, /\bdiddy kong\b/i] },
  { name: "Mega Man", patterns: [/\bmega man\b/i, /\bmegaman\b/i, /\brockman\b/i] },
  { name: "Castlevania", patterns: [/\bcastlevania\b/i, /\bakumajou\b/i] },
  { name: "Final Fantasy", patterns: [/\bfinal fantasy\b/i] },
  { name: "Sonic the Hedgehog", patterns: [/\bsonic\b/i, /\btails\b/i, /\bknuckles\b/i] },
  { name: "Resident Evil", patterns: [/\bresident evil\b/i, /\bbiohazard\b/i] },
  { name: "Street Fighter", patterns: [/\bstreet fighter\b/i] },
  { name: "Mortal Kombat", patterns: [/\bmortal kombat\b/i] },
  { name: "Tekken", patterns: [/\btekken\b/i] },
  { name: "Crash Bandicoot", patterns: [/\bcrash bandicoot\b/i, /\bcrash team\b/i] },
  { name: "Spyro", patterns: [/\bspyro\b/i] },
  { name: "Kirby", patterns: [/\bkirby\b/i] },
  { name: "Dragon Quest", patterns: [/\bdragon quest\b/i, /\bdragon warrior\b/i] },
  { name: "Silent Hill", patterns: [/\bsilent hill\b/i] },
  { name: "Metal Gear", patterns: [/\bmetal gear\b/i] },
  { name: "Tomb Raider", patterns: [/\btomb raider\b/i] },
  { name: "Rayman", patterns: [/\brayman\b/i] },
  { name: "Grand Theft Auto", patterns: [/\bgrand theft auto\b/i, /\bgta\b/i] },
  { name: "God of War", patterns: [/\bgod of war\b/i] },
  { name: "Kingdom Hearts", patterns: [/\bkingdom hearts\b/i] },
  { name: "Gran Turismo", patterns: [/\bgran turismo\b/i] },
  { name: "Need for Speed", patterns: [/\bneed for speed\b/i] },
  { name: "Star Wars", patterns: [/\bstar wars\b/i] },
  { name: "Tony Hawk", patterns: [/\btony hawk\b/i] },
];

function cleanTitle(name: string): string {
  return name.replace(/\s*\([^)]*\)/g, "").replace(/\s*\[[^\]]*\]/g, "").trim();
}

export function detectFranchiseName(game: Game): string | null {
  const title = (game.display_name || game.name).toLowerCase();
  for (const f of POPULAR_FRANCHISES) {
    for (const p of f.patterns) {
      if (typeof p === "string") {
        if (title.includes(p.toLowerCase())) return f.name;
      } else if (p.test(title)) {
        return f.name;
      }
    }
  }

  const cleaned = cleanTitle(game.display_name || game.name);
  if (cleaned.includes(":")) {
    const prefix = cleaned.split(":")[0].trim();
    if (prefix.length >= 3) return prefix;
  }
  if (cleaned.includes(" - ")) {
    const prefix = cleaned.split(" - ")[0].trim();
    if (prefix.length >= 3) return prefix;
  }

  const words = cleaned.split(/\s+/);
  if (words.length >= 3 && words[0].length >= 3) {
    return words.slice(0, 2).join(" ");
  }

  return null;
}

function sampleRandom(list: Game[], limit: number): Game[] {
  if (list.length <= limit) return list;
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, limit);
}

export function getFranchiseGames(
  targetGame: Game,
  allGames: Game[],
  limit = 3
): { label: string; title: string; games: Game[] } | null {
  // 1. Misma saga (ej: Mario, Zelda, Final Fantasy, Resident Evil)
  const franchise = detectFranchiseName(targetGame);
  if (franchise) {
    const fLower = franchise.toLowerCase();
    const matched = allGames.filter((g) => {
      if (g.id === targetGame.id) return false;
      const t = (g.display_name || g.name).toLowerCase();
      for (const f of POPULAR_FRANCHISES) {
        if (f.name.toLowerCase() === fLower) {
          return f.patterns.some((p) => (typeof p === "string" ? t.includes(p.toLowerCase()) : p.test(t)));
        }
      }
      return t.includes(fLower);
    });

    if (matched.length > 0) {
      return {
        label: "Más de la saga",
        title: franchise,
        games: sampleRandom(matched, limit),
      };
    }
  }

  // 2. Mismo género (ej: Action, RPG, Fighting, Platformer)
  if (targetGame.genre && targetGame.genre.trim()) {
    const genreLower = targetGame.genre.trim().toLowerCase();
    const genreMatches = allGames.filter(
      (g) => g.id !== targetGame.id && g.genre?.trim().toLowerCase() === genreLower
    );

    if (genreMatches.length > 0) {
      return {
        label: "Del mismo género",
        title: targetGame.genre.trim(),
        games: sampleRandom(genreMatches, limit),
      };
    }
  }

  // 3. Misma desarrolladora (ej: Capcom, Squaresoft, Konami, Nintendo)
  if (targetGame.developer && targetGame.developer.trim()) {
    const devLower = targetGame.developer.trim().toLowerCase();
    const devMatches = allGames.filter(
      (g) => g.id !== targetGame.id && g.developer && g.developer.trim().toLowerCase() === devLower
    );

    if (devMatches.length > 0) {
      return {
        label: "De la desarrolladora",
        title: targetGame.developer.trim(),
        games: sampleRandom(devMatches, limit),
      };
    }
  }

  // 4. Misma compañía / Publisher (ej: Sega, Electronic Arts, Bandai Namco)
  if (targetGame.publisher && targetGame.publisher.trim()) {
    const pubLower = targetGame.publisher.trim().toLowerCase();
    const pubMatches = allGames.filter(
      (g) => g.id !== targetGame.id && g.publisher && g.publisher.trim().toLowerCase() === pubLower
    );

    if (pubMatches.length > 0) {
      return {
        label: "De la misma compañía",
        title: targetGame.publisher.trim(),
        games: sampleRandom(pubMatches, limit),
      };
    }
  }

  // 5. Mismo año de salida (ej: 1998, 2001)
  if (targetGame.release_year) {
    const yearMatches = allGames.filter(
      (g) => g.id !== targetGame.id && g.release_year === targetGame.release_year
    );

    if (yearMatches.length > 0) {
      return {
        label: "Lanzados en el mismo año",
        title: `${targetGame.release_year}`,
        games: sampleRandom(yearMatches, limit),
      };
    }
  }

  // 6. Misma familia de consola / compañía de plataforma (Nintendo, PlayStation, Sega, etc.)
  const company = getPlatformCompany(targetGame.platform);
  if (company && company !== "Otros") {
    const companyMatches = allGames.filter(
      (g) => g.id !== targetGame.id && getPlatformCompany(g.platform) === company
    );

    if (companyMatches.length > 0) {
      return {
        label: "Más títulos de",
        title: company,
        games: sampleRandom(companyMatches, limit),
      };
    }
  }

  // 7. Misma plataforma / consola
  const platformMatches = allGames.filter(
    (g) => g.id !== targetGame.id && g.platform.toUpperCase() === targetGame.platform.toUpperCase()
  );

  if (platformMatches.length > 0) {
    return {
      label: "Más juegos de",
      title: getPlatformDisplayName(targetGame.platform),
      games: sampleRandom(platformMatches, limit),
    };
  }

  // 8. Recomendados generales de la colección (garantiza 100% de consistencia visual)
  const fallbackMatches = allGames.filter((g) => g.id !== targetGame.id);
  if (fallbackMatches.length > 0) {
    return {
      label: "Recomendados para ti",
      title: "De tu colección",
      games: sampleRandom(fallbackMatches, limit),
    };
  }

  return null;
}
