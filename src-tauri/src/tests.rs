#[cfg(test)]
mod tests {
    use std::path::Path;
    use rusqlite::Connection;
    use crate::emulator::standalone::get_rpcs3_exe;
    use crate::metadata::ensure_thumbnail as ensure_thumbnail_orchestrator;
    use crate::metadata::libretro::*;
    use crate::platforms;
    use crate::state::storage::get_thumbnails_dir;

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
        assert_eq!(db_platform_name("SNES"), Some("Super Nintendo Entertainment System"));
    }

    #[test]
    fn neogeo_zip_detection() {
        let detected = platforms::detect_platform(r"F:\Roms\NeoGeo\kof98.zip");
        assert!(detected.is_some());
        let info = detected.unwrap();
        assert_eq!(info.platform, "NEOGEO");
        assert_eq!(info.core_name, "fbneo");
        assert_eq!(platforms::neogeo_display_name("kof98"), Some("The King of Fighters '98 - The Slugfest"));
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
        assert!(Path::new(&cover_str).exists(), "Cover ICON0.PNG debe existir en disco");

        assert!(platforms::is_standalone_emulator("rpcs3"));
        assert!(!platforms::is_standalone_emulator("snes9x"));

        let rpcs3_exe = get_rpcs3_exe();
        assert!(rpcs3_exe.exists(), "rpcs3.exe debe existir");
    }

    #[test]
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
            assert!(thumb.is_some(), "Thumbnail must be found for Arcade game '{}'", stem);
            let thumb_path = thumb.unwrap();
            assert!(Path::new(&thumb_path).exists(), "Thumbnail file must exist on disk for '{}'", stem);
        }
    }

    #[test]
    fn lost_covers_test() {
        let db_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("binaries").join("libretrodb.sqlite");
        if db_path.exists() {
            let conn = Connection::open(&db_path).unwrap();
            let test_games = [
                ("SMS", "Alex Kidd in Shinobi World (USA, Europe)", r"F:\Roms\SMS\Alex Kidd in Shinobi World (USA, Europe).sms"),
                ("SMS", "Golden Axe (USA, Europe)", r"F:\Roms\SMS\Golden Axe (USA, Europe).sms"),
                ("SMS", "Michael Jackson's Moonwalker (USA, Europe)", r"F:\Roms\SMS\Michael Jackson's Moonwalker (USA, Europe).sms"),
                ("SMS", "Strider (USA, Europe)", r"F:\Roms\SMS\Strider (USA, Europe).sms"),
                ("SNES", "Super Metroid (USA)", r"F:\Roms\SNES\Super Metroid (USA).sfc"),
                ("PSP", "Patapon (USA)", r"F:\Roms\PSP\Patapon (USA).iso"),
                ("PSP", "Patapon 2 (USA)", r"F:\Roms\PSP\Patapon 2 (USA).iso"),
                ("PSP", "LocoRoco (USA)", r"F:\Roms\PSP\LocoRoco (USA).iso"),
                ("PSP", "LocoRoco 2 (USA)", r"F:\Roms\PSP\LocoRoco 2 (USA).iso"),
            ];

            for (plat, stem, path_str) in &test_games {
                let p = Path::new(path_str);
                let meta = query_game_metadata_comprehensive(&conn, stem, plat, p);
                let thumb = ensure_thumbnail_test(plat, stem, meta.as_ref().and_then(|m| m.display_name.as_deref()), Some(&conn), true);
                println!("TEST '{}' on '{}' -> {:?}", stem, plat, thumb);
                assert!(thumb.is_some(), "Thumbnail must be found for '{}' on '{}'", stem, plat);
                let thumb_path = thumb.unwrap();
                assert!(Path::new(&thumb_path).exists(), "Thumbnail file must exist on disk");
            }
        }
    }

    #[test]
    fn sms_detection() {
        let db_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("binaries").join("libretrodb.sqlite");
        if db_path.exists() {
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
                assert!(meta.is_some(), "Metadata should be found for SMS game '{}'", stem);
                let m = meta.unwrap();
                assert!(m.display_name.is_some());
                assert!(m.genre.is_some() || m.developer.is_some() || m.release_year.is_some());
            }
        }
    }

    #[test]
    fn gbc_detection() {
        let detected = platforms::detect_platform(r"F:\Roms\GBC\Pokemon - Edicion Cristal (Spain).gbc");
        assert!(detected.is_some());
        let info = detected.unwrap();
        assert_eq!(info.platform, "GBC");
        assert_eq!(info.core_name, "gambatte");
        assert_eq!(platforms::thumbnail_dir("GBC"), Some("Nintendo - Game Boy Color"));
    }

    #[test]
    fn gamecube_iso_detection() {
        let detected = platforms::detect_platform(r"F:\Roms\NGC\Super Smash Bros. Melee (USA).iso");
        assert!(detected.is_some());
        let info = detected.unwrap();
        assert_eq!(info.platform, "GAMECUBE");
        assert_eq!(info.core_name, "dolphin");
        assert_eq!(platforms::thumbnail_dir("GAMECUBE"), Some("Nintendo - GameCube"));

        let detected_gcm = platforms::detect_platform(r"F:\Roms\Zelda.gcm");
        assert!(detected_gcm.is_some());
        assert_eq!(detected_gcm.unwrap().platform, "GAMECUBE");
    }

    #[test]
    fn ps2_and_ps1_iso_detection() {
        let detected_ps2_folder = platforms::detect_platform(r"F:\Roms\PS2\The King of Fighters XI (USA).iso");
        assert!(detected_ps2_folder.is_some());
        let ps2_info = detected_ps2_folder.unwrap();
        assert_eq!(ps2_info.platform, "PS2");
        assert_eq!(ps2_info.core_name, "pcsx2");
        assert_eq!(platforms::thumbnail_dir("PS2"), Some("Sony - PlayStation 2"));

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

        let db_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("binaries").join("libretrodb.sqlite");
        if db_path.exists() {
            let conn = Connection::open(&db_path).unwrap();
            
            // LocoRoco
            let rom_path = Path::new(r"F:\Roms\PSP\LocoRoco (USA).iso");
            let serial = find_rom_serial(&conn, "LocoRoco (USA)", rom_path);
            assert!(serial.is_some());
            let meta = query_metadata_by_serial(&conn, &serial.unwrap(), "LocoRoco (USA)").unwrap();
            assert_eq!(meta.display_name.as_deref(), Some("LocoRoco"));

            let thumb = ensure_thumbnail_test("PSP", "LocoRoco (USA)", meta.display_name.as_deref(), Some(&conn), true);
            assert!(thumb.is_some(), "LocoRoco thumbnail should be found");
            let thumb_path = thumb.unwrap();
            assert!(Path::new(&thumb_path).exists(), "Thumbnail file must exist on disk");

            // Patapon
            let rom_path_pat = Path::new(r"F:\Roms\PSP\Patapon (USA).iso");
            let serial_pat = find_rom_serial(&conn, "Patapon (USA)", rom_path_pat);
            assert!(serial_pat.is_some());
            let meta_pat = query_metadata_by_serial(&conn, &serial_pat.unwrap(), "Patapon (USA)").unwrap();
            assert_eq!(meta_pat.display_name.as_deref(), Some("Patapon"));

            let thumb_pat = ensure_thumbnail_test("PSP", "Patapon (USA)", meta_pat.display_name.as_deref(), Some(&conn), true);
            assert!(thumb_pat.is_some(), "Patapon thumbnail should be found");
            let thumb_pat_path = thumb_pat.unwrap();
            assert!(Path::new(&thumb_pat_path).exists(), "Thumbnail file must exist on disk");
        }
    }

    #[test]
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
            assert!(Path::new(&cover_path).exists(), "El cover ICON0.PNG de Dragon's Crown debe existir");

            let conn = get_metadata_connection();
            let meta = crate::metadata::lookup_metadata(&conn, eboot_dc, &title);
            assert!(meta.is_some(), "Dragon's Crown metadata must be found");
            let m = meta.unwrap();
            assert_eq!(m.release_year, Some(2013), "Dragon's Crown release year must be 2013");
            assert_eq!(m.developer.as_deref(), Some("Vanillaware"), "Developer must be Vanillaware");
            assert!(m.publisher.as_deref().map_or(false, |p| p.starts_with("Atlus")), "Publisher must be Atlus");
        }
    }

    #[test]
    fn test_legend_of_dragoon() {
        let db_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("binaries").join("libretrodb.sqlite");
        if db_path.exists() {
            let conn = Connection::open(&db_path).unwrap();
            let opt_conn = Some(conn);
            let p = Path::new(r"F:\Roms\PS1\The Legend of the Dragoon [PAL] [CD1-CD4]\The Legend of the Dragoon [PAL] [CD1-CD4].m3u");
            let meta_lookup = crate::metadata::lookup_metadata(&opt_conn, p, "The Legend of the Dragoon");
            assert!(meta_lookup.is_some(), "The Legend of Dragoon metadata must be found");
            let m = meta_lookup.unwrap();
            assert_eq!(m.genre.as_deref(), Some("RPG"), "Genre must be RPG");
            assert_eq!(m.developer.as_deref(), Some("Sony"), "Developer must be Sony");

            // Test pure name matching without serial
            let dummy_path = Path::new(r"F:\Roms\PS1\dummy.bin");
            let meta_by_name = query_game_metadata_comprehensive(opt_conn.as_ref().unwrap(), "The Legend of the Dragoon", "PS1", dummy_path);
            assert!(meta_by_name.is_some(), "Metadata by title alone must be found");
            let m2 = meta_by_name.unwrap();
            assert_eq!(m2.genre.as_deref(), Some("RPG"), "Genre by pure name must also be RPG");
            assert_eq!(m2.developer.as_deref(), Some("Sony"), "Developer by pure name must also be Sony");
        }
    }

    #[test]
    fn test_mgs() {
        let db_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("binaries").join("libretrodb.sqlite");
        if db_path.exists() {
            let conn = Connection::open(&db_path).unwrap();
            let opt_conn = Some(conn);

            let p = Path::new(r"F:\Roms\PS1\Metal Gear Solid (USA)\Metal Gear Solid (USA) (Disc 1) (v1.0).cue");
            let p_bin = Path::new(r"F:\Roms\PS1\Metal Gear Solid (USA)\Metal Gear Solid (USA) (Disc 1) (v1.0).bin");

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

                let meta_bin = crate::metadata::lookup_metadata(&opt_conn, p_bin, "Metal Gear Solid");
                assert!(meta_bin.is_some());
                let mb = meta_bin.unwrap();
                assert_eq!(mb.release_year, Some(1998));
                assert_eq!(mb.developer.as_deref(), Some("KCE Japan"));
                assert_eq!(mb.genre.as_deref(), Some("Action"));
            }
        }
    }

    #[test]
    fn test_fix_match_metadata_retrieval() {
        let results = crate::commands::steamgrid::fix_match_search(
            "Pokemon".to_string(),
            None,
            Some("libretro".to_string()),
            Some("GBA".to_string()),
        );
        assert!(results.is_ok());
        let candidates = results.unwrap();
        assert!(!candidates.is_empty(), "Should find Pokemon games in libretro DB");
        let with_genre = candidates.iter().find(|c| c.genre.is_some());
        assert!(with_genre.is_some(), "At least one candidate must have genre populated");
    }

    #[test]
    fn test_ps3_internal_files_are_ignored() {
        // Archivos internos comunes dentro de PS3_GAME
        let internal_bin = r"F:\Roms\PS3\Game\PS3_GAME\USRDIR\NFS\00PERMTR.BIN";
        assert!(platforms::detect_platform(internal_bin).is_none(), "Archivos .BIN internos no deben detectarse como juegos");

        let dat_file = r"F:\Roms\PS3\Game\PS3_GAME\USRDIR\dat.bin";
        assert!(platforms::detect_platform(dat_file).is_none(), "dat.bin interno no debe detectarse");

        let update_pup = r"F:\Roms\PS3\Game\PS3_UPDATE\PS3UPDAT.PUP";
        assert!(platforms::detect_platform(update_pup).is_none(), "Archivos en PS3_UPDATE no deben detectarse");

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
        let cc1 = Path::new(r"F:\Roms\PS1\Chrono Cross\Chrono Cross [SLUS-01041] [SLUS-01041] [CD1].cue");
        let info1 = parse_disc_info(cc1);
        assert!(info1.is_some());
        let d1 = info1.unwrap();
        assert_eq!(d1.disc_number, 1);
        assert_eq!(d1.base_title, "Chrono Cross");

        let cc2 = Path::new(r"F:\Roms\PS1\Chrono Cross\Chrono Cross [SLUS-01041] [SLUS-01080] [CD2].cue");
        let info2 = parse_disc_info(cc2);
        assert!(info2.is_some());
        let d2 = info2.unwrap();
        assert_eq!(d2.disc_number, 2);
        assert_eq!(d2.base_title, "Chrono Cross");

        // The Legend of the Dragoon CD1..CD4
        let lod1 = Path::new(r"F:\Roms\PS1\The Legend of the Dragoon [PAL] [CD1-CD4]\(PS1) The Legend of the Dragoon [PAL] [SCES-03047] [CD1].cue");
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
        let id1 = ra_resolve_game_id_by_title(&["Castlevania - Symphony of the Night (USA)"], &mock_games);
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
        let id6 = ra_resolve_game_id_by_title(&["Digimon World 2003 [PAL] [SLES-03936]"], &mock_games);
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
        assert!(plausible_match(smw2, "Super Mario World 2 - Yoshi's Island"));
        assert!(plausible_match(smw2, "Super Mario World 2: Yoshi's Island"));

        // Secuelas y títulos diferentes
        assert!(!plausible_match("Advance Wars", "Advance Wars 2 - Black Hole Rising"));
        assert!(plausible_match("Advance Wars (USA)", "Advance Wars"));
        assert!(!plausible_match("Castlevania - Aria of Sorrow", "Castlevania"));
    }
}

