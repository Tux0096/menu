# === Запуск QR-меню (API + фронт) ===

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApiDir = Join-Path $Root "menu-api"
$FrontDir = Join-Path $Root "fuji-qr-app"

Write-Host "=== Запуск Menu API ===" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ApiDir'; node app.js" -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "=== Запуск Nuxt (fuji-qr-app) ===" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$FrontDir'; `$env:NODE_ENV='development'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "  API:     http://localhost:3101" -ForegroundColor Yellow
Write-Host "  Сайт:    http://localhost:3100" -ForegroundColor Yellow
Write-Host "  QR-пример:" -ForegroundColor Yellow
Write-Host "  http://localhost:3100/?restaurant=leningradskaya&table=5" -ForegroundColor White
Write-Host "====================================" -ForegroundColor Green
