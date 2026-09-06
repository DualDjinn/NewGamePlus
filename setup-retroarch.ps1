# setup-retroarch.ps1 — Descarga solo RetroArch para gameFlix
# Los cores se descargan automaticamente al escanear la biblioteca

$ErrorActionPreference = "Stop"

$RETROARCH_VERSION = "1.22.2"
$BASE_URL = "https://buildbot.libretro.com"
$RETROARCH_URL = "$BASE_URL/stable/$RETROARCH_VERSION/windows/x86_64/RetroArch.7z"

$BINARIES_DIR = Join-Path (Join-Path $PSScriptRoot "src-tauri") "binaries"
$DOWNLOADS_DIR = Join-Path $env:TEMP "gameflix-deps"

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
    if ($archive -match '\.zip$') {
        Expand-Archive -Path $archive -DestinationPath $dest -Force
        return
    }
    Write-Err "No se encontro 7z. Instala 7-Zip."
    exit 1
}

# --- Inicio ---
Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "  gameFlix - Setup RetroArch" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  Los cores se descargan al detectar ROMs"

New-Item -ItemType Directory -Force -Path $BINARIES_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $DOWNLOADS_DIR | Out-Null

Write-Step "Descargando RetroArch $RETROARCH_VERSION..."
$ra_archive = Join-Path $DOWNLOADS_DIR "RetroArch.7z"
$ra_exe = Join-Path (Join-Path $BINARIES_DIR "RetroArch") "retroarch.exe"

if (Test-Path $ra_exe) {
    Write-Ok "RetroArch ya existe, saltando"
} else {
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $RETROARCH_URL -OutFile $ra_archive -UseBasicParsing
        $sizeMB = [math]::Round((Get-Item $ra_archive).Length / 1048576, 1)
        Write-Ok "Descargado ($sizeMB MB)"
    } catch {
        Write-Err "Error descargando: $($_.Exception.Message)"
        exit 1
    }

    Write-Step "Extrayendo..."
    $ra_temp = Join-Path $DOWNLOADS_DIR "ra_extract"
    Invoke-7zExtract $ra_archive $ra_temp

    $ra_folder = Get-ChildItem -Path $ra_temp -Directory | Select-Object -First 1
    if (-not $ra_folder) { $ra_folder = Get-Item $ra_temp }

    $ra_dest = Join-Path $BINARIES_DIR "RetroArch"
    if (Test-Path $ra_dest) { Remove-Item $ra_dest -Recurse -Force }
    Move-Item $ra_folder.FullName $ra_dest
    Write-Ok "Extraido"
}

# retroarch.cfg kiosk mode
$cfg = @'
menu_driver = "ozone"
menu_show_core_updater = "false"
menu_show_load_core = "false"
menu_show_load_content = "false"
menu_show_online_updater = "false"
input_menu_toggle = "nul"
input_enable_hotkey = "escape"
input_exit_emulator = "escape"
video_fullscreen = "true"
video_windowed_fullscreen = "true"
video_borderless = "true"
audio_enable = "true"
savestate_auto_load = "true"
savestate_auto_save = "true"
'@

$cfg_path = Join-Path (Join-Path $BINARIES_DIR "RetroArch") "retroarch.cfg"
Set-Content -Path $cfg_path -Value $cfg -Encoding UTF8

# Limpieza
Remove-Item $DOWNLOADS_DIR -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Listo" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "RetroArch: $ra_exe"
Write-Host "Cores: se descargan automaticamente al escanear ROMs"
Write-Host ""
Write-Host "Nota: RetroArch/GPL - distribuir el binario requiere atribucion" -ForegroundColor DarkGray
