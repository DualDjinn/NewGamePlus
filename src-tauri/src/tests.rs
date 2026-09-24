#[cfg(test)]
#[allow(clippy::module_inception)]
mod tests {
    use crate::emulator::standalone::get_rpcs3_exe;
    use crate::metadata::ensure_thumbnail as ensure_thumbnail_orchestrator;
    use crate::metadata::libretro::*;
    use crate::platforms;
    use crate::state::storage::get_thumbnails_dir;
    use rusqlite::Connection;
    use std::path::Path;

    fn ensure_thumbnail_test(
        platform: &str,
        game_name: &str,
        db_name: Option<&str>,
        meta_conn: Option<&Connection>,
        force_refresh: bool,
    ) -> Option<String> {
        ensure_thumbnail_orchestrator(
            platform,
            game_name,
            db_name,
            meta_conn,
            None,
            &get_thumbnails_dir(),
            force_refresh,
        )
    }

    #[test]
    fn region_tokens_extrae_etiquetas() {
        assert_eq!(
            region_tokens("Breath of Fire IV (USA) (Track 1)"),
            vec!["usa".to_string(), "track 1".to_string()]
        );
        assert!(region_tokens("Sin etiquetas").is_empty());
        assert!(region_tokens("Sin cierre (abierto").is_empty());
        assert_eq!(db_platform_name("PS1"), Some("PlayStation"));
        assert_eq!(db_platform_name("PS2"), Some("PlayStation 2"));
        assert_eq!(db_platform_name("PSP"), Some("PlayStation Portable"));
        assert_eq!(
            db_platform_name("SNES"),
            Some("Super Nintendo Entertainment System")
        );
    }

    #[test]
    fn neogeo_zip_detection() {
        let detected = platforms::detect_platform(r"F:\Roms\NeoGeo\kof98.zip");
        assert!(detected.is_some());
        let info = detected.unwrap();
        assert_eq!(info.platform, "NEOGEO");
        assert_eq!(info.core_name, "fbneo");
        assert_eq!(
            platforms::neogeo_display_name("kof98"),
            Some("The King of Fighters '98 - The Slugfest")
        );
    }

    #[test]
    fn mame_zip_detection() {
        let detected = platforms::detect_platform(r"F:\Roms\MAME\pacman.zip");
        assert!(detected.is_some());
        let info = detected.unwrap();
        assert_eq!(info.platform, "MAME");
        assert_eq!(info.core_name, "fbneo");
    }

    #[test]
    #[ignore = "requiere ROMs y binarios locales en F:\\ / disco"]
    fn ps3_game_detection_test() {
        let eboot_path = r"F:\Roms\PS3\Monopoly Streets\PS3_GAME\USRDIR\EBOOT.BIN";
        if !Path::new(eboot_path).exists() {
            println!("PS3 test skipped: path not found on disk");
            return;
        }
        let detected = platforms::detect_platform(eboot_path);
        assert!(detected.is_some(), "Debe detectar EBOOT.BIN como juego");
        let info = detected.unwrap();
        assert_eq!(info.platform, "PS3");
        assert_eq!(info.core_name, "rpcs3");

        let (title, cover) = platforms::resolve_ps3_game_info(Path::new(eboot_path));
        assert_eq!(title, "Monopoly Streets");
        assert!(cover.is_some());
        let cover_str = cover.unwrap();
        assert!(
            Path::new(&cover_str).exists(),
            "Cover ICON0.PNG debe existir en disco"
        );

        assert!(platforms::is_standalone_emulator("rpcs3"));
        assert!(!platforms::is_standalone_emulator("snes9x"));

        let rpcs3_exe = get_rpcs3_exe();
        assert!(rpcs3_exe.exists(), "rpcs3.exe debe existir");
    }

    fn is_real_libretrodb(db_path: &Path) -> bool {
        db_path
            .metadata()
            .map(|m| m.len() > 1024 * 1024)
            .unwrap_or(false)
    }

    #[test]
    fn test_nds_metadata_resolution_and_curated() {
        // 1. Test resolución de serial NDS en formato NTR-XXXX contra libretrodb (hexadecimal '41595745')
        let db_path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("binaries")
            .join("libretrodb.sqlite");
        if is_real_libretrodb(&db_path) {
            let conn = rusqlite::Connection::open(&db_path).unwrap();
            let meta = crate::metadata::libretro::query_metadata_by_serial(
                &conn,
                "NTR-AYWE",
                "Yoshi's Island DS",
            );
            assert!(
                meta.is_some(),
                "Debe resolver NTR-AYWE vía hex en libretrodb"
            );
            assert_eq!(
                meta.unwrap().display_name.as_deref(),
                Some("Yoshi's Island DS")
            );
        }

        // 2. Test catálogo curado NDS con variantes en español y etiquetas [NDS]
        let p1 = crate::metadata::curated::find_curated_catalog_metadata(
            "Pokémon Blanco 2 [NDS] [Roms Nintendo en Español]",
            "NDS",
        );
        assert!(p1.is_some());
        let m1 = p1.unwrap();
        assert_eq!(m1.genre.as_deref(), Some("Rol / RPG"));
        assert_eq!(m1.developer.as_deref(), Some("Game Freak"));
        assert_eq!(m1.release_year, Some(2012));

        let p2 = crate::metadata::curated::find_curated_catalog_metadata(
            "El Profesor Layton y la Villa Misteriosa [NDS] [Roms Nintendo en Español]",
            "NDS",
        );
        assert!(p2.is_some());
        let m2 = p2.unwrap();
        assert_eq!(m2.genre.as_deref(), Some("Puzle / Aventura"));
        assert_eq!(m2.developer.as_deref(), Some("Level-5"));
        assert_eq!(m2.release_year, Some(2007));

        let p3 = crate::metadata::curated::find_curated_catalog_metadata(
            "Mario & Luigi - Compañeros en el Tiempo [NDS] [Roms Nintendo en Español]",
            "NDS",
        );
        assert!(p3.is_some());
        let m3 = p3.unwrap();
        assert_eq!(m3.genre.as_deref(), Some("Rol / RPG"));
        assert_eq!(m3.developer.as_deref(), Some("AlphaDream"));
        assert_eq!(m3.release_year, Some(2005));

        let p4 = crate::metadata::curated::find_curated_catalog_metadata(
            "Golden Sun - Oscuro Amanecer [NDS] [Roms Nintendo en Español]",
            "NDS",
        );
        assert!(p4.is_some());
        let m4 = p4.unwrap();
        assert_eq!(m4.genre.as_deref(), Some("Rol / RPG"));
        assert_eq!(m4.developer.as_deref(), Some("Camelot"));
        assert_eq!(m4.release_year, Some(2010));
    }

    #[test]
    #[ignore = "requiere binario Azahar instalado en disco"]
    fn test_azahar_3ds_detection() {
        assert!(platforms::is_standalone_emulator("azahar"));
        let p1 = platforms::detect_platform("Super Mario 3D Land.3ds").unwrap();
        assert_eq!(p1.platform, "3DS");
        assert_eq!(p1.core_name, "azahar");

        let p2 = platforms::detect_platform("Pokemon X.cia").unwrap();
        assert_eq!(p2.platform, "3DS");
        assert_eq!(p2.core_name, "azahar");

        let p3 = platforms::detect_platform("Zelda Ocarina of Time 3D.cci").unwrap();
        assert_eq!(p3.platform, "3DS");
        assert_eq!(p3.core_name, "azahar");

        assert!(
            crate::emulator::standalone::check_azahar().is_ok(),
            "check_azahar debe encontrar el ejecutable"
        );
    }

    #[test]
    #[ignore = "requiere ROMs PC locales en F:\\"]
    fn test_pc_games_detection() {
        assert!(platforms::is_standalone_emulator("pc"));

        let p1 = platforms::detect_platform(r"F:\Roms\PC\Aethermancer\Aethermancer.exe").unwrap();
        assert_eq!(p1.platform, "PC");
        assert_eq!(p1.core_name, "pc");

        let p2 =
            platforms::detect_platform(r"F:\Roms\PC\ReStory Chill Electronics Repairs\Restory.exe")
                .unwrap();
        assert_eq!(p2.platform, "PC");
        assert_eq!(p2.core_name, "pc");

        // CrashHandler debe ser ignorado
        let p_crash =
            platforms::detect_platform(r"F:\Roms\PC\Aethermancer\UnityCrashHandler64.exe");
        assert!(p_crash.is_none());

        // Test de detección de Primary Exe en carpetas reales
        let aether_dir = Path::new(r"F:\Roms\PC\Aethermancer");
        if aether_dir.exists() {
            let primary = crate::scanner::pc::find_primary_pc_game_exe(aether_dir);
            assert!(primary.is_some());
            assert_eq!(
                primary
                    .unwrap()
                    .file_name()
                    .unwrap()
                    .to_string_lossy()
                    .to_lowercase(),
                "aethermancer.exe"
            );

            let appid = crate::scanner::pc::find_steam_appid(aether_dir);
            assert_eq!(appid, Some(2288470));
        }

        let restory_dir = Path::new(r"F:\Roms\PC\ReStory Chill Electronics Repairs");
        if restory_dir.exists() {
            let primary = crate::scanner::pc::find_primary_pc_game_exe(restory_dir);
            assert!(primary.is_some());
            assert_eq!(
                primary
                    .unwrap()
                    .file_name()
                    .unwrap()
                    .to_string_lossy()
                    .to_lowercase(),
                "restory.exe"
            );

            let appid = crate::scanner::pc::find_steam_appid(restory_dir);
            assert_eq!(appid, Some(3812600));

            let (title, _) =
                crate::scanner::pc::resolve_pc_game_info(&restory_dir.join("Restory.exe"));
            assert_eq!(title, "ReStory Chill Electronics Repairs");
        }

        // Test de process_pc_games sobre F:\Roms\PC
        let pc_dir = Path::new(r"F:\Roms\PC");
        if pc_dir.exists() {
            let (valid_games, ignored_files) = crate::scanner::pc::process_pc_games(pc_dir);
            if aether_dir.exists() {
                assert!(valid_games.iter().any(|p| p
                    .to_string_lossy()
                    .to_lowercase()
                    .ends_with("aethermancer.exe")));
            }
            assert!(valid_games
                .iter()
                .any(|p| p.to_string_lossy().to_lowercase().ends_with("restory.exe")));
            assert!(ignored_files.iter().any(|p| p
                .to_string_lossy()
                .to_lowercase()
                .ends_with("unitycrashhandler64.exe")));
        }
    }

    #[test]
    fn test_melonds_url_and_fallback() {
        let url1 = platforms::core_zip_url("melonDS");
        assert_eq!(
            url1,
            "https://buildbot.libretro.com/nightly/windows/x86_64/latest/melonds_libretro.dll.zip"
        );
        let url2 = platforms::core_zip_url("melonds");
        assert_eq!(
            url2,
            "https://buildbot.libretro.com/nightly/windows/x86_64/latest/melonds_libretro.dll.zip"
        );
        let url3 = platforms::core_zip_url("melonDS DS");
        assert_eq!(url3, "https://buildbot.libretro.com/nightly/windows/x86_64/latest/melondsds_libretro.dll.zip");
    }

    #[test]
    #[ignore = "descarga thumbnails de red"]
    fn arcade_thumbnail_resolution_test() {
        let test_arcade_games = [
            ("MAME", "kinst", "Killer Instinct"),
            ("MAME", "ssriders", "Sunset Riders"),
            ("NEOGEO", "kof98", "The King of Fighters '98 - The Slugfest"),
            ("NEOGEO", "lastblad", "The Last Blade"),
            ("NEOGEO", "wjammers", "Windjammers / Flying Power Disc"),
            ("NEOGEO", "tophuntr", "Top Hunter - Roddy & Cathy"),
            ("NEOGEO", "mslug", "Metal Slug - Super Vehicle-001"),
            ("MAME", "dino", "Cadillacs and Dinosaurs"),
        ];

        for (plat, stem, display) in &test_arcade_games {
            let thumb = ensure_thumbnail_test(plat, stem, Some(display), None, true);
            println!("ARCADE TEST '{}' ({}) -> {:?}", stem, plat, thumb);
            assert!(
                thumb.is_some(),
                "Thumbnail must be found for Arcade game '{}'",
                stem
            );
            let thumb_path = thumb.unwrap();
            assert!(
                Path::new(&thumb_path).exists(),
                "Thumbnail file must exist on disk for '{}'",
                stem
            );
        }
    }

    #[test]
    fn lost_covers_test() {
        let db_path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("binaries")
            .join("libretrodb.sqlite");
        if is_real_libretrodb(&db_path) {
            let conn = Connection::open(&db_path).unwrap();
            let test_games = [
                (
                    "SMS",
                    "Alex Kidd in Shinobi World (USA, Europe)",
                    r"F:\Roms\SMS\Alex Kidd in Shinobi World (USA, Europe).sms",
                ),
                (
                    "SMS",
                    "Golden Axe (USA, Europe)",
                    r"F:\Roms\SMS\Golden Axe (USA, Europe).sms",
                ),
                (
                    "SMS",
                    "Michael Jackson's Moonwalker (USA, Europe)",
                    r"F:\Roms\SMS\Michael Jackson's Moonwalker (USA, Europe).sms",
                ),
                (
                    "SMS",
                    "Strider (USA, Europe)",
                    r"F:\Roms\SMS\Strider (USA, Europe).sms",
                ),
                (
                    "SNES",
                    "Super Metroid (USA)",
                    r"F:\Roms\SNES\Super Metroid (USA).sfc",
                ),
                ("PSP", "Patapon (USA)", r"F:\Roms\PSP\Patapon (USA).iso"),
                ("PSP", "Patapon 2 (USA)", r"F:\Roms\PSP\Patapon 2 (USA).iso"),
                ("PSP", "LocoRoco (USA)", r"F:\Roms\PSP\LocoRoco (USA).iso"),
                (
                    "PSP",
                    "LocoRoco 2 (USA)",
                    r"F:\Roms\PSP\LocoRoco 2 (USA).iso",
                ),
            ];

            for (plat, stem, path_str) in &test_games {
                let p = Path::new(path_str);
                let meta = query_game_metadata_comprehensive(&conn, stem, plat, p);
                let thumb = ensure_thumbnail_test(
                    plat,
                    stem,
                    meta.as_ref().and_then(|m| m.display_name.as_deref()),
                    Some(&conn),
                    true,
                );
                println!("TEST '{}' on '{}' -> {:?}", stem, plat, thumb);
                assert!(
                    thumb.is_some(),
                    "Thumbnail must be found for '{}' on '{}'",
                    stem,
                    plat
                );
                let thumb_path = thumb.unwrap();
                assert!(
                    Path::new(&thumb_path).exists(),
                    "Thumbnail file must exist on disk"
                );
            }
        }
    }

    #[test]
    fn sms_detection() {
        let db_path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("binaries")
            .join("libretrodb.sqlite");
        if is_real_libretrodb(&db_path) {
            let conn = Connection::open(&db_path).unwrap();
            let test_roms = [
                r"F:\Roms\SMS\Sonic The Hedgehog (USA, Europe).sms",
                r"F:\Roms\SMS\Alex Kidd in Miracle World (USA, Europe).sms",
                r"F:\Roms\SMS\Wonder Boy in Monster World (Europe).sms",
                r"F:\Roms\SMS\Shinobi (USA, Europe).sms",
                r"F:\Roms\SMS\Castle of Illusion Starring Mickey Mouse (USA, Europe).sms",
                r"F:\Roms\SMS\Asterix (Europe, Brazil).sms",
                r"F:\Roms\SMS\Golden Axe (USA, Europe).sms",
                r"F:\Roms\SMS\Phantasy Star (USA, Europe).sms",
                r"F:\Roms\SMS\Out Run (USA, Europe).sms",
                r"F:\Roms\SMS\Space Harrier (USA, Europe).sms",
                r"F:\Roms\SMS\R-Type (World).sms",
            ];

            for path_str in &test_roms {
                let p = Path::new(path_str);
                let stem = p.file_stem().unwrap().to_str().unwrap();
                let meta = query_game_metadata_comprehensive(&conn, stem, "SMS", p);
                assert!(
                    meta.is_some(),
                    "Metadata should be found for SMS game '{}'",
                    stem
                );
                let m = meta.unwrap();
                assert!(m.display_name.is_some());
                assert!(m.genre.is_some() || m.developer.is_some() || m.release_year.is_some());
            }
        }
    }

    #[test]
    fn gbc_detection() {
        let detected =
            platforms::detect_platform(r"F:\Roms\GBC\Pokemon - Edicion Cristal (Spain).gbc");
        assert!(detected.is_some());
        let info = detected.unwrap();
        assert_eq!(info.platform, "GBC");
        assert_eq!(info.core_name, "gambatte");
        assert_eq!(
            platforms::thumbnail_dir("GBC"),
            Some("Nintendo - Game Boy Color")
        );
    }

    #[test]
    fn gamecube_iso_detection() {
        let detected = platforms::detect_platform(r"F:\Roms\NGC\Super Smash Bros. Melee (USA).iso");
        assert!(detected.is_some());
        let info = detected.unwrap();
        assert_eq!(info.platform, "GAMECUBE");
        assert_eq!(info.core_name, "dolphin");
        assert_eq!(
            platforms::thumbnail_dir("GAMECUBE"),
            Some("Nintendo - GameCube")
        );

        let detected_gcm = platforms::detect_platform(r"F:\Roms\Zelda.gcm");
        assert!(detected_gcm.is_some());
        assert_eq!(detected_gcm.unwrap().platform, "GAMECUBE");
    }

    #[test]
    fn ps2_and_ps1_iso_detection() {
        let detected_ps2_folder =
            platforms::detect_platform(r"F:\Roms\PS2\The King of Fighters XI (USA).iso");
        assert!(detected_ps2_folder.is_some());
        let ps2_info = detected_ps2_folder.unwrap();
        assert_eq!(ps2_info.platform, "PS2");
        assert_eq!(ps2_info.core_name, "pcsx2");
        assert_eq!(
            platforms::thumbnail_dir("PS2"),
            Some("Sony - PlayStation 2")
        );

        let detected_ps2_serial = platforms::detect_platform(r"F:\Roms\SLUS-213.91.iso");
        assert!(detected_ps2_serial.is_some());
        assert_eq!(detected_ps2_serial.unwrap().platform, "PS2");

        let detected_ps1 = platforms::detect_platform(r"F:\Roms\PS1\Breath of Fire IV (USA).iso");
        assert!(detected_ps1.is_some());
        assert_eq!(detected_ps1.unwrap().platform, "PS1");
    }

    #[test]
    fn locoroco_and_patapon_detection() {
        assert_eq!(base_title("LocoRoco (USA)"), "locoroco");
        assert_eq!(base_title("LocoRoco 2 (USA)"), "locoroco 2");
        assert_eq!(base_title("Patapon (Europe)"), "patapon");
        assert_eq!(base_title("Patapon 2 (Europe)"), "patapon 2");

        assert_eq!(sequel_number("LocoRoco"), None);
        assert_eq!(sequel_number("LocoRoco 2"), Some("2"));
        assert_eq!(sequel_number("Patapon"), None);
        assert_eq!(sequel_number("Patapon 2 - Don-Chaka"), Some("2"));
        assert_eq!(sequel_number("Final Fantasy VII"), Some("7"));

        assert!(!plausible_match("LocoRoco", "LocoRoco 2"));
        assert!(!plausible_match("Patapon", "Patapon 2 - Don-Chaka"));
        assert!(plausible_match("LocoRoco", "LocoRoco"));
        assert!(plausible_match("LocoRoco 2", "LocoRoco 2"));
        assert!(plausible_match("Patapon", "Patapon"));

        let db_path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("binaries")
            .join("libretrodb.sqlite");
        if is_real_libretrodb(&db_path) {
            let conn = Connection::open(&db_path).unwrap();

            // LocoRoco
            let rom_path = Path::new(r"F:\Roms\PSP\LocoRoco (USA).iso");
            let serial = find_rom_serial(&conn, "LocoRoco (USA)", rom_path);
            assert!(serial.is_some());
            let meta = query_metadata_by_serial(&conn, &serial.unwrap(), "LocoRoco (USA)").unwrap();
            assert_eq!(meta.display_name.as_deref(), Some("LocoRoco"));

            let thumb = ensure_thumbnail_test(
                "PSP",
                "LocoRoco (USA)",
                meta.display_name.as_deref(),
                Some(&conn),
                true,
            );
            assert!(thumb.is_some(), "LocoRoco thumbnail should be found");
            let thumb_path = thumb.unwrap();
            assert!(
                Path::new(&thumb_path).exists(),
                "Thumbnail file must exist on disk"
            );

            // Patapon
            let rom_path_pat = Path::new(r"F:\Roms\PSP\Patapon (USA).iso");
            let serial_pat = find_rom_serial(&conn, "Patapon (USA)", rom_path_pat);
            assert!(serial_pat.is_some());
            let meta_pat =
                query_metadata_by_serial(&conn, &serial_pat.unwrap(), "Patapon (USA)").unwrap();
            assert_eq!(meta_pat.display_name.as_deref(), Some("Patapon"));

            let thumb_pat = ensure_thumbnail_test(
                "PSP",
                "Patapon (USA)",
                meta_pat.display_name.as_deref(),
                Some(&conn),
                true,
            );
            assert!(thumb_pat.is_some(), "Patapon thumbnail should be found");
            let thumb_pat_path = thumb_pat.unwrap();
            assert!(
                Path::new(&thumb_pat_path).exists(),
                "Thumbnail file must exist on disk"
            );
        }
    }

    #[test]
    #[ignore = "requiere 7-Zip y ROMs PS3 locales en disco"]
    fn test_7z_binary_and_dragons_crown() {
        let seven_z = crate::scanner::iso::find_7z_binary();
        assert!(seven_z.is_some(), "7-Zip debe ser detectado en el sistema");

        let eboot_dc = Path::new(r"F:\Roms\PS3\Dragon's Crown\PS3_GAME\USRDIR\EBOOT.BIN");
        if eboot_dc.exists() {
            let detected = platforms::detect_platform(&eboot_dc.to_string_lossy());
            assert!(detected.is_some());
            let info = detected.unwrap();
            assert_eq!(info.platform, "PS3");
            assert_eq!(info.core_name, "rpcs3");

            let (title, cover) = platforms::resolve_ps3_game_info(eboot_dc);
            assert_eq!(title, "Dragon's Crown");
            assert!(cover.is_some());
            let cover_path = cover.unwrap();
            assert!(
                Path::new(&cover_path).exists(),
                "El cover ICON0.PNG de Dragon's Crown debe existir"
            );

            let conn = get_metadata_connection();
            let meta = crate::metadata::lookup_metadata(&conn, eboot_dc, &title);
            assert!(meta.is_some(), "Dragon's Crown metadata must be found");
            let m = meta.unwrap();
            assert_eq!(
                m.release_year,
                Some(2013),
                "Dragon's Crown release year must be 2013"
            );
            assert_eq!(
                m.developer.as_deref(),
                Some("Vanillaware"),
                "Developer must be Vanillaware"
            );
            assert!(
                m.publisher
                    .as_deref()
                    .is_some_and(|p| p.starts_with("Atlus")),
                "Publisher must be Atlus"
            );
        }
    }

    #[test]
    fn test_legend_of_dragoon() {
        let db_path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("binaries")
            .join("libretrodb.sqlite");
        if is_real_libretrodb(&db_path) {
            let conn = Connection::open(&db_path).unwrap();
            let opt_conn = Some(conn);
            let p = Path::new(
                r"F:\Roms\PS1\The Legend of the Dragoon [PAL] [CD1-CD4]\The Legend of the Dragoon [PAL] [CD1-CD4].m3u",
            );
            let meta_lookup =
                crate::metadata::lookup_metadata(&opt_conn, p, "The Legend of the Dragoon");
            assert!(
                meta_lookup.is_some(),
                "The Legend of Dragoon metadata must be found"
            );
            let m = meta_lookup.unwrap();
            assert!(
                m.genre.as_deref() == Some("RPG") || m.genre.as_deref() == Some("Rol / RPG"),
                "Genre must be RPG or Rol / RPG"
            );
            assert_eq!(
                m.developer.as_deref(),
                Some("Sony"),
                "Developer must be Sony"
            );

            // Test pure name matching without serial
            let dummy_path = Path::new(r"F:\Roms\PS1\dummy.bin");
            let meta_by_name = query_game_metadata_comprehensive(
                opt_conn.as_ref().unwrap(),
                "The Legend of the Dragoon",
                "PS1",
                dummy_path,
            );
            assert!(
                meta_by_name.is_some(),
                "Metadata by title alone must be found"
            );
            let m2 = meta_by_name.unwrap();
            assert!(
                m2.genre.as_deref() == Some("RPG") || m2.genre.as_deref() == Some("Rol / RPG"),
                "Genre by pure name must also be RPG or Rol / RPG"
            );
            assert_eq!(
                m2.developer.as_deref(),
                Some("Sony"),
                "Developer by pure name must also be Sony"
            );
        }
    }

    #[test]
    fn test_mgs() {
        let db_path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("binaries")
            .join("libretrodb.sqlite");
        if is_real_libretrodb(&db_path) {
            let conn = Connection::open(&db_path).unwrap();
            let opt_conn = Some(conn);

            let p = Path::new(
                r"F:\Roms\PS1\Metal Gear Solid (USA)\Metal Gear Solid (USA) (Disc 1) (v1.0).cue",
            );
            let p_bin = Path::new(
                r"F:\Roms\PS1\Metal Gear Solid (USA)\Metal Gear Solid (USA) (Disc 1) (v1.0).bin",
            );

            if p.exists() {
                let hdr_cue = crate::metadata::headers::extract_rom_header("PS1", p);
                assert!(hdr_cue.is_some());
                assert_eq!(hdr_cue.unwrap().serial.as_deref(), Some("SLUS-00594"));

                let meta_cue = crate::metadata::lookup_metadata(&opt_conn, p, "Metal Gear Solid");
                assert!(meta_cue.is_some());
                let mc = meta_cue.unwrap();
                assert_eq!(mc.display_name.as_deref(), Some("Metal Gear Solid"));
                assert_eq!(mc.release_year, Some(1998));
                assert_eq!(mc.developer.as_deref(), Some("KCE Japan"));
                assert_eq!(mc.publisher.as_deref(), Some("Konami"));
                assert_eq!(mc.genre.as_deref(), Some("Action"));
                assert_eq!(mc.region.as_deref(), Some("USA"));
            }

            if p_bin.exists() {
                let hdr_bin = crate::metadata::headers::extract_rom_header("PS1", p_bin);
                assert!(hdr_bin.is_some());
                assert_eq!(hdr_bin.unwrap().serial.as_deref(), Some("SLUS-00594"));

                let meta_bin =
                    crate::metadata::lookup_metadata(&opt_conn, p_bin, "Metal Gear Solid");
                assert!(meta_bin.is_some());
                let mb = meta_bin.unwrap();
                assert_eq!(mb.release_year, Some(1998));
                assert_eq!(mb.developer.as_deref(), Some("KCE Japan"));
                assert_eq!(mb.genre.as_deref(), Some("Action"));
            }
        }
    }

    #[test]
    #[ignore = "requiere red (SteamGridDB/libretrodb online)"]
    fn test_fix_match_metadata_retrieval() {
        let results = crate::commands::steamgrid::fix_match_search(
            "Pokemon".to_string(),
            None,
            Some("libretro".to_string()),
            Some("GBA".to_string()),
        );
        assert!(results.is_ok());
        let candidates = results.unwrap();
        assert!(
            !candidates.is_empty(),
            "Should find Pokemon games in libretro DB"
        );
        let with_genre = candidates.iter().find(|c| c.genre.is_some());
        assert!(
            with_genre.is_some(),
            "At least one candidate must have genre populated"
        );
    }

    #[test]
    fn test_ps3_internal_files_are_ignored() {
        // Archivos internos comunes dentro de PS3_GAME
        let internal_bin = r"F:\Roms\PS3\Game\PS3_GAME\USRDIR\NFS\00PERMTR.BIN";
        assert!(
            platforms::detect_platform(internal_bin).is_none(),
            "Archivos .BIN internos no deben detectarse como juegos"
        );

        let dat_file = r"F:\Roms\PS3\Game\PS3_GAME\USRDIR\dat.bin";
        assert!(
            platforms::detect_platform(dat_file).is_none(),
            "dat.bin interno no debe detectarse"
        );

        let update_pup = r"F:\Roms\PS3\Game\PS3_UPDATE\PS3UPDAT.PUP";
        assert!(
            platforms::detect_platform(update_pup).is_none(),
            "Archivos en PS3_UPDATE no deben detectarse"
        );

        // Únicamente EBOOT.BIN debe ser juego válido
        let valid_eboot = r"F:\Roms\PS3\Game\PS3_GAME\USRDIR\EBOOT.BIN";
        let detected = platforms::detect_platform(valid_eboot);
        assert!(detected.is_some(), "EBOOT.BIN sí debe detectarse");
        let info = detected.unwrap();
        assert_eq!(info.platform, "PS3");
        assert_eq!(info.core_name, "rpcs3");
    }

    #[test]
    fn test_multidisc_parsing() {
        use crate::scanner::multidisc::parse_disc_info;

        // Chrono Cross CD1 y CD2
        let cc1 =
            Path::new(r"F:\Roms\PS1\Chrono Cross\Chrono Cross [SLUS-01041] [SLUS-01041] [CD1].cue");
        let info1 = parse_disc_info(cc1);
        assert!(info1.is_some());
        let d1 = info1.unwrap();
        assert_eq!(d1.disc_number, 1);
        assert_eq!(d1.base_title, "Chrono Cross");

        let cc2 =
            Path::new(r"F:\Roms\PS1\Chrono Cross\Chrono Cross [SLUS-01041] [SLUS-01080] [CD2].cue");
        let info2 = parse_disc_info(cc2);
        assert!(info2.is_some());
        let d2 = info2.unwrap();
        assert_eq!(d2.disc_number, 2);
        assert_eq!(d2.base_title, "Chrono Cross");

        // The Legend of the Dragoon CD1..CD4
        let lod1 = Path::new(
            r"F:\Roms\PS1\The Legend of the Dragoon [PAL] [CD1-CD4]\(PS1) The Legend of the Dragoon [PAL] [SCES-03047] [CD1].cue",
        );
        let lod_info = parse_disc_info(lod1);
        assert!(lod_info.is_some());
        let ld1 = lod_info.unwrap();
        assert_eq!(ld1.disc_number, 1);
        assert!(ld1.base_title.contains("The Legend of the Dragoon"));

        // Single disc game: NO debe coincidir como disco múltiple
        let single = Path::new(r"F:\Roms\PS1\Breath of Fire IV\Breath of Fire IV.cue");
        assert!(parse_disc_info(single).is_none());

        // Castlevania con Track 1: NO es un número de CD
        let track = Path::new(r"F:\Roms\PS1\Castlevania (USA)\Castlevania (USA) (Track 1).bin");
        assert!(parse_disc_info(track).is_none());
    }

    #[test]
    fn test_m3u_platform_detection() {
        let ps1_m3u = r"F:\Roms\PS1\Chrono Cross\Chrono Cross.m3u";
        let detected = platforms::detect_platform(ps1_m3u);
        assert!(detected.is_some());
        let info = detected.unwrap();
        assert_eq!(info.platform, "PS1");
        assert_eq!(info.core_name, "pcsx_rearmed");

        let ps2_m3u = r"F:\Roms\PS2\Xenosaga II\Xenosaga II.m3u";
        let detected2 = platforms::detect_platform(ps2_m3u);
        assert!(detected2.is_some());
        let info2 = detected2.unwrap();
        assert_eq!(info2.platform, "PS2");
        assert_eq!(info2.core_name, "pcsx2");
    }

    #[test]
    fn test_ra_disc_game_resolution() {
        use crate::achievements::{ra_get_console_id, ra_resolve_game_id_by_title, RAGameListItem};

        assert_eq!(ra_get_console_id("PS1"), Some(12));
        assert_eq!(ra_get_console_id("PS2"), Some(21));
        assert_eq!(ra_get_console_id("PSP"), Some(41));

        let mock_games = vec![
            RAGameListItem {
                Title: "Castlevania: Symphony of the Night".into(),
                ID: 11240,
                ConsoleID: Some(12),
                ConsoleName: Some("PlayStation".into()),
                ImageIcon: None,
                NumAchievements: 105,
                Hashes: vec![],
            },
            RAGameListItem {
                Title: "The King of Fighters XI".into(),
                ID: 20531,
                ConsoleID: Some(21),
                ConsoleName: Some("PlayStation 2".into()),
                ImageIcon: None,
                NumAchievements: 104,
                Hashes: vec![],
            },
            RAGameListItem {
                Title: "Patapon".into(),
                ID: 10525,
                ConsoleID: Some(41),
                ConsoleName: Some("PlayStation Portable".into()),
                ImageIcon: None,
                NumAchievements: 75,
                Hashes: vec![],
            },
            RAGameListItem {
                Title: "Patapon 2".into(),
                ID: 3506,
                ConsoleID: Some(41),
                ConsoleName: Some("PlayStation Portable".into()),
                ImageIcon: None,
                NumAchievements: 111,
                Hashes: vec![],
            },
            RAGameListItem {
                Title: "Einhänder".into(),
                ID: 11329,
                ConsoleID: Some(12),
                ConsoleName: Some("PlayStation".into()),
                ImageIcon: None,
                NumAchievements: 80,
                Hashes: vec![],
            },
            RAGameListItem {
                Title: "Digimon World 2003".into(),
                ID: 11328,
                ConsoleID: Some(12),
                ConsoleName: Some("PlayStation".into()),
                ImageIcon: None,
                NumAchievements: 137,
                Hashes: vec![],
            },
        ];

        // Test Castlevania SotN
        let id1 = ra_resolve_game_id_by_title(
            &["Castlevania - Symphony of the Night (USA)"],
            &mock_games,
        );
        assert_eq!(id1, Some(11240));

        // Test KOF XI
        let id2 = ra_resolve_game_id_by_title(&["The King of Fighters XI"], &mock_games);
        assert_eq!(id2, Some(20531));

        // Test Patapon vs Patapon 2 (distinción estricta de secuela)
        let id3 = ra_resolve_game_id_by_title(&["Patapon (Europe)"], &mock_games);
        assert_eq!(id3, Some(10525));
        let id4 = ra_resolve_game_id_by_title(&["Patapon 2"], &mock_games);
        assert_eq!(id4, Some(3506));

        // Test Einhaender (diéresis / umlaut)
        let id5 = ra_resolve_game_id_by_title(&["Einhaender (USA)"], &mock_games);
        assert_eq!(id5, Some(11329));

        // Test Digimon World 2003 con tags
        let id6 =
            ra_resolve_game_id_by_title(&["Digimon World 2003 [PAL] [SLES-03936]"], &mock_games);
        assert_eq!(id6, Some(11328));
    }

    #[test]
    fn test_plausible_match_strictness() {
        let smw2 = "Super Mario World 2 - Yoshi's Island (USA)";
        let yugioh = "Yu-Gi-Oh! 7 Trials to Glory - World Championship Tournament 2005";
        let yugioh2 = "Yu-Gi-Oh! World Championship Tournament 2004";
        let dead_island = "Dead Island";

        // Nunca debe coincidir Mario con Yu-Gi-Oh! ni por la palabra "World"
        assert!(!plausible_match(smw2, yugioh));
        assert!(!plausible_match(smw2, yugioh2));
        // Ni por la palabra "Island"
        assert!(!plausible_match(smw2, dead_island));

        // Debe coincidir con variantes legítimas de su mismo título
        assert!(plausible_match(
            smw2,
            "Super Mario World 2 - Yoshi's Island"
        ));
        assert!(plausible_match(smw2, "Super Mario World 2: Yoshi's Island"));

        // Secuelas y títulos diferentes
        assert!(!plausible_match(
            "Advance Wars",
            "Advance Wars 2 - Black Hole Rising"
        ));
        assert!(plausible_match("Advance Wars (USA)", "Advance Wars"));
        assert!(!plausible_match(
            "Castlevania - Aria of Sorrow",
            "Castlevania"
        ));
    }

    #[test]
    fn test_probe_global_metadata() {
        if let Some(conn) = crate::metadata::libretro::get_metadata_connection() {
            let conn_opt = Some(conn);
            let test_games = [
                (
                    "SNES",
                    "Super Metroid (Europe)",
                    r"F:\Roms\SNES\Super Metroid (Europe).sfc",
                ),
                (
                    "SNES",
                    "Chrono Trigger (EUR)",
                    r"F:\Roms\SNES\Chrono Trigger (EUR).sfc",
                ),
                (
                    "SNES",
                    "Donkey Kong Country (Europe) (En,Fr,De) (Rev 1)",
                    r"F:\Roms\SNES\Donkey Kong Country (Europe) (En,Fr,De) (Rev 1).sfc",
                ),
                (
                    "GBA",
                    "Castlevania - Aria of Sorrow (USA)",
                    r"F:\Roms\GBA\Castlevania - Aria of Sorrow (USA).gba",
                ),
                (
                    "GBA",
                    "Golden Sun (Spain)",
                    r"F:\Roms\GBA\Golden Sun (Spain).gba",
                ),
                (
                    "GBA",
                    "Pokemon - Edicion Esmeralda (Spain)",
                    r"F:\Roms\GBA\Pokemon - Edicion Esmeralda (Spain).gba",
                ),
                (
                    "PS1",
                    "Castlevania - Symphony of the Night (USA)",
                    r"F:\Roms\PS1\Castlevania - Symphony of the Night (USA).cue",
                ),
                (
                    "PS1",
                    "Metal Gear Solid (USA) (Disc 1) (v1.0)",
                    r"F:\Roms\PS1\Metal Gear Solid (USA) (Disc 1) (v1.0).cue",
                ),
                (
                    "GB",
                    "Pokemon - Edicion Roja (Spain) (SGB Enhanced)",
                    r"F:\Roms\GB\Pokemon - Edicion Roja (Spain) (SGB Enhanced).gb",
                ),
                (
                    "MEGA_DRIVE",
                    "Sonic The Hedgehog (USA, Europe)",
                    r"F:\Roms\MegaDrive\Sonic The Hedgehog (USA, Europe).md",
                ),
                (
                    "PSP",
                    "Patapon (Europe)",
                    r"F:\Roms\PSP\Patapon (Europe).iso",
                ),
            ];

            for (plat, name, path_str) in test_games {
                let path = Path::new(path_str);
                let meta = crate::metadata::lookup_metadata(&conn_opt, path, name);
                println!("CHECK PLAT: {} | '{}'", plat, name);
                if let Some(m) = meta {
                    println!(
                        "  -> Disp: {:?}, Genre: {:?}, Dev: {:?}, Pub: {:?}, Year: {:?}",
                        m.display_name, m.genre, m.developer, m.publisher, m.release_year
                    );
                } else {
                    println!("  -> None");
                }
            }
        }
    }

    #[test]
    fn test_3ds_sequel_and_metadata_resolution() {
        // 1. Revision tag no debe interpretarse como secuela
        let pkm_rev = "Pokemon Alpha Sapphire (USA) (En,Ja,Fr,De,Es,It,Ko) (Rev 2)";
        assert_eq!(sequel_number(pkm_rev), None);
        assert!(plausible_match(pkm_rev, "Pokemon Alpha Sapphire"));

        // 2. Consulta al catálogo enriquecido de 3DS
        let meta1 = crate::metadata::n3ds::find_n3ds_catalog_metadata(
            "Fire Emblem - Awakening (Europe) (En,Fr,De,Es,It)",
            None,
        );
        assert!(meta1.is_some());
        let m1 = meta1.unwrap();
        assert_eq!(m1.genre, Some("Rol / RPG".to_string()));
        assert_eq!(m1.developer, Some("Intelligent Systems".to_string()));
        assert_eq!(m1.release_year, Some(2012));

        let meta2 = crate::metadata::n3ds::find_n3ds_catalog_metadata(pkm_rev, None);
        assert!(meta2.is_some());
        let m2 = meta2.unwrap();
        assert_eq!(m2.genre, Some("Rol / RPG".to_string()));
        assert_eq!(m2.developer, Some("Game Freak".to_string()));
        assert_eq!(m2.release_year, Some(2014));

        let meta3 = crate::metadata::n3ds::find_n3ds_catalog_metadata(
            "Kirby - Triple Deluxe (USA) (En,Fr,Es)",
            None,
        );
        assert!(meta3.is_some());
        let m3 = meta3.unwrap();
        assert_eq!(m3.genre, Some("Plataformas".to_string()));
        assert_eq!(m3.developer, Some("HAL Laboratory".to_string()));

        // 3. Lookup general a través de lookup_metadata con conexión
        let conn = crate::metadata::libretro::get_metadata_connection();
        let path = Path::new(
            r"F:\Roms\3DS\Pokemon Alpha Sapphire (USA) (En,Ja,Fr,De,Es,It,Ko) (Rev 2).3ds",
        );
        let meta_full = crate::metadata::lookup_metadata(
            &conn,
            path,
            "Pokemon Alpha Sapphire (USA) (En,Ja,Fr,De,Es,It,Ko) (Rev 2)",
        );
        assert!(meta_full.is_some());
        let mf = meta_full.unwrap();
        assert!(mf.genre.is_some());
        assert!(mf.developer.is_some());
        assert!(mf.release_year.is_some());
    }

    #[test]
    #[ignore = "requiere catálogo local + paths F:\\; assert frágil de 17/17"]
    fn test_rescan_3ds_games_simulation() {
        let conn = crate::metadata::libretro::get_metadata_connection();
        let roms = [
            ("Dragon Quest Monsters 2 - Cobi and Tara's Marvelous Mysterious Key (Japan) [T-En by Dackst & Ich73 v1.2] [n]", r"F:\Roms\3DS\Dragon Quest Monsters 2 - Cobi and Tara's Marvelous Mysterious Key (Japan) [T-En by Dackst & Ich73 v1.2] [n].3ds"),
            ("Dragon Quest Monsters Joker 3 Professional", r"F:\Roms\3DS\Dragon Quest Monsters Joker 3 Professional.cia"),
            ("Dragon Quest VIII - Journey of the Cursed King (Europe) (En,Fr,De,Es,It)", r"F:\Roms\3DS\Dragon Quest VIII - Journey of the Cursed King (Europe) (En,Fr,De,Es,It).3ds"),
            ("Fire Emblem - Awakening (Europe) (En,Fr,De,Es,It)", r"F:\Roms\3DS\Fire Emblem - Awakening (Europe) (En,Fr,De,Es,It).3ds"),
            ("Fire Emblem Fates - Special Edition (Europe) (En,Fr,De,Es,It)", r"F:\Roms\3DS\Fire Emblem Fates - Special Edition (Europe) (En,Fr,De,Es,It).3ds"),
            ("Kirby - Triple Deluxe (USA) (En,Fr,Es)", r"F:\Roms\3DS\Kirby - Triple Deluxe (USA) (En,Fr,Es).3ds"),
            ("Legend of Legacy, The (Europe)", r"F:\Roms\3DS\Legend of Legacy, The (Europe).3ds"),
            ("Legend of Zelda, The - A Link Between Worlds (USA) (En,Fr,Es)", r"F:\Roms\3DS\Legend of Zelda, The - A Link Between Worlds (USA) (En,Fr,Es).3ds"),
            ("Pokemon Alpha Sapphire (USA) (En,Ja,Fr,De,Es,It,Ko) (Rev 2)", r"F:\Roms\3DS\Pokemon Alpha Sapphire (USA) (En,Ja,Fr,De,Es,It,Ko) (Rev 2).3ds"),
            ("Pokemon Rutile Ruby 679", r"F:\Roms\3DS\Pokemon Rutile Ruby 679.3ds"),
            ("Pokemon Super Mystery Dungeon (Europe) (En,Fr,De,Es,It)", r"F:\Roms\3DS\Pokemon Super Mystery Dungeon (Europe) (En,Fr,De,Es,It).3ds"),
            ("Pokemon Ultra Sun (Europe) (En,Ja,Fr,De,Es,It,Zh,Ko)", r"F:\Roms\3DS\Pokemon Ultra Sun (Europe) (En,Ja,Fr,De,Es,It,Zh,Ko).3ds"),
            ("Pokemon x", r"F:\Roms\3DS\Pokemon x.3ds"),
            ("Project X Zone (Europe)", r"F:\Roms\3DS\Project X Zone (Europe).3ds"),
            ("Project X Zone 2 (Europe) (En,Fr,De,Es,It)", r"F:\Roms\3DS\Project X Zone 2 (Europe) (En,Fr,De,Es,It).3ds"),
            ("Puzzle & Dragons Z + Puzzle & Dragons Super Mario Bros. Edition (Europe)", r"F:\Roms\3DS\Puzzle & Dragons Z + Puzzle & Dragons Super Mario Bros. Edition (Europe).3ds"),
            ("Radiant Historia - Perfect Chronology (Europe)", r"F:\Roms\3DS\Radiant Historia - Perfect Chronology (Europe).3ds"),
        ];

        let mut resolved = 0;
        for (name, path_str) in &roms {
            let path = Path::new(path_str);
            let meta = crate::metadata::lookup_metadata(&conn, path, name);
            println!("ROM: '{}'", name);
            if let Some(m) = meta {
                println!(
                    "  -> Display: {:?}, Genre: {:?}, Dev: {:?}, Pub: {:?}, Year: {:?}",
                    m.display_name, m.genre, m.developer, m.publisher, m.release_year
                );
                if m.genre.is_some() {
                    resolved += 1;
                }
            } else {
                println!("  -> None");
            }
        }
        println!("Resolved {}/{} 3DS games", resolved, roms.len());
        assert_eq!(
            resolved,
            roms.len(),
            "All 17 3DS games must resolve genre and metadata!"
        );
    }

    #[test]
    #[ignore = "ESCRIBE sobre target/debug/data/newgameplus.json: solo ejecución manual consciente"]
    fn test_multiplatform_curated_and_migrate_db() {
        use std::fs;

        // 1. Verificar catálogo curado multiplataforma
        let gb_test = crate::metadata::curated::find_curated_catalog_metadata(
            "Pokemon - Edicion Roja (Spain)",
            "GB",
        );
        assert!(
            gb_test.is_some(),
            "Pokémon Edición Roja (GB) debe encontrarse"
        );
        let gbm = gb_test.unwrap();
        assert_eq!(gbm.genre, Some("Rol / RPG".to_string()));
        assert_eq!(gbm.developer, Some("Game Freak".to_string()));

        let gba_test = crate::metadata::curated::find_curated_catalog_metadata(
            "Pokemon - Edicion Esmeralda (Spain)",
            "GBA",
        );
        assert!(
            gba_test.is_some(),
            "Pokémon Edición Esmeralda (GBA) debe encontrarse"
        );
        let gbam = gba_test.unwrap();
        assert_eq!(gbam.genre, Some("Rol / RPG".to_string()));

        let snes_test =
            crate::metadata::curated::find_curated_catalog_metadata("Chrono Trigger (USA)", "SNES");
        assert!(
            snes_test.is_some(),
            "Chrono Trigger (SNES) debe encontrarse"
        );
        let snesm = snes_test.unwrap();
        assert_eq!(snesm.genre, Some("Rol / RPG".to_string()));
        assert_eq!(snesm.developer, Some("SquareSoft".to_string()));

        let ps1_test = crate::metadata::curated::find_curated_catalog_metadata(
            "Castlevania - Symphony of the Night (USA)",
            "PS1",
        );
        assert!(
            ps1_test.is_some(),
            "Castlevania SOTN (PS1) debe encontrarse"
        );
        let ps1m = ps1_test.unwrap();
        assert_eq!(ps1m.genre, Some("Rol / RPG".to_string()));

        let ps2_test = crate::metadata::curated::find_curated_catalog_metadata(
            "Shadow of the Colossus (USA)",
            "PS2",
        );
        assert!(
            ps2_test.is_some(),
            "Shadow of the Colossus (PS2) debe encontrarse"
        );
        let ps2m = ps2_test.unwrap();
        assert_eq!(ps2m.genre, Some("Acción / Aventura".to_string()));

        let gcn_test = crate::metadata::curated::find_curated_catalog_metadata(
            "Mario Kart - Double Dash!! (USA)",
            "GameCube",
        );
        assert!(
            gcn_test.is_some(),
            "Mario Kart Double Dash (GameCube) debe encontrarse"
        );
        let gcnm = gcn_test.unwrap();
        assert_eq!(gcnm.genre, Some("Carreras".to_string()));

        // Verificaciones de nuevas adiciones: GBA, SNES, PSP
        let mother3 = crate::metadata::curated::find_curated_catalog_metadata(
            "MOTHER 3 [GBA] [Roms Nintendo en Español]",
            "GBA",
        );
        assert!(
            mother3.is_some(),
            "Mother 3 debe encontrarse en catálogo curado"
        );
        assert_eq!(
            mother3.unwrap().developer,
            Some("Brownie Brown / HAL Laboratory".to_string())
        );

        let dball = crate::metadata::curated::find_curated_catalog_metadata(
            "Dragon Ball - Advanced Adventure (Europe) (En,Fr,De,Es,It)",
            "GBA",
        );
        assert!(
            dball.is_some(),
            "Dragon Ball Advanced Adventure debe encontrarse"
        );

        let fat_princess = crate::metadata::curated::find_curated_catalog_metadata(
            "Fat Princess - Fistful of Cake (Europe) (En,Fr,De,Es,It,Pt,Ru,El) (PSP) (PSN)",
            "PSP",
        );
        assert!(fat_princess.is_some(), "Fat Princess debe encontrarse");

        let aero2 = crate::metadata::curated::find_curated_catalog_metadata(
            "Aero the Acro-Bat 2 (Europe)",
            "SNES",
        );
        assert!(aero2.is_some(), "Aero 2 debe encontrarse");

        // Verificaciones de drivers Arcade
        let mslug = crate::metadata::arcade::resolve_arcade_driver("mslug");
        assert!(mslug.is_some(), "Metal Slug debe resolverse por driver");
        assert_eq!(
            mslug.unwrap().developer,
            Some("Nazca Corporation".to_string())
        );

        let dino = crate::metadata::arcade::resolve_arcade_driver("dino");
        assert!(
            dino.is_some(),
            "Cadillacs & Dinosaurs debe resolverse por driver"
        );
        assert_eq!(dino.unwrap().developer, Some("Capcom".to_string()));

        let kinst = crate::metadata::arcade::resolve_arcade_driver("kinst");
        assert!(
            kinst.is_some(),
            "Killer Instinct debe resolverse por driver"
        );
        assert_eq!(kinst.unwrap().developer, Some("Rare".to_string()));

        // 2. Cargar newgameplus.json y enriquecer juegos sin metadatos
        let db_path = Path::new("target/debug/data/newgameplus.json");
        if !db_path.exists() {
            println!("target/debug/data/newgameplus.json no existe en el directorio de trabajo");
            return;
        }

        let content = fs::read_to_string(db_path).expect("Lectura de newgameplus.json");
        let mut state: crate::state::models::AppState =
            serde_json::from_str(&content).expect("Parse de AppState");

        let conn = crate::metadata::libretro::get_metadata_connection();

        let mut enriched_count = 0;
        let total_games = state.games.len();
        let mut genre_counts: std::collections::HashMap<String, usize> =
            std::collections::HashMap::new();

        for game in &mut state.games {
            let path = Path::new(&game.rom_path);
            let meta = crate::metadata::lookup_metadata(&conn, path, &game.name);

            if let Some(m) = meta {
                let mut changed = false;
                if (game.genre.is_none() || game.genre.as_deref() == Some("Arcade"))
                    && m.genre.is_some()
                {
                    game.genre = m.genre;
                    changed = true;
                }
                if game.developer.is_none() && m.developer.is_some() {
                    game.developer = m.developer;
                    changed = true;
                }
                if game.publisher.is_none() && m.publisher.is_some() {
                    game.publisher = m.publisher;
                    changed = true;
                }
                if game.release_year.is_none() && m.release_year.is_some() {
                    game.release_year = m.release_year;
                    changed = true;
                }
                if (game.display_name.is_none() || game.display_name.as_deref() == Some(&game.name))
                    && m.display_name.is_some()
                {
                    game.display_name = m.display_name;
                    changed = true;
                }
                if (game.region.is_none() || game.region.as_deref() == Some(""))
                    && m.region.is_some()
                {
                    game.region = m.region;
                    changed = true;
                }
                if changed {
                    enriched_count += 1;
                }
            }

            let g_str = game.genre.as_deref().unwrap_or("Desconocido").to_string();
            *genre_counts.entry(g_str).or_insert(0) += 1;
        }

        println!("=== ESTADÍSTICAS DE ENRIQUECIMIENTO ===");
        println!("Total juegos en BD: {}", total_games);
        println!("Juegos enriquecidos en esta pasada: {}", enriched_count);
        println!("Distribución de géneros:");
        for (genre, count) in &genre_counts {
            println!("  - {}: {}", genre, count);
        }

        // Guardar JSON actualizado
        let updated_json = serde_json::to_string_pretty(&state).expect("Serializar AppState");
        fs::write(db_path, updated_json).expect("Escritura de newgameplus.json");
        println!("newgameplus.json guardado exitosamente con metadatos actualizados.");
    }

    #[test]
    #[ignore = "requiere red (API RetroAchievements)"]
    fn test_pokemon_retroachievements_hash_resolution() {
        use crate::achievements::ra_resolve_game_id;

        // Hash de Pokemon - Edicion Roja (Spain) (SGB Enhanced)
        let red_id = ra_resolve_game_id("463c241c8721ab1d1da17c91de9f8a32");
        assert!(red_id.is_ok());
        assert_eq!(
            red_id.unwrap(),
            724,
            "Pokémon Rojo debe normalizarse al GameID 724 de RetroAchievements"
        );

        // Hash de Pokemon - Edicion Azul (Spain) (SGB Enhanced)
        let blue_id = ra_resolve_game_id("6e7663f908334724548a66fc9c386002");
        assert!(blue_id.is_ok());
        assert_eq!(
            blue_id.unwrap(),
            586,
            "Pokémon Azul debe normalizarse al GameID 586 de RetroAchievements"
        );

        // Hash de Pokemon - Edicion Cristal (Spain)
        let crystal_id = ra_resolve_game_id("8a626340f6b16ba45c1d4e07f2134875");
        assert!(crystal_id.is_ok());
        assert_eq!(
            crystal_id.unwrap(),
            810,
            "Pokémon Cristal debe normalizarse al GameID 810 de RetroAchievements"
        );

        // Hash de Final Fantasy I & II Dawn of Souls (Europe)
        let ff_id = ra_resolve_game_id("5d29999685413c4d2bec10d3160f6ee6");
        if let Ok(id) = ff_id {
            assert_eq!(
                id, 762,
                "Final Fantasy I & II debe normalizarse al GameID 762 de RetroAchievements"
            );
        }

        // Test end-to-end con fetch_achievements_internal si la ROM existe
        let rom_path = r"F:\Roms\GB\Pokemon - Edicion Roja (Spain) (SGB Enhanced).gb";
        if Path::new(rom_path).exists() {
            if let Ok(content) = std::fs::read_to_string("target/debug/data/newgameplus.json") {
                if let Ok(st) = serde_json::from_str(&content) {
                    *crate::state::STATE.lock().unwrap() = st;
                }
            }
            let res = crate::commands::achievements::fetch_achievements_internal(
                rom_path.to_string(),
                true,
            );
            println!("fetch_achievements_internal result: {:?}", res.is_ok());
            if let Ok(Some(prog)) = res {
                println!(
                    "Obtenidos {} logros para '{}'",
                    prog.achievements.len(),
                    prog.game_title
                );
                assert!(
                    prog.achievements.len() > 50,
                    "Debe traer más de 50 logros para Pokémon Rojo"
                );
            }
        }
    }

    #[test]
    fn test_clean_folder_title_pc() {
        use crate::scanner::pc::clean_folder_title;

        assert_eq!(
            clean_folder_title("Hollow.Knight.v1.5.78-GOG"),
            "Hollow Knight"
        );
        assert_eq!(
            clean_folder_title("The.Witcher.3.Wild.Hunt[FitGirl Repack]"),
            "The Witcher 3 Wild Hunt"
        );
        assert_eq!(clean_folder_title("Celeste_v1.4_CODEX"), "Celeste");
        assert_eq!(
            clean_folder_title("Blasphemous 2 (Build 12345)"),
            "Blasphemous 2"
        );
    }

    #[test]
    fn test_match_best_steam_candidate() {
        use crate::scanner::pc::{match_best_steam_candidate, SteamStoreSearchResult};

        let candidates = vec![
            SteamStoreSearchResult {
                id: 3017860,
                name: "DOOM: The Dark Ages".into(),
                tiny_image: None,
            },
            SteamStoreSearchResult {
                id: 782330,
                name: "DOOM Eternal".into(),
                tiny_image: None,
            },
            SteamStoreSearchResult {
                id: 379720,
                name: "DOOM".into(),
                tiny_image: None,
            },
            SteamStoreSearchResult {
                id: 208200,
                name: "DOOM 3".into(),
                tiny_image: None,
            },
            SteamStoreSearchResult {
                id: 1148590,
                name: "DOOM 64".into(),
                tiny_image: None,
            },
        ];

        // "Doom" debe elegir exactamente "DOOM" (379720), protegiendo secuelas
        let matched = match_best_steam_candidate("Doom", &candidates);
        assert_eq!(
            matched,
            Some(379720),
            "Debe matchear DOOM y no DOOM Eternal ni DOOM 3"
        );

        // "Doom 3" debe elegir "DOOM 3" (208200)
        let matched_3 = match_best_steam_candidate("Doom 3", &candidates);
        assert_eq!(matched_3, Some(208200), "Debe matchear DOOM 3");

        // "Doom Eternal" debe elegir "DOOM Eternal" (782330)
        let matched_eternal = match_best_steam_candidate("Doom Eternal", &candidates);
        assert_eq!(matched_eternal, Some(782330), "Debe matchear DOOM Eternal");

        // Un juego no relacionado no debe matchear falsamente
        let unrelated = match_best_steam_candidate("Super Mario Bros", &candidates);
        assert_eq!(
            unrelated, None,
            "No debe matchear un juego completamente diferente"
        );
    }

    #[test]
    #[ignore = "requiere red (Steam Store API, test live)"]
    fn test_resolve_steam_appid_live() {
        use crate::scanner::pc::resolve_steam_appid;
        use std::path::Path;

        let dummy_dir = Path::new("C:/Windows/Temp");
        let appid_sea = resolve_steam_appid(dummy_dir, "Sea of Stars");
        assert_eq!(
            appid_sea,
            Some(1244090),
            "Sea of Stars debe resolver al AppID 1244090 de Steam"
        );

        let appid_hollow = resolve_steam_appid(dummy_dir, "Hollow Knight");
        assert_eq!(
            appid_hollow,
            Some(367520),
            "Hollow Knight debe resolver al AppID 367520 de Steam"
        );
    }
}
