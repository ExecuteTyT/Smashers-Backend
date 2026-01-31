Set-Location "C:\Files\Development\VS\Smashers\smashers-backend"

Write-Host "=== Инициализация Git ===" -ForegroundColor Cyan
git init
Write-Host ""

Write-Host "=== Настройка remote ===" -ForegroundColor Cyan
git remote remove origin 2>$null
git remote add origin https://github.com/ExecuteTyT/Smashers-Backend.git
git remote -v
Write-Host ""

Write-Host "=== Добавление файлов ===" -ForegroundColor Cyan
git add .
$count = (git status --short 2>$null | Measure-Object -Line).Lines
Write-Host "Добавлено файлов: $count" -ForegroundColor Green
Write-Host ""

Write-Host "=== Создание коммита ===" -ForegroundColor Cyan
git commit -m "Initial commit: Smashers Backend API with Django parser, PostgreSQL, and Telegram integration"
Write-Host ""

Write-Host "=== Настройка ветки ===" -ForegroundColor Cyan
git branch -M main
Write-Host ""

Write-Host "=== Отправка в GitHub ===" -ForegroundColor Cyan
Write-Host "Может потребоваться аутентификация..." -ForegroundColor Yellow
git push -u origin main
Write-Host ""

Write-Host "=== Готово! ===" -ForegroundColor Green
