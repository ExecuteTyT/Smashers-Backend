# Скрипт для отправки проекта в Git
$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Отправка проекта в Git репозиторий" -ForegroundColor Cyan
Write-Host "https://github.com/ExecuteTyT/Smashers-Backend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

# 1. Инициализация
Write-Host "[1/7] Инициализация Git..." -ForegroundColor Yellow
if (-not (Test-Path .git)) {
    git init
    Write-Host "  ✓ Git инициализирован" -ForegroundColor Green
} else {
    Write-Host "  ✓ Git уже инициализирован" -ForegroundColor Green
}

# 2. Remote
Write-Host "[2/7] Настройка remote..." -ForegroundColor Yellow
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

# 3. Проверка .env
Write-Host "[3/7] Проверка безопасности..." -ForegroundColor Yellow
$envInGit = git ls-files .env 2>$null
if ($envInGit) {
    Write-Host "  ⚠ Удаление .env из git..." -ForegroundColor Yellow
    git rm --cached .env 2>$null
    Write-Host "  ✓ .env удален из git" -ForegroundColor Green
} else {
    Write-Host "  ✓ .env не в git (безопасно)" -ForegroundColor Green
}

# 4. Добавление файлов
Write-Host "[4/7] Добавление файлов..." -ForegroundColor Yellow
git add . 2>&1 | Out-Null
$fileCount = (git status --short 2>$null | Measure-Object -Line).Lines
Write-Host "  ✓ Добавлено файлов: $fileCount" -ForegroundColor Green

# 5. Коммит
Write-Host "[5/7] Создание коммита..." -ForegroundColor Yellow
$commitMsg = "Initial commit: Smashers Backend API with Django parser, PostgreSQL, and Telegram integration"
$commitResult = git commit -m $commitMsg 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Коммит создан" -ForegroundColor Green
} else {
    if ($commitResult -match "nothing to commit") {
        Write-Host "  ℹ Нет изменений для коммита" -ForegroundColor Cyan
    } else {
        Write-Host "  ⚠ Ошибка коммита: $commitResult" -ForegroundColor Yellow
    }
}

# 6. Ветка
Write-Host "[6/7] Настройка ветки..." -ForegroundColor Yellow
git branch -M main 2>&1 | Out-Null
Write-Host "  ✓ Ветка: main" -ForegroundColor Green

# 7. Push
Write-Host "[7/7] Отправка в репозиторий..." -ForegroundColor Yellow
Write-Host "  ⚠ Может потребоваться аутентификация GitHub" -ForegroundColor Yellow
$pushResult = git push -u origin main 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Проект успешно отправлен!" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Ошибка отправки:" -ForegroundColor Red
    Write-Host $pushResult -ForegroundColor Red
    Write-Host ""
    Write-Host "Возможные причины:" -ForegroundColor Yellow
    Write-Host "  1. Требуется аутентификация GitHub" -ForegroundColor Yellow
    Write-Host "  2. Репозиторий не существует или нет доступа" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Для аутентификации используйте:" -ForegroundColor Cyan
    Write-Host "  - Personal Access Token (рекомендуется)" -ForegroundColor Cyan
    Write-Host "  - Или SSH ключ" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Готово!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
