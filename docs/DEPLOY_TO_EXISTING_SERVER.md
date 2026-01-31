# Деплой бэкенда на существующий сервер с базой данных

## План действий

### Шаг 1: Подготовка кода перед отправкой в Git

#### 1.1. Проверьте `.gitignore`

Убедитесь, что `.gitignore` содержит:

```
.env
.env.local
node_modules/
logs/
*.log
.DS_Store
debug/
```

#### 1.2. Проверьте, что `.env` НЕ в Git

```bash
# Проверка (должно показать "nothing to commit" или не показывать .env)
git status

# Если .env попал в git, удалите его:
git rm --cached .env
```

#### 1.3. Создайте `.env.example` (если еще нет)

Файл `.env.example` должен быть в репозитории - это шаблон для других разработчиков.

#### 1.4. Проверьте, что нет секретов в коде

Убедитесь, что в коде нет:
- Паролей
- API ключей
- Токенов
- Личных данных

### Шаг 2: Отправка в Git

```bash
# Добавить все файлы (кроме .env - он в .gitignore)
git add .

# Коммит
git commit -m "Backend ready for deployment"

# Отправить в репозиторий
git push origin main  # или ваша ветка
```

### Шаг 3: Подготовка сервера

#### 3.1. Подключитесь к серверу

```bash
ssh user@your-server-ip
```

#### 3.2. Установите необходимые пакеты

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Node.js 18+ (если еще не установлен)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# PM2 для управления процессом
sudo npm install -g pm2

# Nginx (если еще не установлен)
sudo apt install -y nginx

# Certbot для SSL
sudo apt install -y certbot python3-certbot-nginx
```

### Шаг 4: Клонирование проекта на сервер

```bash
# Перейдите в рабочую директорию
cd /opt  # или /var/www, или другая директория

# Клонируйте репозиторий
git clone https://github.com/ExecuteTyT/Smashers-Backend.git
cd smashers-backend

# Установите зависимости
npm install
```

### Шаг 5: Настройка переменных окружения на сервере

```bash
# Создайте .env файл
cp .env.example .env
nano .env
```

**Важно:** Заполните все переменные:

```env
# Server
NODE_ENV=production
PORT=3000
API_KEY=your_secure_production_api_key_here

# Database (уже настроена на сервере)
DATABASE_URL=postgresql://smashers:password@localhost:5432/smashers_db
# Или если база на том же сервере:
# DATABASE_URL=postgresql://smashers:password@185.218.19.19:5432/smashers_db

# Django Admin
DJANGO_URL=https://smashers.bookbot.olegb.dev/admin
DJANGO_USERNAME=your_username
DJANGO_PASSWORD=your_password

# Telegram (если нужно)
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_MANAGER_CHAT_ID=your_chat_id

# CORS - ВАЖНО! Укажите домен фронтенда
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Google Sheets (опционально, можно оставить пустым)
GOOGLE_SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=

# Parser (для автоматического парсинга)
PARSE_INTERVAL_HOURS=24
ENABLE_JOBS=true
```

### Шаг 6: Применение миграций базы данных

```bash
cd /opt/smashers-backend

# Генерация Prisma Client
npx prisma generate

# Применение миграций
npx prisma migrate deploy
```

### Шаг 7: Настройка Nginx

#### 7.1. Создайте конфигурацию

```bash
sudo nano /etc/nginx/sites-available/smashers-api
```

#### 7.2. Вставьте конфигурацию:

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

#### 7.3. Активируйте конфигурацию

```bash
sudo ln -s /etc/nginx/sites-available/smashers-api /etc/nginx/sites-enabled/
sudo nginx -t  # Проверка конфигурации
sudo systemctl reload nginx
```

### Шаг 8: Получение SSL сертификата

```bash
# Получить SSL сертификат (Certbot автоматически настроит Nginx)
sudo certbot --nginx -d api.yourdomain.com

# Автоматическое обновление сертификата
sudo certbot renew --dry-run  # Тест
```

### Шаг 9: Запуск приложения через PM2

#### 9.1. Создайте PM2 конфигурацию

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

#### 9.2. Запустите приложение

```bash
pm2 start ecosystem.config.js
pm2 save  # Сохранить конфигурацию
pm2 startup  # Автозапуск при перезагрузке сервера
```

#### 9.3. Проверьте статус

```bash
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

### Шаг 11: Проверка работы

```bash
# Health check
curl https://api.yourdomain.com/api/health

# Должен вернуться: {"status":"ok"}
```

### Шаг 12: Запуск парсера (опционально)

Если нужно сразу заполнить базу данных:

```bash
cd /opt/smashers-backend
npm run parse
```

Или включить автоматический парсинг (уже включен, если `ENABLE_JOBS=true` в `.env`).

---

## Обновление приложения в будущем

```bash
# На сервере
cd /opt/smashers-backend
git pull origin main
npm install
npx prisma generate
npx prisma migrate deploy
pm2 restart smashers-backend
```

---

## Важные моменты

### ✅ Перед отправкой в Git:

1. ✅ Проверьте `.gitignore` - `.env` должен быть в списке
2. ✅ Убедитесь, что нет секретов в коде
3. ✅ `.env.example` должен быть актуальным

### ✅ На сервере:

1. ✅ Создайте `.env` с production значениями
2. ✅ Укажите правильный `DATABASE_URL` (база уже на сервере)
3. ✅ Укажите `ALLOWED_ORIGINS` с доменом фронтенда
4. ✅ Настройте домен и SSL
5. ✅ Запустите через PM2 для автозапуска

### ✅ После деплоя:

1. ✅ Проверьте все endpoints
2. ✅ Запустите парсер: `npm run parse`
3. ✅ Передайте URL API фронтенд-разработчику: `https://api.yourdomain.com/api`

---

## Troubleshooting

### Проблема: Не могу подключиться к базе данных

**Решение:**
- Проверьте `DATABASE_URL` в `.env`
- Если база на другом сервере, убедитесь что порт 5432 открыт
- Проверьте доступность: `telnet your-db-server-ip 5432`

### Проблема: CORS ошибки

**Решение:**
- Проверьте `ALLOWED_ORIGINS` в `.env`
- Добавьте домен фронтенда
- Перезапустите: `pm2 restart smashers-backend`

### Проблема: SSL не работает

**Решение:**
- Проверьте DNS: `dig api.yourdomain.com`
- Перевыпустите сертификат: `sudo certbot --nginx -d api.yourdomain.com --force-renewal`

---

## Чеклист перед отправкой заказчику

- [ ] Код в Git репозитории
- [ ] `.env` НЕ в Git (проверено через `git status`)
- [ ] `.env.example` актуален
- [ ] Нет секретов в коде
- [ ] Документация обновлена
- [ ] Бэкенд задеплоен на сервер
- [ ] Домен настроен и SSL работает
- [ ] API доступен: `https://api.yourdomain.com/api/health`
- [ ] Парсер запущен и данные в базе
- [ ] CORS настроен для фронтенда
- [ ] PM2 настроен для автозапуска
- [ ] Логи работают

---

## Передача заказчику

После деплоя передайте заказчику:

1. **URL API: `https://api.yourdomain.com/api`**
2. **Документацию:** `docs/FRONTEND_API_INTEGRATION.md`
3. **Доступы к серверу** (если нужно)
4. **Инструкции по обновлению** (см. раздел "Обновление приложения")
