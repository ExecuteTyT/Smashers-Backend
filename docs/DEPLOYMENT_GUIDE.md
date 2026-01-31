# Руководство по деплою бэкенда

## Нужен ли домен для бэкенда?

**Да, домен нужен**, если фронтенд работает на другом домене или в продакшене. Вот почему:

### ✅ Преимущества использования домена:

1. **CORS настройки** - фронтенд может обращаться к API с любого домена
2. **HTTPS** - безопасная передача данных
3. **Стабильность** - домен не меняется при перезапуске сервера
4. **Профессиональный вид** - `api.yourdomain.com` выглядит лучше чем IP-адрес

### ⚠️ Альтернативы:

- **Поддомен**: `api.yourdomain.com` (рекомендуется)
- **Отдельный домен**: `backend-api.com` (если основной домен занят)
- **IP-адрес**: Можно использовать, но не рекомендуется для продакшена

---

## Пошаговая инструкция по деплою

### Шаг 1: Подготовка сервера

1. **Выберите хостинг:**
   - VPS (DigitalOcean, Hetzner, AWS, etc.)
   - Минимальные требования: 1 CPU, 1GB RAM, 20GB SSD
   - Рекомендуется: Ubuntu 22.04 LTS

2. **Подключитесь к серверу:**
   ```bash
   ssh root@your-server-ip
   ```

3. **Установите необходимые пакеты:**
   ```bash
   # Обновление системы
   sudo apt update && sudo apt upgrade -y
   
   # Node.js 18+ (через NodeSource)
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # Проверка версии
   node --version  # Должно быть v18.x или выше
   npm --version
   
   # PM2 для управления процессом
   sudo npm install -g pm2
   
   # Nginx для reverse proxy
   sudo apt install -y nginx
   
   # Certbot для SSL
   sudo apt install -g certbot python3-certbot-nginx
   ```

### Шаг 2: Настройка домена

1. **Купите домен** (если еще нет):
   - Например: `yourdomain.com`
   - Или используйте поддомен: `api.yourdomain.com`

2. **Настройте DNS записи:**
   ```
   Тип: A
   Имя: api (или @ для основного домена)
   Значение: IP-адрес вашего сервера
   TTL: 3600
   ```

3. **Дождитесь распространения DNS** (обычно 5-30 минут):
   ```bash
   # Проверка DNS
   dig api.yourdomain.com
   # или
   nslookup api.yourdomain.com
   ```

### Шаг 3: Загрузка проекта на сервер

1. **Клонируйте репозиторий:**
   ```bash
   cd /opt
   git clone https://github.com/ExecuteTyT/Smashers-Backend.git
   cd smashers-backend
   ```

   Или загрузите через SCP:
   ```bash
   # С локальной машины
   scp -r smashers-backend root@your-server-ip:/opt/
   ```

2. **Установите зависимости:**
   ```bash
   cd /opt/smashers-backend
   npm install
   ```

3. **Настройте переменные окружения:**
   ```bash
   cp .env.example .env
   nano .env
   ```

   Заполните все необходимые переменные:
   ```env
   # Server
   NODE_ENV=production
   PORT=3000
   
   # Database (уже настроена на сервере)
   DATABASE_URL=postgresql://smashers:your_password@localhost:5432/smashers_db
   
   # Django Admin (для парсера)
   DJANGO_URL=https://smashers.bookbot.olegb.dev/admin
   DJANGO_USERNAME=your_username
   DJANGO_PASSWORD=your_password
   
   # Telegram
   TELEGRAM_BOT_TOKEN=your_bot_token
   TELEGRAM_MANAGER_CHAT_ID=your_chat_id
   
   # CORS (важно для фронтенда!)
   ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   
   # API Key (для админских эндпоинтов)
   API_KEY=your_secure_api_key_here
   ```

4. **Примените миграции базы данных:**
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

### Шаг 4: Настройка Nginx

1. **Создайте конфигурацию Nginx:**
   ```bash
   sudo nano /etc/nginx/sites-available/smashers-api
   ```

2. **Вставьте конфигурацию:**
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;  # Замените на ваш домен
       
       # Логи
       access_log /var/log/nginx/smashers-api-access.log;
       error_log /var/log/nginx/smashers-api-error.log;
       
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

3. **Активируйте конфигурацию:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/smashers-api /etc/nginx/sites-enabled/
   sudo nginx -t  # Проверка конфигурации
   sudo systemctl reload nginx
   ```

### Шаг 5: Настройка SSL (HTTPS)

1. **Получите SSL сертификат:**
   ```bash
   sudo certbot --nginx -d api.yourdomain.com
   ```

2. **Автоматическое обновление сертификата:**
   ```bash
   # Certbot автоматически настроит cron для обновления
   sudo certbot renew --dry-run  # Тест обновления
   ```

### Шаг 6: Запуск приложения через PM2

1. **Создайте PM2 конфигурацию:**
   ```bash
   cd /opt/smashers-backend
   nano ecosystem.config.js
   ```

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

2. **Запустите приложение:**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save  # Сохранить конфигурацию
   pm2 startup  # Автозапуск при перезагрузке сервера
   ```

3. **Проверьте статус:**
   ```bash
   pm2 status
   pm2 logs smashers-backend
   ```

### Шаг 7: Настройка файрвола

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

### Шаг 8: Проверка работы

1. **Проверьте health endpoint:**
   ```bash
   curl https://api.yourdomain.com/api/health
   ```

2. **Проверьте в браузере:**
   - Откройте: `https://api.yourdomain.com/api/health`
   - Должен вернуться: `{"status":"ok"}`

3. **Проверьте Swagger документацию:**
   - Откройте: `https://api.yourdomain.com/api-docs`

---

## Обновление приложения

### Обновление кода:

```bash
cd /opt/smashers-backend
git pull origin main  # или ваша ветка
npm install
npx prisma generate
npx prisma migrate deploy
pm2 restart smashers-backend
```

### Обновление переменных окружения:

```bash
nano .env
# Внесите изменения
pm2 restart smashers-backend
```

---

## Мониторинг и логи

### PM2 команды:

```bash
pm2 status              # Статус приложения
pm2 logs smashers-backend  # Просмотр логов
pm2 monit               # Мониторинг в реальном времени
pm2 restart smashers-backend  # Перезапуск
pm2 stop smashers-backend     # Остановка
```

### Логи приложения:

```bash
# Логи приложения
tail -f /opt/smashers-backend/logs/app-*.log

# Логи ошибок
tail -f /opt/smashers-backend/logs/error-*.log

# Логи Nginx
sudo tail -f /var/log/nginx/smashers-api-access.log
sudo tail -f /var/log/nginx/smashers-api-error.log
```

---

## Настройка CORS для фронтенда

**Важно:** После деплоя обновите `ALLOWED_ORIGINS` в `.env`:

```env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://your-frontend-domain.com
```

И перезапустите приложение:
```bash
pm2 restart smashers-backend
```

---

## Резервное копирование

### База данных PostgreSQL:

```bash
# Создать бэкап
pg_dump -U smashers -d smashers_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановить из бэкапа
psql -U smashers -d smashers_db < backup_20240131_120000.sql
```

### Автоматическое резервное копирование (cron):

```bash
# Добавить в crontab
crontab -e

# Бэкап каждый день в 2:00
0 2 * * * pg_dump -U smashers -d smashers_db > /opt/backups/smashers_db_$(date +\%Y\%m\%d).sql
```

---

## Troubleshooting

### Приложение не запускается:

1. Проверьте логи: `pm2 logs smashers-backend`
2. Проверьте переменные окружения: `cat .env`
3. Проверьте подключение к БД: `npx prisma db pull`

### Nginx возвращает 502 Bad Gateway:

1. Проверьте, запущено ли приложение: `pm2 status`
2. Проверьте порт: `netstat -tulpn | grep 3000`
3. Проверьте логи Nginx: `sudo tail -f /var/log/nginx/error.log`

### SSL сертификат не работает:

1. Проверьте DNS: `dig api.yourdomain.com`
2. Проверьте конфигурацию Nginx: `sudo nginx -t`
3. Перевыпустите сертификат: `sudo certbot --nginx -d api.yourdomain.com --force-renewal`

---

## Следующие шаги после деплоя

1. ✅ Обновите `ALLOWED_ORIGINS` в `.env` с доменом фронтенда
2. ✅ Настройте мониторинг (опционально: Sentry, DataDog, etc.)
3. ✅ Настройте автоматические бэкапы БД
4. ✅ Протестируйте все API endpoints
5. ✅ Передайте URL API фронтенд-разработчику: `https://api.yourdomain.com/api`

---

## Контакты и поддержка

Если возникли проблемы при деплое, проверьте:
- Логи приложения: `pm2 logs`
- Логи Nginx: `/var/log/nginx/`
- Статус сервисов: `systemctl status nginx`, `pm2 status`
