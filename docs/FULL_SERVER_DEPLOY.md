# Полная инструкция: от пустого сервера до деплоя Smashers (фронт + бэкенд)

**Сервер:** 168.222.193.155  
**Домен:** smashersbc.ru (Reg.ru, TTL 3600)  
**Стек:** Ubuntu, Node.js, PostgreSQL, Nginx, PM2, Certbot

---

## Оглавление

1. [Подключение и первичная настройка сервера](#1-подключение-и-первичная-настройка-сервера)
2. [Установка ПО](#2-установка-по)
3. [PostgreSQL: база данных](#3-postgresql-база-данных)
4. [Бэкенд: деплой](#4-бэкенд-деплой)
5. [Фронтенд: деплой](#5-фронтенд-деплой)
6. [Nginx: раздача по IP (проверка)](#6-nginx-раздача-по-ip-проверка)
7. [Проверка по IP](#7-проверка-по-ip)
8. [Reg.ru: смена A-записи](#8-regru-смена-a-записи)
9. [Nginx + SSL для домена](#9-nginx--ssl-для-домена)
10. [Финальная проверка и поддержка](#10-финальная-проверка-и-поддержка) (в т.ч. [10.6 — SSH и отключение root](#106-настройка-ssh-и-отключение-root-в-конце))

---

## 1. Подключение и первичная настройка сервера

### 1.1. Подключение по SSH

Используйте логин и ключ/пароль от хостинга (часто `root`):

```bash
ssh root@168.222.193.155
```

### 1.2. Обновление системы

```bash
apt update && apt upgrade -y
```

### 1.3. Создание пользователя (рекомендуется не работать под root)

```bash
adduser deploy
usermod -aG sudo deploy
# Установите пароль по запросу
```

**Можно ли продолжать под root?** Да. SSH для `deploy` можно настроить в конце (см. [раздел 10.6](#106-настройка-ssh-и-отключение-root-в-конце)). Сейчас спокойно работайте под root и выполняйте команды без `sudo`; когда дойдёте до 10.6 — настроите ключ для `deploy` и при желании отключите вход по SSH под root.

Передать доступ по SSH своему ключу (сделать когда будете готовы ограничить доступ):

```bash
# На своей машине (PowerShell / WSL):
# type $env:USERPROFILE\.ssh\id_rsa.pub
# Скопируйте вывод и на сервере выполните:
```

На сервере под root:

```bash
mkdir -p /home/deploy/.ssh
nano /home/deploy/.ssh/authorized_keys
# Вставьте одну строку с содержимым id_rsa.pub, сохраните (Ctrl+O, Enter, Ctrl+X)
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

Дальше можно подключаться так: `ssh deploy@168.222.193.155`. Все команды ниже можно выполнять под `deploy` с `sudo` где нужно.

### 1.4. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

### 1.5. Часовой пояс (опционально)

```bash
sudo timedatectl set-timezone Europe/Moscow
```

---

## 2. Установка ПО

### 2.1. Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x
npm -v
```

### 2.2. Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2.3. PostgreSQL 15

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### 2.4. PM2 (глобально)

```bash
sudo npm install -g pm2
```

### 2.5. Git

```bash
sudo apt install -y git
```

### 2.6. Certbot (SSL)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2.7. Зависимости для Puppeteer (бэкенд использует парсер с Chrome)

В современных Ubuntu пакет `chromium-browser` ставится через snap и часто падает с ошибкой (408, snap store). **Chromium не ставим пакетом** — Puppeteer при `npm install` скачивает свой бинарник; нужны только системные библиотеки.

**Если ранее пробовали ставить chromium-browser и получили ошибку**, сначала приведите apt в порядок:

```bash
sudo apt --fix-broken install
# или, если предложит: sudo dpkg --remove --force-remove-reinstreq chromium-browser
```

Установка только системных библиотек (Puppeteer сам скачает Chrome при установке зависимостей бэкенда).

**Ubuntu 24.04 (Noble)** — пакеты с суффиксом `t64`:

```bash
sudo apt update
sudo apt install -y \
  ca-certificates \
  fonts-liberation \
  libasound2t64 \
  libatk-bridge2.0-0t64 \
  libatk1.0-0t64 \
  libcups2t64 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0t64 \
  libnspr4 \
  libnss3 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxkbcommon0 \
  libxrandr2 \
  libxshmfence1 \
  xdg-utils
```

**Ubuntu 22.04** — те же пакеты без суффикса `t64` (например `libasound2`, `libatk1.0-0`, `libcups2`, `libgtk-3-0`). Полный список для 22.04 или при ошибках — в `docs/PUPPETEER_DEPS_UBUNTU24.md`.

---

## 3. PostgreSQL: база данных

### 3.1. Создание пользователя и БД

```bash
sudo -u postgres psql
```

В psql:

```sql
CREATE USER smashers WITH PASSWORD 'smashers2026';
CREATE DATABASE smashers_db OWNER smashers;
\q
```

### 3.2. Проверка подключения

```bash
sudo -u postgres psql -d smashers_db -c "SELECT 1;"
```

Пароль в следующих шагах будет в `DATABASE_URL` бэкенда.

**Таблицы** (categories, sessions, locations, memberships и др.) создаёт **Prisma** в шаге 4.4 командой `npx prisma migrate deploy` — отдельно создавать их вручную не нужно.

---

## 4. Бэкенд: деплой

### 4.1. Директория и клонирование

Подставьте свой URL репозитория бэкенда:

```bash
sudo mkdir -p /opt
sudo chown $USER:$USER /opt
cd /opt
git clone https://github.com/ExecuteTyT/Smashers-Backend.git smashers-backend
cd smashers-backend
```

### 4.2. Установка зависимостей

```bash
npm ci
```

### 4.3. Переменные окружения

```bash
cp .env.example .env
nano .env
```

Заполните минимум (остальное по необходимости):

```env
NODE_ENV=production
PORT=3000
API_KEY=сгенерируйте_длинный_секретный_ключ

DATABASE_URL=postgresql://smashers:ЗАМЕНИТЕ_НА_ПАРОЛЬ_ИЗ_ШАГА_3@localhost:5432/smashers_db

DJANGO_URL=https://smashers.bookbot.olegb.dev/admin
DJANGO_USERNAME=ваш_логин
DJANGO_PASSWORD=ваш_пароль

ALLOWED_ORIGINS=http://168.222.193.155,http://smashersbc.ru,https://smashersbc.ru,http://www.smashersbc.ru,https://www.smashersbc.ru

TELEGRAM_BOT_TOKEN=
TELEGRAM_MANAGER_CHAT_ID=
TELEGRAM_ADMIN_CHAT_ID=

# Опционально: Google Sheets
# GOOGLE_SHEET_ID=...
# GOOGLE_SERVICE_ACCOUNT_EMAIL=...
# GOOGLE_PRIVATE_KEY=...
```

Сохраните: `Ctrl+O`, Enter, `Ctrl+X`.

### 4.4. Prisma и миграции

```bash
npx prisma generate
npx prisma migrate deploy
```

### 4.5. Запуск через PM2

```bash
pm2 start src/app.js --name smashers-api
pm2 save
pm2 startup
# Выполните команду, которую выведет pm2 startup (sudo env PATH=...)
```

### 4.6. Проверка API

```bash
curl -s http://localhost:3000/api/health
```

Должен вернуться JSON с `"status":"ok"` или аналогично.

---

## 5. Фронтенд: деплой (Vite + React)

### 5.1. Клонирование

Репозиторий на GitHub: **Smashers-frontend** (с маленькой f). Проверьте точное имя репо; если называется иначе — используйте тот URL, который открывается на GitHub.

```bash
cd /opt
git clone https://github.com/ExecuteTyT/Smashers-frontend.git smashers-frontend
cd smashers-frontend
```

### 5.2. Установка и сборка

```bash
npm ci
```

Создайте файл `.env` или `.env.production` в корне `smashers-frontend`:

```env
# API бэкенда на этом сервере (сейчас по IP, после переключения DNS — по домену)
VITE_API_URL=http://168.222.193.155/api
# Домен сайта (для canonical и OG-превью)
VITE_SITE_URL=https://smashersbc.ru
```

После того как домен будет указывать на сервер и заработает HTTPS, замените на:

```env
VITE_API_URL=https://smashersbc.ru/api
VITE_SITE_URL=https://smashersbc.ru
```

Сборка:

```bash
npm run build
```

Сборка идёт в каталог **dist**. Если на сервере нет Chrome/зависимостей для пре-рендера (Puppeteer), эта часть при сборке может пропускаться — для отдачи статики через Nginx это нормально.

### 5.3. Копирование статики под Nginx

У проекта Vite выход — каталог `dist`:

```bash
sudo mkdir -p /var/www/smashers
sudo cp -r dist/* /var/www/smashers/
sudo chown -R www-data:www-data /var/www/smashers
```

| Параметр | Значение |
|----------|----------|
| Фреймворк | Vite + React |
| Переменные окружения | `VITE_API_URL`, `VITE_SITE_URL` в `.env` или `.env.production` |
| Команда сборки | `npm run build` |
| Каталог со сборкой | `dist` |
| Копирование в Nginx | `dist/*` → `/var/www/smashers/` |

---

## 6. Nginx: раздача по IP (проверка)

Сначала отдаём сайт по IP, чтобы проверить до смены DNS.

### 6.1. Конфиг по IP

```bash
sudo nano /etc/nginx/sites-available/smashers-by-ip
```

Вставьте (для Vite + React статика уже в `/var/www/smashers` из `dist`):

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name 168.222.193.155;

    root /var/www/smashers;
    index index.html;
    try_files $uri $uri/ /index.html;

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Включите сайт и отключите дефолтный сайт Nginx:

```bash
sudo ln -sf /etc/nginx/sites-available/smashers-by-ip /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

---

## 7. Проверка по IP

- В браузере: `http://168.222.193.155` — должна открыться главная фронта.
- `http://168.222.193.155/api/health` — ответ API.

Если фронт тянет API по этому же IP, в `ALLOWED_ORIGINS` уже есть `http://168.222.193.155`. После смены DNS добавьте домен (уже указан в примере `.env` выше).

---

## 8. Reg.ru: смена A-записи

1. Зайдите в [Reg.ru](https://www.reg.ru) → Домены → smashersbc.ru → «Управление зоной» / «DNS-серверы и управление зоной».
2. Найдите A-записи для **@** (корень) и **www**.
3. Замените значение (IP) на **168.222.193.155**.
4. TTL оставьте 3600 (минимальный у вас).
5. Сохраните.

Распространение DNS при TTL 3600 может занять до 1–2 часов. Проверка:

```bash
# С любой машины
nslookup smashersbc.ru
# Должен показать 168.222.193.155
```

---

## 9. Nginx + SSL для домена

Когда `smashersbc.ru` начнёт резолвиться в 168.222.193.155, добавьте виртуальный хост по домену и получите сертификат.

### 9.1. Конфиг для домена (до SSL)

```bash
sudo nano /etc/nginx/sites-available/smashersbc
```

Содержимое:

```nginx
server {
    listen 80;
    server_name smashersbc.ru www.smashersbc.ru;

    root /var/www/smashers;
    index index.html;
    try_files $uri $uri/ /index.html;

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Включите сайт и отключите «дефолт по IP», чтобы по IP не перехватывался домен:

```bash
sudo ln -sf /etc/nginx/sites-available/smashersbc /etc/nginx/sites-enabled/
# Дефолтный сервер по IP можно оставить или убрать — по желанию
sudo nginx -t && sudo systemctl reload nginx
```

### 9.2. Получение SSL (Let's Encrypt)

Выполнять только когда `smashersbc.ru` уже указывает на 168.222.193.155:

```bash
sudo certbot --nginx -d smashersbc.ru -d www.smashersbc.ru
```

Следуйте подсказкам (email, согласие). Certbot сам настроит HTTPS в конфиге Nginx.

### 9.3. Обновление фронта под домен

В корне фронта (`/opt/smashers-frontend`) в `.env` или `.env.production` выставьте продакшен-URL:

- `VITE_API_URL=https://smashersbc.ru/api`
- `VITE_SITE_URL=https://smashersbc.ru`

Пересоберите и залейте статику снова:

```bash
cd /opt/smashers-frontend
npm run build
sudo cp -r dist/* /var/www/smashers/
sudo chown -R www-data:www-data /var/www/smashers
```

В бэкенде в `.env` уже должны быть в `ALLOWED_ORIGINS` домены `https://smashersbc.ru` и `https://www.smashersbc.ru`. Перезапуск API:

```bash
pm2 restart smashers-api
```

---

## 10. Финальная проверка и поддержка

### 10.1. Проверки

- https://smashersbc.ru — открывается фронт.
- https://www.smashersbc.ru — то же или редирект на без www (настроите при желании в Nginx).
- https://smashersbc.ru/api/health — ответ API.
- Запись на тренировку / формы — работают без ошибок CORS.

### 10.2. Полезные команды

```bash
# Логи бэкенда
pm2 logs smashers-api

# Рестарт бэкенда
pm2 restart smashers-api

# Статус
pm2 status

# Рестарт Nginx
sudo systemctl reload nginx
```

### 10.3. Обновление бэкенда

```bash
cd /opt/smashers-backend
git pull
npm ci
npx prisma migrate deploy
pm2 restart smashers-api
```

### 10.4. Обновление фронта

```bash
cd /opt/smashers-frontend
git pull
npm ci
npm run build
sudo cp -r dist/* /var/www/smashers/
sudo chown -R www-data:www-data /var/www/smashers
```

### 10.5. Автообновление SSL (Certbot)

Проверка таймера:

```bash
sudo systemctl status certbot.timer
```

Обычно продление настроено автоматически.

### 10.6. Настройка SSH и отключение root (в конце)

Когда вся настройка под root закончена и сайт работает, можно перейти на вход под пользователем `deploy` и отключить SSH для root.

**Шаг 1 — ключ для deploy (под root на сервере):**

На своей машине скопируйте содержимое публичного ключа (PowerShell: `Get-Content $env:USERPROFILE\.ssh\id_rsa.pub`; в WSL/Linux: `cat ~/.ssh/id_rsa.pub`). На сервере:

```bash
mkdir -p /home/deploy/.ssh
nano /home/deploy/.ssh/authorized_keys
# Вставьте одну строку с id_rsa.pub, сохраните
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

**Шаг 2 — проверка входа под deploy:**

В **новом** окне терминала (не закрывая сессию root): `ssh deploy@168.222.193.155`. Убедитесь, что вход по ключу работает. Только после этого переходите к шагу 3.

**Шаг 3 — отключение входа root по SSH (опционально):**

```bash
sudo nano /etc/ssh/sshd_config
```

Найдите и установите (или раскомментируйте):

```
PermitRootLogin no
PasswordAuthentication no
```

Сохраните, затем:

```bash
sudo systemctl reload sshd
```

Дальше подключайтесь только как `deploy@168.222.193.155`; для админских действий используйте `sudo`.

---

## Краткий чеклист

| Шаг | Действие |
|-----|----------|
| 1 | SSH, обновление, пользователь, UFW |
| 2 | Node 20, Nginx, PostgreSQL, PM2, Git, Certbot, Chromium |
| 3 | Создать БД и пользователя PostgreSQL |
| 4 | Клонировать бэк, .env, prisma generate + migrate deploy, PM2 |
| 5 | Клонировать фронт, .env с API URL по IP, build, копировать в /var/www/smashers |
| 6 | Nginx конфиг по IP, проверить по http://168.222.193.155 |
| 7 | Проверить фронт и /api/health по IP |
| 8 | Reg.ru: A-запись @ и www → 168.222.193.155 |
| 9 | Nginx конфиг для smashersbc.ru, certbot, пересобрать фронт с https://smashersbc.ru/api, pm2 restart |
| 10 | Финальные проверки, обновления, логи |

После этого весь трафик с smashersbc.ru идёт на ваш сервер; старый сайт на Tilda перестаёт получать запросы по этому домену.
