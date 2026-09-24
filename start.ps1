# === Запуск QR-меню: API + гостевое меню + терминал персонала (одним процессом) ===

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApiDir = Join-Path $Root "menu-api"

Set-Location $ApiDir
if (-not (Test-Path "node_modules")) { npm install }
node db/migrate.js
node db/demo-menu.js

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "  Гость:    http://localhost:3101/?table=5" -ForegroundColor Yellow
Write-Host "  Персонал: http://localhost:3101/staff/  (admin/admin, manager/manager, waiter/1111)" -ForegroundColor Yellow
Write-Host "====================================" -ForegroundColor Green
$env:ALLOW_DEMO_MENU = "true"   # локально без iiko — демо-меню
node app.js
