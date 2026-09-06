# setup-sunshine.ps1 — Descarga e instala Sunshine Portable para NewGamePlus
# Permite transmitir juegos con ultrabaja latencia (<15ms) a Smart TVs y Sticks

$ErrorActionPreference = "Stop"

$SUNSHINE_URL = "https://github.com/LizardByte/Sunshine/releases/latest/download/Sunshine-Windows-AMD64-portable.zip"
$BINARIES_DIR = Join-Path (Join-Path $PSScriptRoot "src-tauri") "binaries"
$SUNSHINE_DIR = Join-Path $BINARIES_DIR "Sunshine"
$DOWNLOADS_DIR = Join-Path $env:TEMP "newgameplus-deps"
$ZIP_PATH = Join-Path $DOWNLOADS_DIR "Sunshine-Windows-AMD64-portable.zip"

function Write-Step($msg) { Write-Host "`n>>> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Err($msg)  { Write-Host "    ERROR: $msg" -ForegroundColor Red }

function Extract-ZipArchive($archive, $dest) {
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
    Expand-Archive -Path $archive -DestinationPath $dest -Force
}

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "  NewGamePlus - Setup Sunshine Portable" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

New-Item -ItemType Directory -Force -Path $BINARIES_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $DOWNLOADS_DIR | Out-Null

$sunshineExe = Join-Path $SUNSHINE_DIR "sunshine.exe"
if (Test-Path $sunshineExe) {
    Write-Ok "Sunshine ya está instalado en: $SUNSHINE_DIR"
    exit 0
}

Write-Step "Descargando Sunshine Portable oficial desde GitHub..."
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $SUNSHINE_URL -OutFile $ZIP_PATH -UseBasicParsing
Write-Ok "Descarga completa: $ZIP_PATH"

Write-Step "Extrayendo Sunshine en $SUNSHINE_DIR..."
New-Item -ItemType Directory -Force -Path $SUNSHINE_DIR | Out-Null
Extract-ZipArchive $ZIP_PATH $SUNSHINE_DIR

if (-not (Test-Path $sunshineExe)) {
    # Si la descompresión creó una subcarpeta (ej. Sunshine-Windows-AMD64-portable/sunshine.exe)
    $innerExe = Get-ChildItem -Path $SUNSHINE_DIR -Filter "sunshine.exe" -Recurse | Select-Object -First 1
    if ($innerExe) {
        $parentFolder = $innerExe.DirectoryName
        if ($parentFolder -ne $SUNSHINE_DIR) {
            Get-ChildItem -Path $parentFolder | Move-Item -Destination $SUNSHINE_DIR -Force
            Remove-Item -Path $parentFolder -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

if (Test-Path $sunshineExe) {
    Write-Ok "Sunshine Portable configurado exitosamente en: $sunshineExe"
} else {
    Write-Err "No se encontró sunshine.exe luego de la descompresión."
    exit 1
}

# Limpiar archivo temporal
Remove-Item -Path $ZIP_PATH -Force -ErrorAction SilentlyContinue
Write-Host "`nListo. Ya puedes transmitir desde NewGamePlus con Sunshine Portable!`n" -ForegroundColor Green
