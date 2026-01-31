# Разворачивание PostgreSQL на тестовом сервере

## Содержание

1. [Варианты разворачивания](#варианты-разворачивания)
2. [Вариант 1: Docker (рекомендуется)](#вариант-1-docker-рекомендуется)
3. [Вариант 2: Локальная установка PostgreSQL](#вариант-2-локальная-установка-postgresql)
4. [Вариант 3: Облачные решения](#вариант-3-облачные-решения)
5. [Настройка подключения](#настройка-подключения)
6. [Применение миграций](#применение-миграций)
7. [Проверка работоспособности](#проверка-работоспособности)
8. [Безопасность](#безопасность)
9. [Резервное копирование](#резервное-копирование)

---

## Варианты разворачивания

### Вариант 1: Docker (рекомендуется)
- ✅ Быстро и просто
- ✅ Изолированная среда
- ✅ Легко удалить/пересоздать
- ✅ Автоматические обновления

### Вариант 2: Локальная установка
- ✅ Прямой контроль
- ✅ Нет зависимости от Docker
- ⚠️ Требует ручной настройки

### Вариант 3: Облачные решения
- ✅ Управляемый сервис
- ✅ Автоматические бэкапы
- ⚠️ Платно (но есть бесплатные тарифы)

---

## Вариант 1: Docker (рекомендуется)

### Требования

- Docker установлен на сервере
- Docker Compose установлен (обычно идет с Docker)

### Шаг 1: Установка Docker (если не установлен)

#### Для Ubuntu/Debian:

```bash
# Обновить систему
sudo apt update
sudo apt upgrade -y

# Установить зависимости
sudo apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Добавить официальный GPG ключ Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Настроить репозиторий
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Установить Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Установить Docker Compose (standalone, если нужна команда docker-compose)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Добавить пользователя в группу docker (чтобы не использовать sudo)
sudo usermod -aG docker $USER
newgrp docker

# Включить автозапуск
sudo systemctl enable docker
sudo systemctl start docker

# Проверить установку
docker --version
docker compose version
docker-compose --version
docker run hello-world
```

**Подробная инструкция:** См. `docs/DOCKER_INSTALL_UBUNTU.md`

### Шаг 2: Проверка Docker

```bash
# Проверить версию Docker
docker --version

# Проверить версию Docker Compose
docker-compose --version
# или
docker compose version
```

### Шаг 3: Настройка docker-compose.yml

Откройте файл `smashers-backend/docker-compose.yml` и проверьте настройки PostgreSQL:

```yaml
postgres:
  image: postgres:15-alpine
  container_name: smashers-postgres
  restart: unless-stopped
  environment:
    POSTGRES_USER: ${DB_USER:-smashers}
    POSTGRES_PASSWORD: ${DB_PASSWORD:-smashers_password}
    POSTGRES_DB: ${DB_NAME:-smashers_db}
  volumes:
    - postgres_data:/var/lib/postgresql/data
  ports:
    - "5432:5432"
```

### Шаг 4: Создание .env для Docker

Создайте или обновите `.env` файл:

```env
# PostgreSQL для Docker
DB_USER=smashers
DB_PASSWORD=ваш_надежный_пароль_здесь
DB_NAME=smashers_db

# DATABASE_URL для приложения
DATABASE_URL=postgresql://smashers:ваш_надежный_пароль_здесь@localhost:5432/smashers_db
```

**Важно:** Используйте надежный пароль в production!

### Шаг 5: Запуск PostgreSQL

```bash
cd smashers-backend

# Запустить только PostgreSQL
docker-compose up -d postgres

# Или запустить все сервисы (если нужно)
docker-compose up -d
```

### Шаг 6: Проверка запуска

```bash
# Проверить статус контейнера
docker ps | grep postgres

# Проверить логи
docker-compose logs postgres

# Проверить подключение
docker exec -it smashers-postgres psql -U smashers -d smashers_db -c "SELECT version();"
```

### Шаг 7: Остановка/Перезапуск

```bash
# Остановить
docker-compose stop postgres

# Запустить
docker-compose start postgres

# Перезапустить
docker-compose restart postgres

# Остановить и удалить (данные сохранятся в volume)
docker-compose down postgres

# Остановить и удалить с данными (⚠️ удалит все данные!)
docker-compose down -v postgres
```

---

## Вариант 2: Локальная установка PostgreSQL

### Linux (Ubuntu/Debian)

#### Шаг 1: Установка PostgreSQL

```bash
# Обновить пакеты
sudo apt update

# Установить PostgreSQL 15
sudo apt install postgresql-15 postgresql-contrib-15

# Проверить версию
psql --version
```

#### Шаг 2: Запуск службы

```bash
# Запустить PostgreSQL
sudo systemctl start postgresql

# Включить автозапуск
sudo systemctl enable postgresql

# Проверить статус
sudo systemctl status postgresql
```

#### Шаг 3: Настройка пользователя и базы данных

```bash
# Переключиться на пользователя postgres
sudo -u postgres psql

# В psql выполнить:
CREATE USER smashers WITH PASSWORD 'ваш_надежный_пароль';
CREATE DATABASE smashers_db OWNER smashers;
GRANT ALL PRIVILEGES ON DATABASE smashers_db TO smashers;

# Выйти из psql
\q
```

#### Шаг 4: Настройка доступа (pg_hba.conf)

```bash
# Найти файл конфигурации
sudo find /etc -name pg_hba.conf

# Обычно находится в:
# /etc/postgresql/15/main/pg_hba.conf

# Отредактировать (добавить строку для локального доступа):
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

Добавьте строку (если её нет):
```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
host    smashers_db     smashers        127.0.0.1/32            md5
```

#### Шаг 5: Настройка postgresql.conf

```bash
# Найти файл конфигурации
sudo find /etc -name postgresql.conf

# Обычно находится в:
# /etc/postgresql/15/main/postgresql.conf

# Отредактировать (если нужно разрешить внешние подключения):
sudo nano /etc/postgresql/15/main/postgresql.conf
```

Найдите и раскомментируйте:
```
listen_addresses = 'localhost'  # или '*' для всех интерфейсов
```

#### Шаг 6: Перезапуск PostgreSQL

```bash
sudo systemctl restart postgresql
```

#### Шаг 7: Проверка подключения

```bash
# Локальное подключение
psql -U smashers -d smashers_db -h localhost

# Если запрашивает пароль - введите пароль, который создали
# Проверить подключение:
SELECT version();
\q
```

### Windows Server

#### Шаг 1: Скачать PostgreSQL

1. Перейдите на [официальный сайт](https://www.postgresql.org/download/windows/)
2. Скачайте установщик для Windows
3. Запустите установщик

#### Шаг 2: Установка

1. Выберите компоненты (оставьте все по умолчанию)
2. Выберите директорию установки
3. **Важно:** Запомните пароль для пользователя `postgres`
4. Порт: `5432` (по умолчанию)
5. Локаль: `Russian, Russia` (или нужная вам)

#### Шаг 3: Создание базы данных

После установки откройте **pgAdmin** или используйте командную строку:

```cmd
# Открыть psql
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres
```

В psql выполните:
```sql
CREATE USER smashers WITH PASSWORD 'ваш_надежный_пароль';
CREATE DATABASE smashers_db OWNER smashers;
GRANT ALL PRIVILEGES ON DATABASE smashers_db TO smashers;
\q
```

#### Шаг 4: Настройка подключения

Откройте файл `pg_hba.conf`:
```
C:\Program Files\PostgreSQL\15\data\pg_hba.conf
```

Добавьте строку:
```
host    smashers_db     smashers        127.0.0.1/32            md5
```

Перезапустите службу PostgreSQL через **Services** (Службы Windows).

---

## Вариант 3: Облачные решения

### AWS RDS

1. Создайте RDS инстанс PostgreSQL
2. Выберите версию PostgreSQL 15
3. Настройте security group для доступа
4. Скопируйте endpoint и используйте в `DATABASE_URL`

### Google Cloud SQL

1. Создайте Cloud SQL инстанс
2. Выберите PostgreSQL
3. Настройте авторизованные сети
4. Используйте connection string в `DATABASE_URL`

### Heroku Postgres

1. Создайте приложение на Heroku
2. Добавьте addon: `heroku addons:create heroku-postgresql:hobby-dev`
3. Получите `DATABASE_URL`: `heroku config:get DATABASE_URL`

### Railway / Render

1. Создайте PostgreSQL сервис
2. Скопируйте `DATABASE_URL` из настроек
3. Используйте в `.env`

---

## Настройка подключения

### Обновление .env

После разворачивания БД обновите `.env`:

```env
# Для локального PostgreSQL
DATABASE_URL=postgresql://smashers:пароль@localhost:5432/smashers_db

# Для удаленного сервера
DATABASE_URL=postgresql://smashers:пароль@your-server.com:5432/smashers_db

# Для облачного решения (используйте connection string из панели)
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
```

### Проверка подключения из приложения

```bash
cd smashers-backend

# Проверить подключение через Prisma
npx prisma db pull

# Или через тестовый скрипт
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.$connect().then(() => { console.log('Connected!'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });"
```

---

## Применение миграций

### Вариант 1: Prisma db push (для разработки)

```bash
cd smashers-backend

# Применить схему к БД
npm run db:push
```

Это создаст все таблицы согласно `prisma/schema.prisma`.

### Вариант 2: Prisma Migrate (для production)

```bash
# Создать миграцию
npm run migrate

# Или применить существующие миграции
npx prisma migrate deploy
```

### Проверка таблиц

```bash
# Через psql
psql -U smashers -d smashers_db -c "\dt"

# Или через Prisma Studio (GUI)
npm run studio
```

Должны быть созданы таблицы:
- `categories`
- `memberships`
- `locations`
- `sessions`
- `booking_requests`
- `sync_status`

---

## Проверка работоспособности

### 1. Проверка подключения

```bash
# Через Docker
docker exec -it smashers-postgres psql -U smashers -d smashers_db -c "SELECT 1;"

# Через psql (локально)
psql -U smashers -d smashers_db -h localhost -c "SELECT version();"
```

### 2. Проверка через API

Если сервер запущен:

```bash
# Health check
curl http://localhost:3000/api/health

# Detailed health (проверит БД)
curl http://localhost:3000/api/health/detailed
```

### 3. Проверка через Prisma Studio

```bash
npm run studio
```

Откроется GUI на `http://localhost:5555` где можно просмотреть все таблицы.

### 4. Тестовый запрос

```bash
# Через psql
psql -U smashers -d smashers_db -c "SELECT COUNT(*) FROM categories;"
psql -U smashers -d smashers_db -c "SELECT COUNT(*) FROM sessions;"
```

---

## Безопасность

### 1. Надежный пароль

Используйте сложный пароль для пользователя БД:
- Минимум 16 символов
- Буквы, цифры, спецсимволы
- Не используйте простые пароли

### 2. Ограничение доступа

#### Для локального сервера:

В `pg_hba.conf` разрешите доступ только с нужных IP:

```
# Только localhost
host    smashers_db     smashers        127.0.0.1/32            md5

# Или конкретный IP сервера приложения
host    smashers_db     smashers        192.168.1.100/32        md5
```

#### Для удаленного сервера:

1. Используйте firewall (ufw, iptables)
2. Разрешите доступ только с IP приложения
3. Используйте SSL соединение

### 3. SSL соединение

Для production используйте SSL:

```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
```

### 4. Отдельный пользователь для приложения

Создайте отдельного пользователя с минимальными правами:

```sql
-- Создать пользователя только для чтения/записи данных
CREATE USER smashers_app WITH PASSWORD 'пароль';

-- Дать права только на нужные таблицы
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO smashers_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO smashers_app;
```

---

## Резервное копирование

### Создание бэкапа

#### Docker:

```bash
# Создать бэкап
docker exec smashers-postgres pg_dump -U smashers smashers_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Создать сжатый бэкап
docker exec smashers-postgres pg_dump -U smashers -Fc smashers_db > backup_$(date +%Y%m%d_%H%M%S).dump
```

#### Локальный PostgreSQL:

```bash
# Создать бэкап
pg_dump -U smashers -h localhost smashers_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Создать сжатый бэкап
pg_dump -U smashers -h localhost -Fc smashers_db > backup_$(date +%Y%m%d_%H%M%S).dump
```

### Восстановление из бэкапа

#### SQL файл:

```bash
# Docker
docker exec -i smashers-postgres psql -U smashers smashers_db < backup.sql

# Локальный
psql -U smashers -h localhost smashers_db < backup.sql
```

#### Сжатый dump:

```bash
# Docker
docker exec -i smashers-postgres pg_restore -U smashers -d smashers_db < backup.dump

# Локальный
pg_restore -U smashers -h localhost -d smashers_db backup.dump
```

### Автоматическое резервное копирование

Создайте скрипт `backup-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/smashers_db_$DATE.sql"

# Создать директорию если не существует
mkdir -p $BACKUP_DIR

# Создать бэкап
docker exec smashers-postgres pg_dump -U smashers smashers_db > $BACKUP_FILE

# Сжать бэкап
gzip $BACKUP_FILE

# Удалить старые бэкапы (старше 7 дней)
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup created: $BACKUP_FILE.gz"
```

Добавьте в cron:

```bash
# Редактировать crontab
crontab -e

# Добавить строку (каждый день в 2:00)
0 2 * * * /path/to/backup-db.sh
```

---

## Проверочный чек-лист

После разворачивания проверьте:

- [ ] PostgreSQL запущен и работает
- [ ] База данных `smashers_db` создана
- [ ] Пользователь `smashers` создан и имеет права
- [ ] Подключение из приложения работает
- [ ] Миграции применены (таблицы созданы)
- [ ] Можно подключиться через `psql`
- [ ] Health check API возвращает успех
- [ ] Настроен firewall (если нужно)
- [ ] Настроено резервное копирование
- [ ] Пароль надежный и сохранен в безопасном месте

---

## Устранение проблем

### Ошибка "connection refused"

1. Проверьте, что PostgreSQL запущен:
   ```bash
   # Docker
   docker ps | grep postgres
   
   # Linux
   sudo systemctl status postgresql
   ```

2. Проверьте порт:
   ```bash
   netstat -tuln | grep 5432
   ```

3. Проверьте `pg_hba.conf` - разрешен ли доступ

### Ошибка "password authentication failed"

1. Проверьте пароль в `.env`
2. Проверьте пользователя в БД:
   ```sql
   SELECT usename FROM pg_user;
   ```

3. Сбросьте пароль:
   ```sql
   ALTER USER smashers WITH PASSWORD 'новый_пароль';
   ```

### Ошибка "database does not exist"

1. Создайте базу данных:
   ```sql
   CREATE DATABASE smashers_db;
   ```

2. Проверьте имя базы в `DATABASE_URL`

### Ошибка "relation does not exist"

1. Примените миграции:
   ```bash
   npm run db:push
   ```

2. Проверьте, что таблицы созданы:
   ```sql
   \dt
   ```

---

## Полезные команды

```bash
# Подключиться к БД
psql -U smashers -d smashers_db -h localhost

# Показать все базы данных
psql -U smashers -c "\l"

# Показать все таблицы
psql -U smashers -d smashers_db -c "\dt"

# Показать структуру таблицы
psql -U smashers -d smashers_db -c "\d sessions"

# Выполнить SQL запрос
psql -U smashers -d smashers_db -c "SELECT COUNT(*) FROM sessions;"

# Экспорт данных в CSV
psql -U smashers -d smashers_db -c "COPY sessions TO STDOUT WITH CSV HEADER" > sessions.csv
```

---

## Следующие шаги

После успешного разворачивания БД:

1. ✅ Примените миграции
2. ✅ Запустите парсер для заполнения данными
3. ✅ Проверьте API эндпоинты
4. ✅ Настройте автоматическое резервное копирование
5. ✅ Настройте мониторинг (опционально)

Готово! База данных развернута и готова к использованию.
