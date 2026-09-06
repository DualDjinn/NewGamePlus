# build.ps1 — Build gameFlix single-file NSIS installer
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "`n=== gameFlix Build ===" -ForegroundColor Cyan

# 1. Frontend
Write-Host "`n[1/2] Building frontend..." -ForegroundColor Yellow
npm run build

# 2. Tauri NSIS installer
Write-Host "`n[2/2] Building NSIS installer..." -ForegroundColor Yellow
npx tauri build

# Find output
$nsis = Get-ChildItem "src-tauri\target\release\bundle\nsis\*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($nsis) {
    $mb = [math]::Round($nsis.Length / 1MB, 1)
    Write-Host "`nInstaller: $($nsis.FullName) ($mb MB)" -ForegroundColor Green
} else {
    Write-Host "`nBuild complete. Check src-tauri/target/release/bundle/" -ForegroundColor Yellow
}
