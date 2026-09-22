# setup-azahar.ps1 — Setup de Azahar (Nintendo 3DS Standalone) para NewGame+
# Si existe F:\Emuladores\3DS (o F:\Emuladores\Azahar), copia los binarios y configuración.
# En caso contrario, intenta descargar la última build de Azahar para Windows desde GitHub.

$ErrorActionPreference = "Stop"

$BINARIES_DIR = Join-Path (Join-Path $PSScriptRoot "src-tauri") "binaries"
$AZAHAR_DEST = Join-Path $BINARIES_DIR "Azahar"
$LOCAL_CANDIDATES = @(
    "F:\Emuladores\3DS",
    "F:\Emuladores\Azahar",
    "C:\Azahar",
    "D:\Azahar",
    "E:\Azahar"
)
$DOWNLOADS_DIR = Join-Path $env:TEMP "gameflix-azahar"

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
Write-Host "  NewGame+ - Setup Azahar 3DS Portable" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

New-Item -ItemType Directory -Force -Path $AZAHAR_DEST | Out-Null

$target_exe = Join-Path $AZAHAR_DEST "azahar.exe"
$target_qt_exe = Join-Path $AZAHAR_DEST "azahar-qt.exe"
if ((Test-Path $target_exe) -or (Test-Path $target_qt_exe)) {
    Write-Ok "Azahar ya existe en $AZAHAR_DEST, saltando setup."
    exit 0
}

# Opción 1: Copiar desde instalación local configurada
$found_local = $null
foreach ($cand in $LOCAL_CANDIDATES) {
    if (Test-Path (Join-Path $cand "azahar.exe")) {
        $found_local = $cand
        break
    }
    if (Test-Path (Join-Path $cand "azahar-qt.exe")) {
        $found_local = $cand
        break
    }
}

if ($found_local) {
    Write-Step "Copiando Azahar desde instalacion local: $found_local ..."
    Get-ChildItem -Path $found_local -Recurse -File | ForEach-Object {
        $rel = $_.FullName.Substring($found_local.Length).TrimStart("\", "/")
        $dest_file = Join-Path $AZAHAR_DEST $rel
        $dest_parent = Split-Path $dest_file -Parent
        if (-not (Test-Path $dest_parent)) {
            New-Item -ItemType Directory -Force -Path $dest_parent | Out-Null
        }
        Copy-Item -Path $_.FullName -Destination $dest_file -Force
    }
    Write-Ok "Azahar configurado exitosamente desde $found_local."
    exit 0
}

# Opción 2: Descargar release oficial de GitHub (azahar-emu/azahar)
Write-Step "Descargando ultima build oficial de Azahar para Windows..."
New-Item -ItemType Directory -Force -Path $DOWNLOADS_DIR | Out-Null

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $api_url = "https://api.github.com/repos/azahar-emu/azahar/releases/latest"
    $headers = @{ "User-Agent" = "NewGamePlus-Setup" }
    $release_info = Invoke-RestMethod -Uri $api_url -Headers $headers -UseBasicParsing

    $asset = $release_info.assets | Where-Object { 
        ($_.name -notlike "*libretro*") -and (($_.name -like "azahar-windows-msvc*.zip") -or ($_.name -like "azahar-windows-msys2*.zip") -or ($_.name -like "*windows*.zip"))
    } | Select-Object -First 1

    if (-not $asset) {
        Write-Err "No se encontro asset de Windows en los releases de Azahar."
        Write-Host "Por favor coloca azahar.exe o azahar-qt.exe en '$AZAHAR_DEST' o en 'F:\Emuladores\3DS'." -ForegroundColor Yellow
        exit 1
    }

    $download_url = $asset.browser_download_url
    $archive_dest = Join-Path $DOWNLOADS_DIR $asset.name
    Write-Host "    Descargando $($asset.name)..."
    Invoke-WebRequest -Uri $download_url -OutFile $archive_dest -UseBasicParsing

    Write-Step "Extrayendo Azahar..."
    $extract_temp = Join-Path $DOWNLOADS_DIR "extracted"
    New-Item -ItemType Directory -Force -Path $extract_temp | Out-Null
    Invoke-ArchiveExtract $archive_dest $extract_temp

    # Si hay una subcarpeta raíz dentro del archivo extraído, mover su contenido
    $sub_dirs = Get-ChildItem -Path $extract_temp -Directory
    $src_to_move = $extract_temp
    if ($sub_dirs.Count -eq 1 -and ((Test-Path (Join-Path $sub_dirs[0].FullName "azahar.exe")) -or (Test-Path (Join-Path $sub_dirs[0].FullName "azahar-qt.exe")))) {
        $src_to_move = $sub_dirs[0].FullName
    }

    Get-ChildItem -Path $src_to_move -Recurse -File | ForEach-Object {
        $rel = $_.FullName.Substring($src_to_move.Length).TrimStart("\", "/")
        $dest_file = Join-Path $AZAHAR_DEST $rel
        $dest_parent = Split-Path $dest_file -Parent
        if (-not (Test-Path $dest_parent)) {
            New-Item -ItemType Directory -Force -Path $dest_parent | Out-Null
        }
        Copy-Item -Path $_.FullName -Destination $dest_file -Force
    }

    Write-Ok "Azahar extraido y listo en $AZAHAR_DEST."
} catch {
    Write-Err "Error descargando Azahar: $($_.Exception.Message)"
    Write-Host "Puedes instalarlo manualmente colocando los archivos en '$AZAHAR_DEST' o en 'F:\Emuladores\3DS'." -ForegroundColor Yellow
    exit 1
}
