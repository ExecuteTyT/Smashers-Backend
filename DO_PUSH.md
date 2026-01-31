# Инструкция по отправке проекта в Git

## Автоматический способ (рекомендуется)

Выполните в PowerShell:

```powershell
cd C:\Files\Development\VS\Smashers\smashers-backend
.\final-push.ps1
```

Или запустите `push.bat` двойным кликом.

## Ручной способ

Выполните команды по порядку:

```powershell
cd C:\Files\Development\VS\Smashers\smashers-backend

# 1. Настройка Git
git config user.email "smashers-backend@braidx.tech"
git config user.name "Smashers Backend"

# 2. Инициализация (если нужно)
git init

# 3. Remote
git remote remove origin 2>$null
git remote add origin https://github.com/ExecuteTyT/Smashers-Backend.git

# 4. Добавление файлов
git add .

# 5. Коммит
git commit -m "Initial commit: Smashers Backend API with Django parser, PostgreSQL, and Telegram integration"

# 6. Ветка
git branch -M main

# 7. Push (потребуется аутентификация)
git push -u origin main
```

## Аутентификация GitHub

При выполнении `git push` будет запрошена аутентификация:

1. **Username**: ваш GitHub username (например, `ExecuteTyT`)
2. **Password**: **НЕ ваш пароль**, а **Personal Access Token**

### Как получить Personal Access Token:

1. Зайдите на GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Нажмите "Generate new token (classic)"
3. Выберите scope: `repo` (полный доступ к репозиториям)
4. Скопируйте токен (он показывается только один раз!)
5. Используйте этот токен как пароль при `git push`

## Альтернатива: SSH ключ

Если настроен SSH ключ для GitHub, можно использовать SSH URL:

```powershell
git remote set-url origin git@github.com:ExecuteTyT/Smashers-Backend.git
git push -u origin main
```

## Проверка

После успешного push проверьте:
- https://github.com/ExecuteTyT/Smashers-Backend
