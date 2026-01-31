# Шаги развертывания на сервере

## ✅ Уже установлено:
- Node.js 18.19.1
- Nginx
- Certbot

## 🔧 Что нужно сделать:

### 1. Установить npm и PM2
```bash
# Установить npm (если не установлен)
sudo apt install -y npm

# Проверить версии
node --version
npm --version

# Установить PM2 глобально
sudo npm install -g pm2
```

### 2. Клонировать проект
```bash
cd /opt
git clone https://github.com/ExecuteTyT/Smashers-Backend.git
cd Smashers-Backend
npm install
```

### 3. Настроить .env файл
```bash
cp .env.example .env
nano .env
```

**Обязательно заполните:**
```env
NODE_ENV=production
PORT=3000

# База данных (пароль из вашей настройки PostgreSQL)
DATABASE_URL=postgresql://smashers:ВАШ_ПАРОЛЬ_БД@localhost:5432/smashers_db

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

### 4. Применить миграции Prisma
```bash
cd /opt/Smashers-Backend
npx prisma generate
npx prisma migrate deploy
```

### 5. Настроить Nginx
```bash
sudo nano /etc/nginx/sites-available/apismash.braidx.tech
```

**Вставьте:**
```nginx
server {
    listen 80;
    server_name apismash.braidx.tech;
    
    access_log /var/log/nginx/apismash-access.log;
    error_log /var/log/nginx/apismash-error.log;
    
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
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    client_max_body_size 10M;
}
```

**Активируйте:**
```bash
sudo ln -s /etc/nginx/sites-available/apismash.braidx.tech /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Получить SSL сертификат
```bash
sudo certbot --nginx -d apismash.braidx.tech
```

### 7. Запустить приложение с PM2
```bash
cd /opt/Smashers-Backend
pm2 start src/app.js --name smashers-backend
pm2 save
pm2 startup
# Выполните команду, которую покажет pm2 startup
```

### 8. Запустить парсер (заполнить БД)
```bash
cd /opt/Smashers-Backend
npm run parse
```

### 9. Проверить работу
```bash
# Проверка PM2
pm2 status
pm2 logs smashers-backend

# Проверка API
curl http://localhost:3000/api/health
curl https://apismash.braidx.tech/api/health
```

## ⚠️ Примечание о репозитории speedtest-cli
Ошибка с репозиторием speedtest-cli не критична. Можно удалить его:
```bash
sudo rm /etc/apt/sources.list.d/speedtest-cli.list 2>/dev/null
sudo apt update
```
