# Полный скрипт для отправки проекта в Git
$ErrorActionPreference = "Continue"

Set-Location "C:\Files\Development\VS\Smashers\smashers-backend"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Отправка проекта в Git" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Настройка Git user
Write-Host "[1/6] Настройка Git user..." -ForegroundColor Yellow
git config user.email "smashers-backend@braidx.tech"
git config user.name "Smashers Backend"
Write-Host "  ✓ Git user настроен" -ForegroundColor Green
Write-Host ""

# 2. Инициализация (если нужно)
Write-Host "[2/6] Проверка Git репозитория..." -ForegroundColor Yellow
if (-not (Test-Path .git)) {
    git init
    Write-Host "  ✓ Git инициализирован" -ForegroundColor Green
} else {
    Write-Host "  ✓ Git уже инициализирован" -ForegroundColor Green
}
Write-Host ""

# 3. Remote
Write-Host "[3/6] Настройка remote..." -ForegroundColor Yellow
$existingRemote = git remote get-url origin 2>$null
if ($existingRemote) {
    if ($existingRemote -ne "https://github.com/ExecuteTyT/Smashers-Backend.git") {
        git remote set-url origin https://github.com/ExecuteTyT/Smashers-Backend.git
        Write-Host "  ✓ Remote обновлен" -ForegroundColor Green
    } else {
        Write-Host "  ✓ Remote уже настроен" -ForegroundColor Green
    }
} else {
    git remote add origin https://github.com/ExecuteTyT/Smashers-Backend.git
    Write-Host "  ✓ Remote добавлен" -ForegroundColor Green
}
Write-Host ""

# 4. Проверка .env
Write-Host "[4/6] Проверка безопасности..." -ForegroundColor Yellow
$envInGit = git ls-files .env 2>$null
if ($envInGit) {
    Write-Host "  ⚠ Удаление .env из git..." -ForegroundColor Yellow
    git rm --cached .env 2>$null
    Write-Host "  ✓ .env удален из git" -ForegroundColor Green
} else {
    Write-Host "  ✓ .env не в git (безопасно)" -ForegroundColor Green
}
Write-Host ""

# 5. Добавление и коммит
Write-Host "[5/6] Добавление файлов и коммит..." -ForegroundColor Yellow
git add . 2>&1 | Out-Null
$fileCount = (git status --short 2>$null | Measure-Object -Line).Lines
Write-Host "  ✓ Добавлено файлов: $fileCount" -ForegroundColor Green

$commitMsg = "Initial commit: Smashers Backend API with Django parser, PostgreSQL, and Telegram integration"
$commitOutput = git commit -m $commitMsg 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Коммит создан" -ForegroundColor Green
} else {
    if ($commitOutput -match "nothing to commit") {
        Write-Host "  ℹ Нет изменений для коммита" -ForegroundColor Cyan
    } else {
        Write-Host "  ⚠ Ошибка: $commitOutput" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# 6. Ветка и push
Write-Host "[6/6] Настройка ветки и отправка..." -ForegroundColor Yellow
git branch -M main 2>&1 | Out-Null
Write-Host "  ✓ Ветка: main" -ForegroundColor Green

Write-Host "  📤 Отправка в GitHub..." -ForegroundColor Yellow
Write-Host "  ⚠ Может потребоваться аутентификация" -ForegroundColor Yellow
$pushOutput = git push -u origin main 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Проект успешно отправлен!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Репозиторий: https://github.com/ExecuteTyT/Smashers-Backend" -ForegroundColor Cyan
} else {
    Write-Host "  ⚠ Ошибка отправки:" -ForegroundColor Red
    Write-Host $pushOutput -ForegroundColor Red
    Write-Host ""
    Write-Host "Возможные причины:" -ForegroundColor Yellow
    Write-Host "  1. Требуется аутентификация GitHub" -ForegroundColor Yellow
    Write-Host "  2. Репозиторий не существует или нет доступа" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Для аутентификации:" -ForegroundColor Cyan
    Write-Host "  - Используйте Personal Access Token как пароль" -ForegroundColor Cyan
    Write-Host "  - Или настройте SSH ключ" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
