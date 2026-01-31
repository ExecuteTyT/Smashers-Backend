# Скрипт для отправки проекта в Git репозиторий
# https://github.com/ExecuteTyT/Smashers-Backend

Write-Host "🚀 Отправка проекта в Git..." -ForegroundColor Green

# Переход в директорию проекта
Set-Location $PSScriptRoot

# Проверка .gitignore
Write-Host "`n📋 Проверка .gitignore..." -ForegroundColor Yellow
if (Test-Path .gitignore) {
    $gitignoreContent = Get-Content .gitignore -Raw
    if ($gitignoreContent -match "\.env") {
        Write-Host "✅ .env в .gitignore - OK" -ForegroundColor Green
    } else {
        Write-Host "⚠️  .env НЕ найден в .gitignore!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ .gitignore не найден!" -ForegroundColor Red
    exit 1
}

# Инициализация Git (если нужно)
if (-not (Test-Path .git)) {
    Write-Host "`n🔧 Инициализация Git репозитория..." -ForegroundColor Yellow
    git init
}

# Добавление remote
Write-Host "`n🔗 Настройка remote репозитория..." -ForegroundColor Yellow
$remoteUrl = "https://github.com/ExecuteTyT/Smashers-Backend.git"
$existingRemote = git remote get-url origin 2>$null

if ($existingRemote) {
    if ($existingRemote -ne $remoteUrl) {
        Write-Host "Обновление remote URL..." -ForegroundColor Yellow
        git remote set-url origin $remoteUrl
    } else {
        Write-Host "✅ Remote уже настроен правильно" -ForegroundColor Green
    }
} else {
    git remote add origin $remoteUrl
    Write-Host "✅ Remote добавлен" -ForegroundColor Green
}

# Проверка .env
Write-Host "`n🔒 Проверка безопасности..." -ForegroundColor Yellow
$envInGit = git ls-files .env 2>$null
if ($envInGit) {
    Write-Host "❌ ОШИБКА: .env найден в git! Удаляю..." -ForegroundColor Red
    git rm --cached .env
    Write-Host "✅ .env удален из git" -ForegroundColor Green
} else {
    Write-Host "✅ .env не в git - безопасно" -ForegroundColor Green
}

# Добавление файлов
Write-Host "`n📦 Добавление файлов..." -ForegroundColor Yellow
git add .

# Проверка статуса
Write-Host "`n📊 Статус репозитория:" -ForegroundColor Yellow
git status --short | Select-Object -First 10

# Коммит
Write-Host "`n💾 Создание коммита..." -ForegroundColor Yellow
$commitMessage = "Initial commit: Smashers Backend API with Django parser, PostgreSQL, and Telegram integration"
git commit -m $commitMessage

# Переименование ветки
Write-Host "`n🌿 Настройка ветки..." -ForegroundColor Yellow
git branch -M main

# Отправка
Write-Host "`n📤 Отправка в репозиторий..." -ForegroundColor Yellow
Write-Host "⚠️  Может потребоваться аутентификация GitHub" -ForegroundColor Yellow
git push -u origin main

Write-Host "`n✅ Готово! Проект отправлен в https://github.com/ExecuteTyT/Smashers-Backend" -ForegroundColor Green
