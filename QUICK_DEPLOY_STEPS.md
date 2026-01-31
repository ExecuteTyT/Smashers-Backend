# Быстрая инструкция по деплою

## План действий

### 1️⃣ Подготовка перед Git (5 минут)

```bash
# Проверьте, что .env не в git
git status
# Если .env в списке - удалите: git rm --cached .env

# Добавьте все файлы
git add .

# Коммит
git commit -m "Backend ready for deployment"

# Отправка в репозиторий
git push origin main
```

### 2️⃣ На сервере - установка (10 минут)

```bash
# Подключитесь к серверу
ssh user@your-server-ip

# Установите Node.js и PM2 (если еще не установлены)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# Установите Nginx и Certbot (если еще не установлены)
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 3️⃣ Клонирование проекта (2 минуты)

```bash
cd /opt
git clone https://github.com/your-username/smashers-backend.git
cd smashers-backend
npm install
```

### 4️⃣ Настройка .env (5 минут)

```bash
cp .env.example .env
nano .env
```

**Заполните обязательно:**
- `DATABASE_URL` - подключение к вашей базе (185.218.19.19)
- `ALLOWED_ORIGINS` - домен фронтенда
- `DJANGO_URL`, `DJANGO_USERNAME`, `DJANGO_PASSWORD`
- `NODE_ENV=production`
- `ENABLE_JOBS=true` (для автоматического парсинга)

### 5️⃣ Миграции БД (1 минута)

```bash
npx prisma generate
npx prisma migrate deploy
```

### 6️⃣ Настройка Nginx (5 минут)

```bash
sudo nano /etc/nginx/sites-available/smashers-api
```

Вставьте (замените `api.yourdomain.com` на ваш домен):

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Активируйте:
```bash
sudo ln -s /etc/nginx/sites-available/smashers-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7️⃣ SSL сертификат (2 минуты)

```bash
sudo certbot --nginx -d api.yourdomain.com
```

### 8️⃣ Запуск приложения (2 минуты)

```bash
# Создайте ecosystem.config.js (см. DEPLOY_TO_EXISTING_SERVER.md)
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 9️⃣ Запуск парсера (опционально)

```bash
npm run parse  # Заполнить базу данными
```

### ✅ Проверка

```bash
curl https://api.yourdomain.com/api/health
# Должен вернуться: {"status":"ok"}
```

---

## Итого: ~30 минут на деплой

**После деплоя передайте заказчику:**
- URL API: `https://api.yourdomain.com/api`
- Документацию: `docs/FRONTEND_API_INTEGRATION.md`

---

## Обновление в будущем

```bash
cd /opt/smashers-backend
git pull
npm install
npx prisma generate
npx prisma migrate deploy
pm2 restart smashers-backend
```
