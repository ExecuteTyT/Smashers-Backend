# Деплой на apismash.braidx.tech

## DNS настроен ✅

Вы создали DNS запись:
- **Домен:** `apismash.braidx.tech`
- **Тип:** A
- **Значение:** `185.218.19.19`

Подождите 5-30 минут для распространения DNS, затем проверьте:
```bash
dig apismash.braidx.tech
# или
nslookup apismash.braidx.tech
```

---

## Пошаговая инструкция

### Шаг 1: Подключение к серверу

```bash
ssh root@185.218.19.19
```

### Шаг 2: Установка необходимых пакетов

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Node.js 18+ (если еще не установлен)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Проверка версии
node --version  # Должно быть v18.x или выше

# PM2 для управления процессом
sudo npm install -g pm2

# Nginx (если еще не установлен)
sudo apt install -y nginx

# Certbot для SSL
sudo apt install -y certbot python3-certbot-nginx
```

### Шаг 3: Клонирование проекта

```bash
cd /opt
git clone https://github.com/ExecuteTyT/Smashers-Backend.git
cd smashers-backend
npm install
```

### Шаг 4: Настройка .env

```bash
cp .env.example .env
nano .env
```

**Заполните обязательно:**

```env
# Server
NODE_ENV=production
PORT=3000
API_KEY=your_secure_production_api_key_here

# Database (база уже на этом сервере)
DATABASE_URL=postgresql://smashers:smashers&2026@localhost:5432/smashers_db
# Или если база на другом порту/хосте:
# DATABASE_URL=postgresql://smashers:smashers&2026@185.218.19.19:5432/smashers_db

# Django Admin
DJANGO_URL=https://smashers.bookbot.olegb.dev/admin
DJANGO_USERNAME=tg:alina_romanko:19068
DJANGO_PASSWORD=LZjWr8ixthRC*AE6Lffy88Ep6Cm

# Telegram (если нужно)
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_MANAGER_CHAT_ID=your_chat_id

# CORS - ВАЖНО! Укажите домен фронтенда
ALLOWED_ORIGINS=https://braidx.tech,https://www.braidx.tech,https://smashers.bookbot.olegb.dev

# Google Sheets (можно оставить пустым)
GOOGLE_SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=

# Parser (для автоматического парсинга)
PARSE_INTERVAL_HOURS=24
ENABLE_JOBS=true
```

### Шаг 5: Применение миграций

```bash
npx prisma generate
npx prisma migrate deploy
```

### Шаг 6: Настройка Nginx

```bash
sudo nano /etc/nginx/sites-available/apismash
```

**Вставьте конфигурацию:**

```nginx
server {
    listen 80;
    server_name apismash.braidx.tech;
    
    # Логи
    access_log /var/log/nginx/apismash-access.log;
    error_log /var/log/nginx/apismash-error.log;
    
    # Проксирование на Node.js приложение
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
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Максимальный размер загружаемых файлов
    client_max_body_size 10M;
}
```

**Активируйте:**

```bash
sudo ln -s /etc/nginx/sites-available/apismash /etc/nginx/sites-enabled/
sudo nginx -t  # Проверка конфигурации
sudo systemctl reload nginx
```

### Шаг 7: Получение SSL сертификата

```bash
# Получить SSL сертификат
sudo certbot --nginx -d apismash.braidx.tech

# Certbot автоматически:
# 1. Получит сертификат
# 2. Настроит Nginx для HTTPS
# 3. Настроит автоматическое обновление
```

### Шаг 8: Создание PM2 конфигурации

```bash
cd /opt/smashers-backend
nano ecosystem.config.js
```

**Создайте файл:**

```javascript
module.exports = {
  apps: [{
    name: 'smashers-backend',
    script: './src/app.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '500M',
    watch: false
  }]
};
```

### Шаг 9: Запуск приложения

```bash
# Запуск
pm2 start ecosystem.config.js

# Сохранить конфигурацию
pm2 save

# Автозапуск при перезагрузке сервера
pm2 startup
# Выполните команду, которую покажет pm2 startup

# Проверка статуса
pm2 status
pm2 logs smashers-backend
```

### Шаг 10: Настройка файрвола

```bash
# Разрешить HTTP и HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Разрешить SSH (если еще не разрешено)
sudo ufw allow 22/tcp

# Включить файрвол
sudo ufw enable
sudo ufw status
```

### Шаг 11: Запуск парсера (заполнение БД)

```bash
cd /opt/smashers-backend
npm run parse
```

Это заполнит базу данных категориями, локациями, абонементами и тренировками.

---

## Проверка работы

### 1. Проверка DNS (должно показать ваш IP)

```bash
dig apismash.braidx.tech
# Должно показать: 185.218.19.19
```

### 2. Проверка HTTP

```bash
curl http://apismash.braidx.tech/api/health
# Должен вернуться: {"status":"ok"}
```

### 3. Проверка HTTPS (после SSL)

```bash
curl https://apismash.braidx.tech/api/health
# Должен вернуться: {"status":"ok"}
```

### 4. Проверка в браузере

Откройте:
- Health: https://apismash.braidx.tech/api/health
- Абонементы: https://apismash.braidx.tech/api/memberships
- API docs: https://apismash.braidx.tech/api-docs

---

## Настройка CORS для фронтенда

После деплоя обновите `ALLOWED_ORIGINS` в `.env`:

```env
ALLOWED_ORIGINS=https://braidx.tech,https://www.braidx.tech,https://smashers.bookbot.olegb.dev
```

И перезапустите:
```bash
pm2 restart smashers-backend
```

---

## URL для фронтенда

После успешного деплоя передайте фронтенд-разработчику:

**Базовый URL API:**
```
https://apismash.braidx.tech/api
```

**Примеры endpoints:**
- Health: `https://apismash.braidx.tech/api/health`
- Абонементы: `https://apismash.braidx.tech/api/memberships`
- Локации: `https://apismash.braidx.tech/api/locations`
- Тренировки: `https://apismash.braidx.tech/api/sessions`
- Отправка заявки: `POST https://apismash.braidx.tech/api/booking`

---

## Обновление приложения в будущем

```bash
cd /opt/smashers-backend
git pull origin main
npm install
npx prisma generate
npx prisma migrate deploy
pm2 restart smashers-backend
```

---

## Troubleshooting

### DNS не резолвится

```bash
# Проверка DNS
dig apismash.braidx.tech
nslookup apismash.braidx.tech

# Если не работает - подождите еще 10-15 минут
```

### Nginx возвращает 502

```bash
# Проверьте, запущено ли приложение
pm2 status

# Проверьте логи
pm2 logs smashers-backend
sudo tail -f /var/log/nginx/error.log
```

### SSL не работает

```bash
# Проверьте конфигурацию Nginx
sudo nginx -t

# Перевыпустите сертификат
sudo certbot --nginx -d apismash.braidx.tech --force-renewal
```

---

## Чеклист

- [ ] DNS запись создана и резолвится
- [ ] Node.js и PM2 установлены
- [ ] Nginx установлен и настроен
- [ ] Проект клонирован и зависимости установлены
- [ ] `.env` создан с production значениями
- [ ] Миграции применены
- [ ] Nginx конфигурация создана и активирована
- [ ] SSL сертификат получен
- [ ] Приложение запущено через PM2
- [ ] Файрвол настроен
- [ ] Парсер запущен (база заполнена)
- [ ] Health endpoint работает
- [ ] CORS настроен для фронтенда

---

## Готово! 🎉

После выполнения всех шагов ваш API будет доступен по адресу:
**https://apismash.braidx.tech/api**
