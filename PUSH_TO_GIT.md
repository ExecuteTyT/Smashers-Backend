# Инструкция по отправке проекта в Git

## Быстрая отправка

Выполните команды в терминале PowerShell:

```powershell
cd smashers-backend

# 1. Инициализация (если еще не инициализирован)
git init

# 2. Добавление remote репозитория
git remote add origin https://github.com/ExecuteTyT/Smashers-Backend.git
# Если remote уже есть, обновите его:
# git remote set-url origin https://github.com/ExecuteTyT/Smashers-Backend.git

# 3. Проверка, что .env НЕ попадет в git
git status
# .env не должен быть в списке (благодаря .gitignore)

# 4. Добавление всех файлов
git add .

# 5. Проверка перед коммитом (опционально)
git status

# 6. Коммит
git commit -m "Initial commit: Smashers Backend API with Django parser, PostgreSQL, and Telegram integration"

# 7. Переименование ветки в main (если нужно)
git branch -M main

# 8. Отправка в репозиторий
git push -u origin main
```

## Если репозиторий уже существует на GitHub

Если репозиторий уже создан и в нем есть файлы (например, README), используйте:

```powershell
# Получить изменения с сервера
git pull origin main --allow-unrelated-histories

# Разрешить конфликты если есть, затем:
git add .
git commit -m "Initial commit: Smashers Backend API"
git push -u origin main
```

## Проверка безопасности

Перед отправкой убедитесь:

1. ✅ `.env` в `.gitignore` (уже есть)
2. ✅ `.env` не в списке `git status`
3. ✅ Нет секретов в коде (пароли, токены)

## После успешной отправки

Обновите инструкцию деплоя - там уже указан правильный URL:
`https://github.com/ExecuteTyT/Smashers-Backend.git`
