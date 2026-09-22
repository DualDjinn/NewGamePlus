# Changelog

## [Sin publicar]

- Seguridad: secretos DPAPI en reposo + getters sin secretos al frontend; login RA por POST; `launch_game` solo biblioteca; covers bajo `data/`/`binaries` con tope 10 MB; `.lnk` sin `cmd.exe`; arte remoto solo HTTPS; capabilities sin shell; CSP con `object-src none`/`frame-ancestors none`; `.gitignore` cubre keys/certs.
- Updater endurecido: zip-slip real, verificación del exe, preservación post-swap, cores con reemplazo atómico, tempdirs únicos.
- Tab "Emuladores" en Ajustes: versiones instalada/última de RetroArch, RPCS3, Azahar y Sunshine, update por componente con backup y restauración, re-descarga de cores nightly, auto-check cada 4 días con badge no intrusivo (desactivable).
- A11y: focus-trap con retorno de foco en modales (detalle, cast, fix-match) + `role=dialog`.
- i18n: mensajes de escaneo y categoría "otros" via claves (`scan.*`, `library.otherTitles`, con sentinela independiente del idioma).
- `lock_state()` anti-panic por mutex envenenado en 10 archivos del backend.

- Fuentes 100% locales: se elimina la dependencia de Google Fonts en `index.html` (offline + CSP `font-src 'self'`).
- CSP endurecido: se elimina `http:` de `img-src`/`media-src`.
- Limpieza: eliminados logs temporales (`err_*`, `test_*`) y `test_db.js`.
- Docs: `README.md`, `NOTICE-THIRD-PARTY.md`, CI en GitHub Actions.
- Tests Rust: los tests de red/disco pasan a `#[ignore]`; `cargo test` solo corre unitarios herméticos.
- Robustez: helper `lock_state()` que evita `panic` por mutex envenenado en comandos principales.
- Red: verificado que no bloquea el runtime (66/69 comandos son sync sobre el pool de Tauri; los 3 async usan `spawn_blocking`/cliente async). Sin migración: se evita un refactor grande sin ganancia.
- UX: grid de biblioteca con `content-visibility: auto` para bibliotecas grandes.
