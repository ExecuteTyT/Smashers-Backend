# Настройка PostgreSQL для Smashers Backend

## Вариант 1: Через Docker (рекомендуется)

Самый простой способ - использовать Docker Compose.

### Шаг 1: Запуск PostgreSQL

```bash
cd smashers-backend
docker-compose up -d postgres
```

Это запустит PostgreSQL в контейнере с настройками из `docker-compose.yml`.

### Шаг 2: Проверка подключения

PostgreSQL будет доступен на:
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `smashers_db`
- **User**: `smashers` (или значение из `DB_USER`)
- **Password**: `smashers_password` (или значение из `DB_PASSWORD`)

### Шаг 3: Настройка .env

Убедитесь, что в `.env` указан правильный `DATABASE_URL`:

```env
DATABASE_URL=postgresql://smashers:smashers_password@localhost:5432/smashers_db
```

Или если используете значения по умолчанию из docker-compose.yml:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smashers_db
```

### Шаг 4: Применение миграций

```bash
cd smashers-backend
npm run db:push
```

Или через миграции:
```bash
npm run migrate
```

## Вариант 2: Локальная установка PostgreSQL

### Windows

1. Скачайте PostgreSQL с [официального сайта](https://www.postgresql.org/download/windows/)
2. Установите PostgreSQL (запомните пароль для пользователя `postgres`)
3. Создайте базу данных:
   ```sql
   CREATE DATABASE smashers_db;
   ```

### Настройка .env

```env
DATABASE_URL=postgresql://postgres:ваш_пароль@localhost:5432/smashers_db
```

### Применение миграций

```bash
cd smashers-backend
npm run db:push
```

## Проверка подключения

После настройки можно проверить подключение:

```bash
# Через Prisma Studio (GUI)
npm run studio

# Или через API health check (если сервер запущен)
GET /api/health/detailed
```

## Структура базы данных

После применения миграций будут созданы таблицы:
- `categories` - категории тренировок
- `memberships` - абонементы
- `locations` - локации
- `sessions` - тренировки
- `booking_requests` - заявки с сайта
- `sync_status` - статус синхронизации

## Важно про пятничные обновления

Каждую пятницу парсер автоматически:
1. Парсит новую неделю занятий (ПН-ВС)
2. Удаляет старые тренировки (старше текущей недели)
3. Сохраняет новые тренировки в БД

Это происходит автоматически, если парсер запущен в cron job.

## Рекомендуемый cron schedule

Для автоматического парсинга с учетом пятничных обновлений:

```env
# Парсить каждый час, но в пятницу будет автоматически очистка старых сессий
PARSER_CRON_SCHEDULE=0 * * * *
```

Или можно настроить более частое обновление:
```env
# Каждые 30 минут
PARSER_CRON_SCHEDULE=*/30 * * * *
```

## Устранение проблем

### Ошибка подключения к БД

1. Проверьте, что PostgreSQL запущен:
   ```bash
   # Docker
   docker ps | grep postgres
   
   # Windows (локально)
   # Проверьте службы Windows
   ```

2. Проверьте `DATABASE_URL` в `.env`

3. Проверьте логи:
   ```bash
   docker-compose logs postgres
   ```

### Ошибка миграций

Если миграции не применяются:
```bash
# Принудительно применить схему
npm run db:push -- --force-reset
```

⚠️ **Внимание**: `--force-reset` удалит все данные!

## Резервное копирование

Рекомендуется настроить регулярное резервное копирование БД:

```bash
# Создать бэкап
docker exec smashers-postgres pg_dump -U smashers smashers_db > backup.sql

# Восстановить из бэкапа
docker exec -i smashers-postgres psql -U smashers smashers_db < backup.sql
```
