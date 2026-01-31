# 🚀 Быстрое развертывание на сервере

## ✅ Что уже сделано:
- Проект отправлен в GitHub: https://github.com/ExecuteTyT/Smashers-Backend
- DNS настроен: `apismash.braidx.tech` → `185.218.19.19`
- PostgreSQL база данных развернута на сервере

## 📋 Следующие шаги:

### 1. Подключитесь к серверу
```bash
ssh root@185.218.19.19
```

### 2. Установите необходимые пакеты
```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# PM2 для управления процессом
sudo npm install -g pm2

# Nginx (если еще не установлен)
sudo apt install -y nginx

# Certbot для SSL
sudo apt install -y certbot python3-certbot-nginx
```

### 3. Клонируйте проект
```bash
cd /opt
git clone https://github.com/ExecuteTyT/Smashers-Backend.git
cd Smashers-Backend
npm install
```

### 4. Настройте .env файл
```bash
cp .env.example .env
nano .env
```

**Обязательно заполните:**
```env
NODE_ENV=production
PORT=3000

# База данных (уже на сервере)
DATABASE_URL=postgresql://smashers:ВАШ_ПАРОЛЬ@localhost:5432/smashers_db

# Django Admin
DJANGO_URL=https://smashers.bookbot.olegb.dev/admin
DJANGO_USERNAME=tg:alina_romanko:19068
DJANGO_PASSWORD=LZjWr8ixthRC*AE6Lffy88Ep6Cm

# Telegram (если нужно)
TELEGRAM_BOT_TOKEN=ваш_токен
TELEGRAM_MANAGER_CHAT_ID=ваш_chat_id

# CORS - домены фронтенда
ALLOWED_ORIGINS=https://braidx.tech,https://www.braidx.tech,https://smashers.bookbot.olegb.dev

# Парсер
PARSE_INTERVAL_HOURS=24
ENABLE_JOBS=true
```

### 5. Примените миграции Prisma
```bash
npx prisma generate
npx prisma migrate deploy
```

### 6. Настройте Nginx
```bash
sudo nano /etc/nginx/sites-available/apismash.braidx.tech
```

**Содержимое файла:**
```nginx
server {
    listen 80;
    server_name apismash.braidx.tech;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Активируйте конфигурацию:**
```bash
sudo ln -s /etc/nginx/sites-available/apismash.braidx.tech /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Получите SSL сертификат
```bash
sudo certbot --nginx -d apismash.braidx.tech
```

### 8. Запустите приложение с PM2
```bash
cd /opt/Smashers-Backend
pm2 start src/app.js --name smashers-backend
pm2 save
pm2 startup
```

### 9. Проверьте работу
```bash
# Проверка PM2
pm2 status
pm2 logs smashers-backend

# Проверка API
curl http://localhost:3000/api/health
curl https://apismash.braidx.tech/api/health
```

## 📚 Подробная документация:
- `docs/DEPLOY_FOR_BRAIDX.md` - полная инструкция
- `docs/DEPLOYMENT_GUIDE.md` - общее руководство по развертыванию

## ⚠️ Важно:
1. Убедитесь, что DNS запись распространилась (может занять 5-30 минут)
2. Проверьте пароль базы данных в `.env`
3. После запуска парсер автоматически начнет работать по расписанию

## 🔍 Проверка DNS:
```bash
dig apismash.braidx.tech
# или
nslookup apismash.braidx.tech
```
