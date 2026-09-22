# Avisos de terceros — NewGame+

Este proyecto **no incluye** binarios de emuladores en el repositorio
(`src-tauri/binaries/` está en `.gitignore`). Cada usuario los obtiene
mediante los scripts `setup-*.ps1` o la auto-descarga en primer arranque.
Si redistribuyes un instalador que ya los contenga, estas son tus obligaciones.

## RetroArch + cores Libretro

- Web: https://www.retroarch.com / https://www.libretro.com
- Licencia: **GNU GPL** (el grueso del código es GPLv3; algunos cores tienen licencias propias indicadas en cada repo).
- Al distribuir el binario: conserva avisos de copyright, entrega copia de la licencia GPL y **ofrece el código fuente** correspondiente (o indica dónde obtenerlo).
- Thumbnails: https://github.com/libretro-thumbnails — uso como caché local de carátulas.

## RPCS3 (emulador PS3 standalone opcional)

- Web: https://rpcs3.net — Licencia: **GPL-2.0**. Mismas obligaciones de atribución + fuente.

## Azahar (emulador 3DS standalone opcional, fork de Citra)

- Web: https://azahar-emu.org — Licencia: **GPL-2.0+**. Mismas obligaciones de atribución + fuente.

## Sunshine / Moonlight (cast opcional)

- Sunshine: https://github.com/LizardByte/Sunshine — Licencia: **GPL-3.0**.

## Servicios de metadatos (el usuario aporta su clave; aplican sus términos)

- RetroAchievements: https://retroachievements.org
- SteamGridDB: https://www.steamgriddb.com
- Steam Store API (solo lectura de metadatos públicos de juegos PC detectados).

## Fuentes del sistema

La app ya no descarga fuentes remotas (funciona offline); usa el stack del sistema
(`system-ui`, `Segoe UI`, etc.). Sin atribución requerida.
