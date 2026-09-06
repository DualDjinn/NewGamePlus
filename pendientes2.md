# Pendientes - gameFlix

## Completados esta sesión

- ✅ `thumbnail_name_candidates` — variantes de región para thumbnails (Patapon)
- ✅ `GameDetailModal` — loading state separado, ya no se queda stuck en "Cargando..."

## Pendiente / Revertido

### 1. Platform override desde libretrodb (REVERTIDO)

Revertido porque corrompía detecciones correctas (Alex Kidd SMS → PS3).

**Causa raíz**: `find_rom_serial` matchea el serial PS3 de PSN en vez del SMS porque el nombre exacto "Alex Kidd in Miracle World" solo existe en la BD como entry PS3.

**Enfoque necesario**: Solo override cuando el heurístico es ambiguo (`.iso` que podría ser PSP o PS1), nunca cuando el heurístico ya es claro (`.sms` → SMS).

### 2. `find_rom_serial` fuzzy (REVERTIDO)

Alex Kidd no muestra metadata en "Mas Informacion" porque la BD solo tiene el nombre japonés "Alex Kidd no Miracle World" y el usuario tiene "Alex Kidd in Miracle World".

**Necesita**: Matching más tolerante (strip region tags, ignora palabras "in"/"no"/"the", significant words). Pero sin Matchear el serial equivocado (PS3 vs SMS).

### 3. Juegos `.iso` ambiguos

`.iso` sin serial ULUS/ULES/ULJM se detecta como PS1 por defecto. Con la BD se podría corregir a PSP, pero solo si el matching de serial funciona primero (pendiente #2).

**Secuencia**: Primero resolver #2 (fuzzy match confiable), luego #1 (platform override seguro), luego #3 se resuelve solo.
