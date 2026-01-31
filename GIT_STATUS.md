# Статус отправки в Git

## Выполненные команды

Я выполнил следующие команды:

1. ✅ `git init` - инициализация репозитория
2. ✅ `git remote add origin https://github.com/ExecuteTyT/Smashers-Backend.git` - добавление remote
3. ✅ `git add .` - добавление всех файлов
4. ✅ `git commit` - создание коммита
5. ✅ `git branch -M main` - переименование ветки в main
6. ⚠️ `git push` - отправка (может потребоваться аутентификация)

## Проверка статуса

Выполните в терминале:

```powershell
cd smashers-backend
git status
git remote -v
git log --oneline -1
```

## Если push не прошел

Если `git push` требует аутентификации, выполните вручную:

```powershell
cd smashers-backend
git push -u origin main
```

GitHub попросит:
- **Username**: ваш GitHub username
- **Password**: Personal Access Token (НЕ пароль от аккаунта!)

### Создание Personal Access Token

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token (classic)
3. Выберите scope: `repo` (полный доступ к репозиториям)
4. Скопируйте токен и используйте его как пароль

## Альтернатива: SSH

Если настроен SSH ключ:

```powershell
git remote set-url origin git@github.com:ExecuteTyT/Smashers-Backend.git
git push -u origin main
```

## После успешной отправки

На сервере можно будет клонировать:

```bash
git clone https://github.com/ExecuteTyT/Smashers-Backend.git
```
