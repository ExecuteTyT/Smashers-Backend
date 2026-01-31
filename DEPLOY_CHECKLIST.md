# Чеклист перед деплоем на сервер

## ✅ Перед отправкой в Git

### 1. Проверка безопасности

```bash
# Убедитесь, что .env НЕ в git
git status
# .env не должен появляться в списке

# Если .env попал в git, удалите его:
git rm --cached .env
git commit -m "Remove .env from git"
```

### 2. Проверка .gitignore

Убедитесь, что `.gitignore` содержит:
- `.env`
- `node_modules/`
- `logs/`
- `debug/`

### 3. Проверка .env.example

Убедитесь, что `.env.example` не содержит реальных паролей/токенов:
- Используйте placeholder значения
- Пример: `DJANGO_PASSWORD=your_password_here`

### 4. Коммит и отправка

```bash
git add .
git commit -m "Backend ready for deployment"
git push origin main  # или ваша ветка
```

---

## ✅ На сервере

### 1. Клонирование и установка

```bash
cd /opt
git clone https://github.com/your-username/smashers-backend.git
cd smashers-backend
npm install
```

### 2. Создание .env

```bash
cp .env.example .env
nano .env
```

**Важно заполнить:**
- `DATABASE_URL` - подключение к существующей базе
- `ALLOWED_ORIGINS` - домен фронтенда
- `DJANGO_URL`, `DJANGO_USERNAME`, `DJANGO_PASSWORD`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_MANAGER_CHAT_ID` (если нужно)
- `API_KEY` - надежный ключ для production

### 3. Миграции

```bash
npx prisma generate
npx prisma migrate deploy
```

### 4. Настройка Nginx + SSL

См. `docs/DEPLOY_TO_EXISTING_SERVER.md` - шаги 7-8

### 5. Запуск через PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6. Запуск парсера

```bash
npm run parse  # Заполнить базу данными
```

---

## ✅ После деплоя

- [ ] Проверить: `https://api.yourdomain.com/api/health`
- [ ] Проверить все endpoints
- [ ] Запустить парсер
- [ ] Передать URL фронтенд-разработчику
