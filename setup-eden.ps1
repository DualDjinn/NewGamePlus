# setup-eden.ps1 — Setup de Eden (Nintendo Switch Standalone) para NewGame+
# Si existe F:\Emuladores\Switch (o F:\Emuladores\Eden), copia los binarios y configuración.
# En caso contrario, intenta descargar la última build de Eden para Windows desde GitHub.
# Las keys (prod.keys/title.keys) y el firmware NUNCA se commitean (ver .gitignore):
# colócalos en binaries/Eden/user/ o en tu instalación local de F:\Emuladores\Switch.

$ErrorActionPreference = "Stop"

$BINARIES_DIR = Join-Path (Join-Path $PSScriptRoot "src-tauri") "binaries"
$EDEN_DEST = Join-Path $BINARIES_DIR "Eden"
$LOCAL_CANDIDATES = @(
    "F:\Emuladores\Switch",
    "F:\Emuladores\Eden",
    "C:\Eden",
    "D:\Eden",
    "E:\Eden"
)
$DOWNLOADS_DIR = Join-Path $env:TEMP "gameflix-eden"

function Write-Step($msg) { Write-Host "`n>>> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Err($msg)  { Write-Host "    ERROR: $msg" -ForegroundColor Red }

function Invoke-ArchiveExtract($archive, $dest) {
    if ($archive.EndsWith(".zip")) {
        Expand-Archive -Path $archive -DestinationPath $dest -Force
        return
    }
    $7z = Get-Command "7z" -ErrorAction SilentlyContinue
    if ($7z) {
        & 7z x $archive "-o$dest" -y | Out-Null
        return
    }
    $paths = @(
        "C:\Program Files\7-Zip\7z.exe",
        "C:\Program Files (x86)\7-Zip\7z.exe",
        "${env:LOCALAPPDATA}\Programs\7-Zip\7z.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) {
            & $p x $archive "-o$dest" -y | Out-Null
            return
        }
    }
    Write-Err "No se encontro 7z ni descompresor compatible para $archive. Por favor instala 7-Zip."
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "  NewGame+ - Setup Eden Switch Portable" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

New-Item -ItemType Directory -Force -Path $EDEN_DEST | Out-Null

$target_exe = Join-Path $EDEN_DEST "eden.exe"
if (Test-Path $target_exe) {
    Write-Ok "Eden ya existe en $EDEN_DEST, saltando setup."
    exit 0
}

# Opción 1: Copiar desde instalación local configurada (incluye user/ con keys y firmware)
$found_local = $null
foreach ($cand in $LOCAL_CANDIDATES) {
    if (Test-Path (Join-Path $cand "eden.exe")) {
        $found_local = $cand
        break
    }
}

if ($found_local) {
    Write-Step "Copiando Eden desde instalacion local: $found_local ..."
    Get-ChildItem -Path $found_local -Recurse -File | ForEach-Object {
        $rel = $_.FullName.Substring($found_local.Length).TrimStart("\", "/")
        $dest_file = Join-Path $EDEN_DEST $rel
        $dest_parent = Split-Path $dest_file -Parent
        if (-not (Test-Path $dest_parent)) {
            New-Item -ItemType Directory -Force -Path $dest_parent | Out-Null
        }
        Copy-Item -Path $_.FullName -Destination $dest_file -Force
    }
    Write-Ok "Eden configurado exitosamente desde $found_local."
    exit 0
}

# Opción 2: Descargar release estable oficial desde el Forgejo de Eden
# (Eden no publica en GitHub: https://git.eden-emu.dev/eden-emu/eden)
Write-Step "Descargando ultima build estable oficial de Eden para Windows..."
New-Item -ItemType Directory -Force -Path $DOWNLOADS_DIR | Out-Null

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $api_url = "https://git.eden-emu.dev/api/v1/repos/eden-emu/eden/releases/latest"
    $headers = @{ "User-Agent" = "NewGamePlus-Setup" }
    $release_info = Invoke-RestMethod -Uri $api_url -Headers $headers -UseBasicParsing

    # Preferir PGO (recomendado), fallback a cualquier Windows amd64
    $asset = $release_info.assets | Where-Object {
        ($_.name -like "Eden-Windows-*amd64*clang-pgo*.zip")
    } | Select-Object -First 1
    if (-not $asset) {
        $asset = $release_info.assets | Where-Object {
            ($_.name -like "Eden-Windows-*amd64*.zip")
        } | Select-Object -First 1
    }

    if (-not $asset) {
        Write-Err "No se encontro asset de Windows en los releases de Eden."
        Write-Host "Por favor coloca eden.exe en '$EDEN_DEST' o en 'F:\Emuladores\Switch'." -ForegroundColor Yellow
        exit 1
    }

    $download_url = $asset.browser_download_url
    $archive_dest = Join-Path $DOWNLOADS_DIR $asset.name
    Write-Host "    Descargando $($asset.name)..."
    Invoke-WebRequest -Uri $download_url -OutFile $archive_dest -UseBasicParsing

    Write-Step "Extrayendo Eden..."
    $extract_temp = Join-Path $DOWNLOADS_DIR "extracted"
    New-Item -ItemType Directory -Force -Path $extract_temp | Out-Null
    Invoke-ArchiveExtract $archive_dest $extract_temp

    # Si hay una subcarpeta raíz dentro del archivo extraído, mover su contenido
    $sub_dirs = Get-ChildItem -Path $extract_temp -Directory
    $src_to_move = $extract_temp
    if ($sub_dirs.Count -eq 1 -and (Test-Path (Join-Path $sub_dirs[0].FullName "eden.exe"))) {
        $src_to_move = $sub_dirs[0].FullName
    }

    Get-ChildItem -Path $src_to_move -Recurse -File | ForEach-Object {
        $rel = $_.FullName.Substring($src_to_move.Length).TrimStart("\", "/")
        $dest_file = Join-Path $EDEN_DEST $rel
        $dest_parent = Split-Path $dest_file -Parent
        if (-not (Test-Path $dest_parent)) {
            New-Item -ItemType Directory -Force -Path $dest_parent | Out-Null
        }
        Copy-Item -Path $_.FullName -Destination $dest_file -Force
    }

    Write-Ok "Eden extraido y listo en $EDEN_DEST."
    Write-Host "Recuerda copiar tus keys (prod.keys) y firmware a '$EDEN_DEST\user\' (nunca se suben a git)." -ForegroundColor Yellow
} catch {
    Write-Err "Error descargando Eden: $($_.Exception.Message)"
    Write-Host "Puedes instalarlo manualmente colocando los archivos en '$EDEN_DEST' o en 'F:\Emuladores\Switch'." -ForegroundColor Yellow
    exit 1
} finally {
    Remove-Item -Path $DOWNLOADS_DIR -Recurse -Force -ErrorAction SilentlyContinue
}
