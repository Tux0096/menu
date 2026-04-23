# === Запуск электронного меню Фуджи ===

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApiDir = Join-Path $Root "menu-api"
$FrontDir = Join-Path $Root "fuji-site2\fuji.ru"

Write-Host "=== Запуск Menu API (PostgreSQL) ===" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ApiDir'; node app.js" -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "=== Запуск Nuxt фронтенда ===" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$FrontDir'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "Приложение запускается..." -ForegroundColor Green
Write-Host ""
Write-Host "  API:          http://localhost:3101" -ForegroundColor Yellow
Write-Host "  Сайт:         http://localhost:3100" -ForegroundColor Yellow
Write-Host "  Рестораны:    http://localhost:3100/menu" -ForegroundColor Yellow
Write-Host "  Пример меню:  http://localhost:3100/menu/koshelev" -ForegroundColor Yellow
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Подождите 20-30 секунд пока Nuxt скомпилирует проект."
