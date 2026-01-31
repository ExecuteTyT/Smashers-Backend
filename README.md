# Smashers Backend API

Backend система для интеграции Django админки бадминтон-клуба Smashers с React фронтендом через Google Sheets.

## Возможности

- **Parser Service** - автоматический парсинг Django админки (категории, локации, абонементы, занятия)
- **Google Sheets Sync** - синхронизация данных между Google Sheets и PostgreSQL
- **REST API** - предоставление данных для React фронтенда
- **Telegram Integration** - уведомления о заявках с сайта

## Требования

- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose (опционально)

## Быстрый старт

### 1. Клонирование и установка

```bash
cd smashers-backend
npm install
```

### 2. Настройка переменных окружения

```bash
cp .env.example .env
# Отредактируйте .env файл
```

### 3. Инициализация базы данных

```bash
# Создайте базу данных PostgreSQL
createdb smashers_db

# Применение миграций
npm run migrate

# Или для разработки (без миграций)
npm run db:push
```

### 4. Запуск

```bash
# Development
npm run dev

# Production
npm start
```

### 5. Проверка

Откройте в браузере:
- API: http://localhost:3000/api/health
- Документация: http://localhost:3000/api-docs

## Запуск с Docker

```bash
# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f backend

# Остановка
docker-compose down
```

## Переменные окружения

| Переменная | Описание | Пример |
|------------|----------|--------|
| `NODE_ENV` | Окружение | `development` / `production` |
| `PORT` | Порт сервера | `3000` |
| `API_KEY` | API ключ для защищённых endpoints | `your_secret_key` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `DJANGO_URL` | URL Django админки | `https://smashers.bookbot.olegb.dev` |
| `DJANGO_USERNAME` | Логин Django админки | - |
| `DJANGO_PASSWORD` | Пароль Django админки | - |
| `GOOGLE_SHEET_ID` | ID Google таблицы | - |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email сервисного аккаунта | - |
| `GOOGLE_PRIVATE_KEY` | Приватный ключ | - |
| `TELEGRAM_BOT_TOKEN` | Токен Telegram бота | - |
| `TELEGRAM_MANAGER_CHAT_ID` | Chat ID менеджера | - |

## API Endpoints

### Публичные

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/health` | Health check |
| GET | `/api/categories` | Список категорий |
| GET | `/api/memberships` | Список абонементов |
| GET | `/api/sessions` | Список занятий (с фильтрами) |
| GET | `/api/locations` | Список локаций |
| POST | `/api/booking` | Создание заявки |

### Защищённые (требуют X-API-Key)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/trigger-parse` | Запуск парсера |
| POST | `/api/trigger-sync` | Запуск синхронизации |
| GET | `/api/booking` | Список заявок |

### Фильтры для /api/sessions

```
GET /api/sessions?date=2024-01-29
GET /api/sessions?date_from=2024-01-01&date_to=2024-01-31
GET /api/sessions?category_id=1&location_id=2
GET /api/sessions?available_only=true
```

## Настройка внешних сервисов

### Google Cloud & Sheets API

1. Создайте проект в [Google Cloud Console](https://console.cloud.google.com/)
2. Включите Google Sheets API:
   - APIs & Services → Library → Google Sheets API → Enable
3. Создайте Service Account:
   - APIs & Services → Credentials → Create Credentials → Service Account
   - Скачайте JSON ключ
4. Создайте Google Sheet и поделитесь с email сервисного аккаунта
5. Скопируйте ID таблицы из URL (между `/d/` и `/edit`)
6. Добавьте в `.env`:
   ```
   GOOGLE_SHEET_ID=ваш_id_таблицы
   GOOGLE_SERVICE_ACCOUNT_EMAIL=email@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

### Telegram Bot

1. Напишите [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot` и следуйте инструкциям
3. Скопируйте токен бота
4. Получите Chat ID:
   - Напишите боту любое сообщение
   - Откройте `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - Найдите `"chat":{"id":XXXXXX}`
5. Добавьте в `.env`:
   ```
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
   TELEGRAM_MANAGER_CHAT_ID=123456789
   ```

## Структура проекта

```
smashers-backend/
├── src/
│   ├── config/           # Конфигурация (БД, Telegram, Sheets, Logger)
│   ├── parsers/          # Парсеры Django админки
│   │   └── django/       # Модули парсинга по сущностям
│   ├── services/         # Бизнес-логика
│   ├── controllers/      # Обработчики HTTP запросов
│   ├── routes/           # Определение маршрутов
│   ├── middleware/       # Express middleware
│   ├── utils/            # Утилиты
│   ├── jobs/             # Cron задачи
│   └── app.js            # Точка входа
├── prisma/
│   └── schema.prisma     # Схема базы данных
├── logs/                 # Файлы логов
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## Скрипты

```bash
npm run dev          # Запуск с nodemon
npm start            # Production запуск
npm run parse        # Однократный запуск парсера
npm run sync         # Однократная синхронизация
npm run migrate      # Применить миграции
npm run studio       # Prisma Studio (GUI для БД)
npm test             # Запуск тестов
```

## Cron Jobs

- **Parser**: каждый час (настраивается через `PARSE_INTERVAL_HOURS`)
- **Sync**: каждые 5 минут (настраивается через `SYNC_INTERVAL_MINUTES`)

В development режиме jobs отключены. Включить: `ENABLE_JOBS=true`

## Логирование

Логи пишутся в:
- Консоль (всегда)
- `logs/app-YYYY-MM-DD.log` (все логи, ротация 7 дней)
- `logs/error-YYYY-MM-DD.log` (только ошибки, ротация 30 дней)

## Troubleshooting

### Ошибка подключения к Django админке

1. Проверьте `DJANGO_URL`, `DJANGO_USERNAME`, `DJANGO_PASSWORD`
2. Убедитесь, что учётная запись имеет доступ к админке
3. Проверьте, не заблокирован ли IP

### Google Sheets не работает

1. Проверьте, что таблица расшарена с email сервисного аккаунта
2. Убедитесь, что `GOOGLE_PRIVATE_KEY` содержит `\n` символы
3. Проверьте, что Google Sheets API включен в Cloud Console

### Telegram уведомления не приходят

1. Убедитесь, что бот запущен (напишите ему)
2. Проверьте правильность Chat ID
3. Посмотрите логи на наличие ошибок

### База данных не подключается

1. Проверьте, что PostgreSQL запущен
2. Проверьте `DATABASE_URL` формат
3. Убедитесь, что база данных существует

## Лицензия

MIT
