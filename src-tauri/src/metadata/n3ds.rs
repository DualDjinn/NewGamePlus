use super::libretro::GameMetadata;

pub struct N3dsMetaEntry {
    pub keys: &'static [&'static str],
    pub display_name: &'static str,
    pub genre: &'static str,
    pub developer: &'static str,
    pub publisher: &'static str,
    pub release_year: i32,
    pub franchise: Option<&'static str>,
}

pub static N3DS_CATALOG: &[N3dsMetaEntry] = &[
    // Fire Emblem
    N3dsMetaEntry {
        keys: &[
            "fire emblem - awakening",
            "fire emblem awakening",
            "ctr-p-afe",
            "afe",
        ],
        display_name: "Fire Emblem - Awakening",
        genre: "Rol / RPG",
        developer: "Intelligent Systems",
        publisher: "Nintendo",
        release_year: 2012,
        franchise: Some("Fire Emblem"),
    },
    N3dsMetaEntry {
        keys: &[
            "fire emblem fates",
            "fire emblem fates - special edition",
            "fire emblem fates - birthright",
            "fire emblem fates - conquest",
            "ctr-p-bfx",
            "bfx",
        ],
        display_name: "Fire Emblem Fates - Special Edition",
        genre: "Rol / RPG",
        developer: "Intelligent Systems",
        publisher: "Nintendo",
        release_year: 2015,
        franchise: Some("Fire Emblem"),
    },
    N3dsMetaEntry {
        keys: &[
            "fire emblem echoes - shadows of valentia",
            "fire emblem echoes",
            "shadows of valentia",
            "ctr-p-ajj",
            "ajj",
        ],
        display_name: "Fire Emblem Echoes - Shadows of Valentia",
        genre: "Rol / RPG",
        developer: "Intelligent Systems",
        publisher: "Nintendo",
        release_year: 2017,
        franchise: Some("Fire Emblem"),
    },
    // Pokémon
    N3dsMetaEntry {
        keys: &[
            "pokemon alpha sapphire",
            "alpha sapphire",
            "pokemon - alpha sapphire",
            "ctr-p-ecl",
            "ecl",
        ],
        display_name: "Pokemon Alpha Sapphire",
        genre: "Rol / RPG",
        developer: "Game Freak",
        publisher: "The Pokémon Company / Nintendo",
        release_year: 2014,
        franchise: Some("Pokemon"),
    },
    N3dsMetaEntry {
        keys: &[
            "pokemon omega ruby",
            "omega ruby",
            "pokemon - omega ruby",
            "pokemon rutile ruby",
            "ctr-p-ecr",
            "ecr",
        ],
        display_name: "Pokemon Omega Ruby",
        genre: "Rol / RPG",
        developer: "Game Freak",
        publisher: "The Pokémon Company / Nintendo",
        release_year: 2014,
        franchise: Some("Pokemon"),
    },
    N3dsMetaEntry {
        keys: &["pokemon x", "pokemon - x", "ctr-p-ekj", "ekj"],
        display_name: "Pokemon X",
        genre: "Rol / RPG",
        developer: "Game Freak",
        publisher: "The Pokémon Company / Nintendo",
        release_year: 2013,
        franchise: Some("Pokemon"),
    },
    N3dsMetaEntry {
        keys: &["pokemon y", "pokemon - y", "ctr-p-ek2", "ek2"],
        display_name: "Pokemon Y",
        genre: "Rol / RPG",
        developer: "Game Freak",
        publisher: "The Pokémon Company / Nintendo",
        release_year: 2013,
        franchise: Some("Pokemon"),
    },
    N3dsMetaEntry {
        keys: &[
            "pokemon ultra sun",
            "ultra sun",
            "pokemon - ultra sun",
            "ctr-p-a2a",
            "a2a",
        ],
        display_name: "Pokemon Ultra Sun",
        genre: "Rol / RPG",
        developer: "Game Freak",
        publisher: "The Pokémon Company / Nintendo",
        release_year: 2017,
        franchise: Some("Pokemon"),
    },
    N3dsMetaEntry {
        keys: &[
            "pokemon ultra moon",
            "ultra moon",
            "pokemon - ultra moon",
            "ctr-p-a2b",
            "a2b",
        ],
        display_name: "Pokemon Ultra Moon",
        genre: "Rol / RPG",
        developer: "Game Freak",
        publisher: "The Pokémon Company / Nintendo",
        release_year: 2017,
        franchise: Some("Pokemon"),
    },
    N3dsMetaEntry {
        keys: &["pokemon sun", "pokemon - sun", "ctr-p-bnd", "bnd"],
        display_name: "Pokemon Sun",
        genre: "Rol / RPG",
        developer: "Game Freak",
        publisher: "The Pokémon Company / Nintendo",
        release_year: 2016,
        franchise: Some("Pokemon"),
    },
    N3dsMetaEntry {
        keys: &["pokemon moon", "pokemon - moon", "ctr-p-bne", "bne"],
        display_name: "Pokemon Moon",
        genre: "Rol / RPG",
        developer: "Game Freak",
        publisher: "The Pokémon Company / Nintendo",
        release_year: 2016,
        franchise: Some("Pokemon"),
    },
    N3dsMetaEntry {
        keys: &[
            "pokemon super mystery dungeon",
            "super mystery dungeon",
            "ctr-p-bpj",
            "bpj",
        ],
        display_name: "Pokemon Super Mystery Dungeon",
        genre: "Rol / RPG",
        developer: "Spike Chunsoft",
        publisher: "The Pokémon Company / Nintendo",
        release_year: 2015,
        franchise: Some("Pokemon"),
    },
    N3dsMetaEntry {
        keys: &[
            "pokemon mystery dungeon - gates to infinity",
            "gates to infinity",
            "ctr-p-apd",
            "apd",
        ],
        display_name: "Pokemon Mystery Dungeon - Gates to Infinity",
        genre: "Rol / RPG",
        developer: "Spike Chunsoft",
        publisher: "The Pokémon Company / Nintendo",
        release_year: 2012,
        franchise: Some("Pokemon"),
    },
    // Kirby
    N3dsMetaEntry {
        keys: &[
            "kirby - triple deluxe",
            "kirby triple deluxe",
            "triple deluxe",
            "ctr-p-bal",
            "bal",
        ],
        display_name: "Kirby - Triple Deluxe",
        genre: "Plataformas",
        developer: "HAL Laboratory",
        publisher: "Nintendo",
        release_year: 2014,
        franchise: Some("Kirby"),
    },
    N3dsMetaEntry {
        keys: &[
            "kirby - planet robobot",
            "kirby planet robobot",
            "planet robobot",
            "ctr-p-at3",
            "at3",
        ],
        display_name: "Kirby - Planet Robobot",
        genre: "Plataformas",
        developer: "HAL Laboratory",
        publisher: "Nintendo",
        release_year: 2016,
        franchise: Some("Kirby"),
    },
    // Zelda
    N3dsMetaEntry {
        keys: &[
            "legend of zelda, the - a link between worlds",
            "legend of zelda - a link between worlds",
            "a link between worlds",
            "link between worlds",
            "ctr-p-bzl",
            "bzl",
        ],
        display_name: "The Legend of Zelda - A Link Between Worlds",
        genre: "Aventura",
        developer: "Nintendo EAD",
        publisher: "Nintendo",
        release_year: 2013,
        franchise: Some("The Legend of Zelda"),
    },
    N3dsMetaEntry {
        keys: &[
            "legend of zelda, the - ocarina of time 3d",
            "legend of zelda - ocarina of time 3d",
            "ocarina of time 3d",
            "ctr-p-aqe",
            "aqe",
        ],
        display_name: "The Legend of Zelda - Ocarina of Time 3D",
        genre: "Aventura",
        developer: "Grezzo / Nintendo",
        publisher: "Nintendo",
        release_year: 2011,
        franchise: Some("The Legend of Zelda"),
    },
    N3dsMetaEntry {
        keys: &[
            "legend of zelda, the - majora's mask 3d",
            "legend of zelda - majora's mask 3d",
            "majora's mask 3d",
            "ctr-p-ajr",
            "ajr",
        ],
        display_name: "The Legend of Zelda - Majora's Mask 3D",
        genre: "Aventura",
        developer: "Grezzo / Nintendo",
        publisher: "Nintendo",
        release_year: 2015,
        franchise: Some("The Legend of Zelda"),
    },
    // Dragon Quest
    N3dsMetaEntry {
        keys: &[
            "dragon quest viii - journey of the cursed king",
            "dragon quest viii",
            "journey of the cursed king",
            "ctr-p-bq8",
            "bq8",
        ],
        display_name: "Dragon Quest VIII - Journey of the Cursed King",
        genre: "Rol / RPG",
        developer: "Square Enix / Level-5",
        publisher: "Nintendo",
        release_year: 2015,
        franchise: Some("Dragon Quest"),
    },
    N3dsMetaEntry {
        keys: &[
            "dragon quest vii - fragments of the forgotten past",
            "dragon quest vii",
            "fragments of the forgotten past",
            "ctr-p-ad7",
            "ad7",
        ],
        display_name: "Dragon Quest VII - Fragments of the Forgotten Past",
        genre: "Rol / RPG",
        developer: "ArtePiazza",
        publisher: "Nintendo",
        release_year: 2013,
        franchise: Some("Dragon Quest"),
    },
    N3dsMetaEntry {
        keys: &[
            "dragon quest monsters 2 - cobi and tara's marvelous mysterious key",
            "dragon quest monsters 2",
            "cobi and tara",
            "ctr-p-bdq",
            "bdq",
        ],
        display_name: "Dragon Quest Monsters 2 - Cobi and Tara's Marvelous Mysterious Key",
        genre: "Rol / RPG",
        developer: "Square Enix / TOSE",
        publisher: "Square Enix",
        release_year: 2014,
        franchise: Some("Dragon Quest"),
    },
    N3dsMetaEntry {
        keys: &[
            "dragon quest monsters joker 3",
            "dragon quest monsters joker 3 professional",
            "joker 3",
            "ctr-p-bd3",
            "bd3",
        ],
        display_name: "Dragon Quest Monsters - Joker 3 Professional",
        genre: "Rol / RPG",
        developer: "Square Enix",
        publisher: "Square Enix",
        release_year: 2016,
        franchise: Some("Dragon Quest"),
    },
    // Radiant Historia, Project X Zone, Legend of Legacy, Puzzle & Dragons
    N3dsMetaEntry {
        keys: &[
            "radiant historia - perfect chronology",
            "radiant historia",
            "perfect chronology",
            "ctr-p-brh",
            "brh",
        ],
        display_name: "Radiant Historia - Perfect Chronology",
        genre: "Rol / RPG",
        developer: "Atlus",
        publisher: "Atlus / Deep Silver",
        release_year: 2017,
        franchise: Some("Radiant Historia"),
    },
    N3dsMetaEntry {
        keys: &[
            "legend of legacy, the",
            "legend of legacy",
            "the legend of legacy",
            "ctr-p-blg",
            "blg",
        ],
        display_name: "The Legend of Legacy",
        genre: "Rol / RPG",
        developer: "FuRyu / Cattle Call",
        publisher: "Atlus / NIS America",
        release_year: 2015,
        franchise: None,
    },
    N3dsMetaEntry {
        keys: &[
            "project x zone 2",
            "project x zone 2 - brave new world",
            "ctr-p-bxz",
            "bxz",
        ],
        display_name: "Project X Zone 2",
        genre: "Estrategia",
        developer: "Monolith Soft",
        publisher: "Bandai Namco Entertainment",
        release_year: 2015,
        franchise: Some("Project X Zone"),
    },
    N3dsMetaEntry {
        keys: &["project x zone", "ctr-p-apx", "apx"],
        display_name: "Project X Zone",
        genre: "Estrategia",
        developer: "Banpresto / Monolith Soft",
        publisher: "Bandai Namco Games",
        release_year: 2012,
        franchise: Some("Project X Zone"),
    },
    N3dsMetaEntry {
        keys: &[
            "puzzle & dragons z",
            "puzzle & dragons z + puzzle & dragons super mario bros. edition",
            "puzzle and dragons z",
            "ctr-p-azh",
            "azh",
        ],
        display_name: "Puzzle & Dragons Z + Super Mario Bros. Edition",
        genre: "Puzzle",
        developer: "GungHo Online Entertainment",
        publisher: "Nintendo",
        release_year: 2015,
        franchise: Some("Puzzle & Dragons"),
    },
    // Mario / Luigi / Smash
    N3dsMetaEntry {
        keys: &["super mario 3d land", "mario 3d land", "ctr-p-are", "are"],
        display_name: "Super Mario 3D Land",
        genre: "Plataformas",
        developer: "Nintendo EAD",
        publisher: "Nintendo",
        release_year: 2011,
        franchise: Some("Mario"),
    },
    N3dsMetaEntry {
        keys: &["mario kart 7", "ctr-p-amk", "amk"],
        display_name: "Mario Kart 7",
        genre: "Carreras",
        developer: "Nintendo EAD / Retro Studios",
        publisher: "Nintendo",
        release_year: 2011,
        franchise: Some("Mario Kart"),
    },
    N3dsMetaEntry {
        keys: &[
            "super smash bros. for nintendo 3ds",
            "super smash bros.",
            "smash bros 3ds",
            "ctr-p-axc",
            "axc",
        ],
        display_name: "Super Smash Bros. for Nintendo 3DS",
        genre: "Lucha",
        developer: "Bandai Namco Studios / Sora Ltd.",
        publisher: "Nintendo",
        release_year: 2014,
        franchise: Some("Super Smash Bros."),
    },
    N3dsMetaEntry {
        keys: &[
            "luigi's mansion - dark moon",
            "luigi's mansion 2",
            "dark moon",
            "ctr-p-agg",
            "agg",
        ],
        display_name: "Luigi's Mansion - Dark Moon",
        genre: "Aventura",
        developer: "Next Level Games",
        publisher: "Nintendo",
        release_year: 2013,
        franchise: Some("Luigi's Mansion"),
    },
    N3dsMetaEntry {
        keys: &[
            "new super mario bros. 2",
            "new super mario bros 2",
            "ctr-p-abe",
            "abe",
        ],
        display_name: "New Super Mario Bros. 2",
        genre: "Plataformas",
        developer: "Nintendo EAD",
        publisher: "Nintendo",
        release_year: 2012,
        franchise: Some("Mario"),
    },
    N3dsMetaEntry {
        keys: &[
            "bravely default",
            "bravely default - flying fairy",
            "ctr-p-bfe",
            "bfe",
        ],
        display_name: "Bravely Default",
        genre: "Rol / RPG",
        developer: "Silicon Studio / Square Enix",
        publisher: "Nintendo / Square Enix",
        release_year: 2012,
        franchise: Some("Bravely"),
    },
    N3dsMetaEntry {
        keys: &[
            "bravely second - end layer",
            "bravely second",
            "end layer",
            "ctr-p-bse",
            "bse",
        ],
        display_name: "Bravely Second - End Layer",
        genre: "Rol / RPG",
        developer: "Silicon Studio / Square Enix",
        publisher: "Nintendo / Square Enix",
        release_year: 2015,
        franchise: Some("Bravely"),
    },
    N3dsMetaEntry {
        keys: &[
            "monster hunter 4 ultimate",
            "monster hunter 4",
            "mh4u",
            "ctr-p-bfg",
            "bfg",
        ],
        display_name: "Monster Hunter 4 Ultimate",
        genre: "Acción",
        developer: "Capcom",
        publisher: "Capcom",
        release_year: 2014,
        franchise: Some("Monster Hunter"),
    },
    N3dsMetaEntry {
        keys: &[
            "monster hunter generations",
            "monster hunter x",
            "mhgen",
            "ctr-p-bxx",
            "bxx",
        ],
        display_name: "Monster Hunter Generations",
        genre: "Acción",
        developer: "Capcom",
        publisher: "Capcom",
        release_year: 2015,
        franchise: Some("Monster Hunter"),
    },
    N3dsMetaEntry {
        keys: &[
            "metroid - samus returns",
            "samus returns",
            "metroid samus returns",
            "ctr-p-a9a",
            "a9a",
        ],
        display_name: "Metroid - Samus Returns",
        genre: "Acción",
        developer: "MercurySteam / Nintendo EPD",
        publisher: "Nintendo",
        release_year: 2017,
        franchise: Some("Metroid"),
    },
    N3dsMetaEntry {
        keys: &[
            "xenoblade chronicles 3d",
            "xenoblade 3d",
            "ctr-p-caj",
            "caj",
        ],
        display_name: "Xenoblade Chronicles 3D",
        genre: "Rol / RPG",
        developer: "Monster Games / Monolith Soft",
        publisher: "Nintendo",
        release_year: 2015,
        franchise: Some("Xenoblade"),
    },
    N3dsMetaEntry {
        keys: &[
            "animal crossing - new leaf",
            "animal crossing new leaf",
            "new leaf",
            "ctr-p-egd",
            "egd",
        ],
        display_name: "Animal Crossing - New Leaf",
        genre: "Simulación",
        developer: "Nintendo EAD",
        publisher: "Nintendo",
        release_year: 2012,
        franchise: Some("Animal Crossing"),
    },
];

pub fn find_n3ds_catalog_metadata(query: &str, serial: Option<&str>) -> Option<GameMetadata> {
    let q_lower = query.to_lowercase();
    let q_clean = q_lower
        .split(" (")
        .next()
        .unwrap_or(&q_lower)
        .split(" [")
        .next()
        .unwrap_or(&q_lower)
        .trim();

    let s_lower = serial.map(|s| s.to_lowercase());

    for entry in N3DS_CATALOG {
        // 1. Chequeo por serial
        if let Some(ref ser) = s_lower {
            for key in entry.keys {
                if ser.contains(key) {
                    return Some(entry.to_metadata());
                }
            }
        }

        // 2. Chequeo por título
        for key in entry.keys {
            if q_clean == *key || q_clean.starts_with(key) || key.starts_with(q_clean) {
                return Some(entry.to_metadata());
            }
        }
    }

    None
}

impl N3dsMetaEntry {
    pub fn to_metadata(&self) -> GameMetadata {
        GameMetadata {
            display_name: Some(self.display_name.to_string()),
            release_year: Some(self.release_year),
            release_month: None,
            developer: Some(self.developer.to_string()),
            publisher: Some(self.publisher.to_string()),
            genre: Some(self.genre.to_string()),
            franchise: self.franchise.map(|f| f.to_string()),
            region: Some("Región Libre".to_string()),
            rating: None,
        }
    }
}
