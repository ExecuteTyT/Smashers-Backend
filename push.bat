@echo off
cd /d C:\Files\Development\VS\Smashers\smashers-backend

echo [1/6] Настройка Git user...
git config user.email "smashers-backend@braidx.tech"
git config user.name "Smashers Backend"

echo [2/6] Инициализация Git...
if not exist .git git init

echo [3/6] Настройка remote...
git remote remove origin 2>nul
git remote add origin https://github.com/ExecuteTyT/Smashers-Backend.git

echo [4/6] Добавление файлов...
git add .

echo [5/6] Создание коммита...
git commit -m "Initial commit: Smashers Backend API with Django parser, PostgreSQL, and Telegram integration"

echo [6/6] Настройка ветки и отправка...
git branch -M main
echo.
echo Отправка в GitHub (может потребоваться аутентификация)...
git push -u origin main

echo.
echo Готово!
pause
