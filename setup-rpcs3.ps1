# setup-rpcs3.ps1 — Setup de RPCS3 Portable para NewGame+
# Si existe F:\Emuladores\PS3, copia los binarios y firmware necesarios.
# En caso contrario, descarga la última build oficial de RPCS3.

$ErrorActionPreference = "Stop"

$BINARIES_DIR = Join-Path (Join-Path $PSScriptRoot "src-tauri") "binaries"
$RPCS3_DEST = Join-Path $BINARIES_DIR "RPCS3"
$LOCAL_PS3 = "F:\Emuladores\PS3"
$DOWNLOADS_DIR = Join-Path $env:TEMP "gameflix-rpcs3"

function Write-Step($msg) { Write-Host "`n>>> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Err($msg)  { Write-Host "    ERROR: $msg" -ForegroundColor Red }

function Invoke-7zExtract($archive, $dest) {
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
    Write-Err "No se encontro 7z. Por favor instala 7-Zip."
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "  NewGame+ - Setup RPCS3 Portable" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

New-Item -ItemType Directory -Force -Path $RPCS3_DEST | Out-Null

$target_exe = Join-Path $RPCS3_DEST "rpcs3.exe"
if (Test-Path $target_exe) {
    Write-Ok "RPCS3 ya existe en $target_exe, saltando setup."
    exit 0
}

# Opción 1: Copiar desde instalación local configurada
if (Test-Path (Join-Path $LOCAL_PS3 "rpcs3.exe")) {
    Write-Step "Copiando RPCS3 desde $LOCAL_PS3 (con firmware configurado)..."
    
    # Copiar ejecutables y dlls
    Get-ChildItem -Path $LOCAL_PS3 -File | Where-Object { 
        $_.Extension -in @(".exe", ".dll", ".yml") -or $_.Name -in @("PS3UPDAT.PUP") 
    } | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $RPCS3_DEST -Force
    }

    # Copiar carpetas del sistema necesarias (excluyendo Juegos y dev_hdd0 pesados)
    $folders_to_copy = @("dev_flash", "qt6", "GuiConfigs", "Icons", "config", "patches", "sounds")
    foreach ($folder in $folders_to_copy) {
        $src_folder = Join-Path $LOCAL_PS3 $folder
        if (Test-Path $src_folder) {
            $dest_folder = Join-Path $RPCS3_DEST $folder
            Copy-Item -Path $src_folder -Destination $dest_folder -Recurse -Force
        }
    }

    Write-Ok "RPCS3 configurado exitosamente desde instalacion local."
    Write-Host "Ejecutable: $target_exe" -ForegroundColor Green
    exit 0
}

# Opción 2: Descargar release oficial de GitHub
Write-Step "Descargando ultima build oficial de RPCS3 para Windows..."
New-Item -ItemType Directory -Force -Path $DOWNLOADS_DIR | Out-Null

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $api_url = "https://api.github.com/repos/RPCS3/rpcs3-binaries-win/releases/latest"
    $headers = @{ "User-Agent" = "NewGamePlus-Setup" }
    $release_info = Invoke-RestMethod -Uri $api_url -Headers $headers -UseBasicParsing
    
    $asset = $release_info.assets | Where-Object { $_.name -like "*.7z" } | Select-Object -First 1
    if (-not $asset) {
        Write-Err "No se encontro asset 7z en el release."
        exit 1
    }

    $download_url = $asset.browser_download_url
    $archive_dest = Join-Path $DOWNLOADS_DIR $asset.name
    Write-Host "    Descargando $($asset.name)..."
    Invoke-WebRequest -Uri $download_url -OutFile $archive_dest -UseBasicParsing
    
    Write-Step "Extrayendo RPCS3..."
    Invoke-7zExtract $archive_dest $RPCS3_DEST
    Write-Ok "RPCS3 extraido en $RPCS3_DEST."
} catch {
    Write-Err "Error descargando RPCS3: $($_.Exception.Message)"
    exit 1
} finally {
    Remove-Item -Path $DOWNLOADS_DIR -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Setup RPCS3 Completo" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Ubicacion: $target_exe"
