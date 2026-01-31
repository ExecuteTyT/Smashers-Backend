# Быстрый старт - Настройка PostgreSQL и парсера

## Архитектура

```
Django Админка → Парсер → PostgreSQL → API → Фронтенд
```

**Важно:** Google Sheets опционален. Можно работать напрямую: Парсер → PostgreSQL → API.

## Шаг 1: Настройка PostgreSQL

### Вариант A: Docker (рекомендуется)

```bash
cd smashers-backend
docker-compose up -d postgres
```

### Вариант B: Локальная установка

1. Установите PostgreSQL
2. Создайте базу: `CREATE DATABASE smashers_db;`

## Шаг 2: Настройка .env

Убедитесь, что в `.env` указан правильный `DATABASE_URL`:

```env
# Для Docker
DATABASE_URL=postgresql://smashers:smashers_password@localhost:5432/smashers_db

# Для локального PostgreSQL
# DATABASE_URL=postgresql://postgres:ваш_пароль@localhost:5432/smashers_db
```

## Шаг 3: Создание таблиц

```bash
cd smashers-backend
npm install  # если еще не установлено
npm run db:push
```

Это создаст все таблицы в БД согласно Prisma схеме.

## Шаг 4: Запуск парсера

```bash
npm run parse
```

Парсер:
1. Подключится к Django админке
2. Распарсит все данные (категории, локации, абонементы, тренировки)
3. Сохранит их в PostgreSQL
4. Опционально обновит Google Sheets (если настроены)

## Шаг 5: Проверка данных

### Через Prisma Studio (GUI):
```bash
npm run studio
```

### Через API (если сервер запущен):
```bash
GET http://localhost:3000/api/categories
GET http://localhost:3000/api/memberships
GET http://localhost:3000/api/locations
GET http://localhost:3000/api/sessions
```

## Пятничные обновления

Парсер автоматически определяет пятницу и:
- Удаляет старые тренировки (старше текущей недели)
- Сохраняет новую неделю занятий (ПН-ВС)

Это работает автоматически в cron job.

## Настройка cron job

В `.env` можно настроить расписание:

```env
# Парсить каждый час
PARSER_CRON_SCHEDULE=0 * * * *

# Или использовать интервал в часах
PARSE_INTERVAL_HOURS=1
```

Для автоматического запуска cron job при старте сервера:
```env
ENABLE_JOBS=true
```

## Что дальше?

1. ✅ PostgreSQL настроен
2. ✅ Таблицы созданы
3. ✅ Парсер работает и сохраняет в БД
4. ✅ API отдает данные из БД
5. ✅ Фронтенд может получать данные через API

## Проблемы?

См. подробные инструкции:
- `docs/POSTGRESQL_SETUP.md` - настройка PostgreSQL
- `docs/PARSER_VERIFICATION_PLAN.md` - проверка после парсинга
