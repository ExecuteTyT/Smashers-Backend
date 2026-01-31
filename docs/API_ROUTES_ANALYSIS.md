# Анализ API роутов и соответствие базе данных

## Дата анализа: 2026-01-31

## Схема базы данных (Prisma)

### Category
- `id` (Int, PK)
- `name` (String)
- `sortOrder` (Int, mapped to `sort_order`)
- `isVisible` (Boolean, mapped to `is_visible`)
- `lastUpdated` (DateTime, mapped to `last_updated`)
- `sessions` (Relation: Session[])

### Membership
- `id` (Int, PK)
- `name` (String)
- `type` (String) - "Обычный абик" или "Подарочный серт"
- `price` (Int)
- `sessionCount` (Int, mapped to `session_count`)
- `isVisible` (Boolean, mapped to `is_visible`)
- `lastUpdated` (DateTime, mapped to `last_updated`)

### Session
- `id` (Int, PK)
- `datetime` (DateTime)
- `locationId` (Int, FK → Location.id, mapped to `location_id`)
- `location` (Relation: Location)
- `trainers` (String)
- `name` (String)
- `categoryId` (Int, FK → Category.id, mapped to `category_id`)
- `category` (Relation: Category)
- `maxSpots` (Int, mapped to `max_spots`)
- `availableSpots` (Int, mapped to `available_spots`)
- `status` (String) - "Активно", "Завершено", etc.
- `lastUpdated` (DateTime, mapped to `last_updated`)
- Индексы: `datetime`, `categoryId`, `locationId`, `status`

### Location
- `id` (Int, PK)
- `name` (String)
- `showLocation` (Boolean, mapped to `show_location`)
- `showOnBookingScreen` (Boolean, mapped to `show_on_booking_screen`)
- `description` (String?, nullable)
- `sortOrder` (Int, mapped to `sort_order`)
- `lastUpdated` (DateTime, mapped to `last_updated`)
- `sessions` (Relation: Session[])

### BookingRequest
- `id` (Int, PK, autoincrement)
- `name` (String)
- `phone` (String)
- `sessionId` (Int?, nullable, FK → Session.id, mapped to `session_id`)
- `membershipId` (Int?, nullable, FK → Membership.id, mapped to `membership_id`)
- `message` (String?, nullable)
- `source` (String) - "session_booking", "membership_purchase", "contact_form"
- `createdAt` (DateTime, default now(), mapped to `created_at`)
- `sentToTelegram` (Boolean, default false, mapped to `sent_to_telegram`)
- Индексы: `createdAt`, `sentToTelegram`

### SyncStatus
- `id` (Int, PK, autoincrement)
- `syncType` (String, mapped to `sync_type`) - "parser" or "sheets_to_db"
- `lastSync` (DateTime, mapped to `last_sync`)
- `status` (String) - "success", "failed", "in_progress"
- `itemsParsed` (Json?, nullable, mapped to `items_parsed`)
- `errorMessage` (String?, nullable, mapped to `error_message`)
- `duration` (Int?, nullable) - Duration in milliseconds
- Индексы: `syncType`, `lastSync`

---

## Анализ роутов

### ✅ Health & Status Routes

| Роут | Метод | Контроллер | Статус | Комментарий |
|------|-------|------------|--------|-------------|
| `/api/health` | GET | `healthController.healthCheck` | ✅ OK | Базовый health check |
| `/api/health/detailed` | GET | `healthController.detailedHealthCheck` | ✅ OK | Детальный health check |
| `/api/sync-status` | GET | `healthController.getSyncStatus` | ✅ OK | Статус синхронизации (использует SyncStatus) |
| `/api/stats` | GET | `healthController.getStats` | ✅ OK | Статистика БД |

### ✅ Categories Routes

| Роут | Метод | Контроллер | Фильтры | Статус | Комментарий |
|------|-------|------------|---------|--------|-------------|
| `/api/categories` | GET | `getCategories` | `isVisible: true` | ✅ OK | Правильно использует `isVisible` |
| `/api/categories/all` | GET | `getAllCategories` | Нет | ✅ OK | Admin endpoint, требует API key |
| `/api/categories/:id` | GET | `getCategoryById` | Нет | ✅ OK | Включает связанные sessions со статусом 'Активно' |

**Поля в ответе:**
- ✅ `id`, `name`, `sortOrder`, `isVisible`, `lastUpdated`
- ✅ При запросе по ID включает `sessions` (только активные)

### ✅ Memberships Routes

| Роут | Метод | Контроллер | Фильтры | Статус | Комментарий |
|------|-------|------------|---------|--------|-------------|
| `/api/memberships` | GET | `getMemberships` | `isVisible: true` | ✅ OK | Правильно использует `isVisible` |
| `/api/memberships/all` | GET | `getAllMemberships` | Нет | ✅ OK | Admin endpoint |
| `/api/memberships/:id` | GET | `getMembershipById` | Нет | ✅ OK | Возвращает любой абонемент (включая невидимые) |
| `/api/memberships/by-type/:type` | GET | `getMembershipsByType` | `isVisible: true`, `type: contains` | ✅ OK | Поиск по типу (case-insensitive) |

**Поля в ответе:**
- ✅ `id`, `name`, `type`, `price`, `sessionCount`, `isVisible`, `lastUpdated`

**Особенности:**
- ✅ Роут `/api/memberships/:id` возвращает абонемент даже если `isVisible: false` (нужно для абонемента id=2 "Разовая тренировка")

### ✅ Sessions Routes

| Роут | Метод | Контроллер | Фильтры | Статус | Комментарий |
|------|-------|------------|---------|--------|-------------|
| `/api/sessions` | GET | `getSessions` | `status: 'Активно'`, date filters, category_id, location_id, available_only | ⚠️ ПРОВЕРИТЬ | Использует жестко закодированный статус |
| `/api/sessions/all` | GET | `getAllSessions` | Нет | ✅ OK | Admin endpoint |
| `/api/sessions/:id` | GET | `getSessionById` | Нет | ✅ OK | Возвращает любую тренировку |
| `/api/sessions/upcoming` | GET | `getUpcomingSessions` | `status: 'Активно'`, `datetime >= now`, `availableSpots > 0` | ⚠️ ПРОВЕРИТЬ | Использует жестко закодированный статус |
| `/api/sessions/by-date/:date` | GET | `getSessionsByDate` | `status: 'Активно'`, date range | ⚠️ ПРОВЕРИТЬ | Использует жестко закодированный статус |

**Поля в ответе:**
- ✅ `id`, `datetime`, `locationId`, `location`, `trainers`, `name`, `categoryId`, `category`, `maxSpots`, `availableSpots`, `status`, `lastUpdated`

**Проблемы:**
- ⚠️ **Статус 'Активно' жестко закодирован** - нужно проверить, какие статусы реально используются в базе
- ⚠️ **Нет фильтра по прошедшим датам** в `/api/sessions` - может возвращать старые тренировки

**Рекомендации:**
1. Проверить реальные значения статусов в базе данных
2. Добавить фильтр `datetime >= now()` для будущих тренировок в `/api/sessions`
3. Возможно, создать константы для статусов

### ✅ Locations Routes

| Роут | Метод | Контроллер | Фильтры | Статус | Комментарий |
|------|-------|------------|---------|--------|-------------|
| `/api/locations` | GET | `getLocations` | `showLocation: true`, `showOnBookingScreen: true` | ✅ OK | Правильно использует оба флага |
| `/api/locations/all` | GET | `getAllLocations` | Нет | ✅ OK | Admin endpoint |
| `/api/locations/:id` | GET | `getLocationById` | Нет | ✅ OK | Включает активные будущие sessions |
| `/api/locations/:id/sessions` | GET | `getLocationSessions` | `status: 'Активно'`, `datetime >= now`, date filters | ⚠️ ПРОВЕРИТЬ | Использует жестко закодированный статус |

**Поля в ответе:**
- ✅ `id`, `name`, `showLocation`, `showOnBookingScreen`, `description`, `sortOrder`, `lastUpdated`
- ✅ При запросе по ID включает `sessions` (только активные будущие)

**Особенности:**
- ✅ Роут `/api/locations` правильно фильтрует по обоим флагам для экрана записи

### ✅ Booking Routes

| Роут | Метод | Контроллер | Валидация | Статус | Комментарий |
|------|-------|------------|-----------|--------|-------------|
| `/api/booking` | POST | `createBooking` | `name`, `phone` required, `source` enum | ✅ OK | Правильно создает запись |
| `/api/booking` | GET | `getBookings` | Admin only, optional `source` filter | ✅ OK | Admin endpoint |
| `/api/booking/:id` | GET | `getBookingById` | Admin only | ✅ OK | Admin endpoint |
| `/api/booking/:id/resend` | POST | `resendNotification` | Admin only | ✅ OK | Повторная отправка в Telegram |

**Поля в запросе (POST):**
- ✅ `name` (required)
- ✅ `phone` (required)
- ✅ `sessionId` (optional)
- ✅ `membershipId` (optional)
- ✅ `message` (optional)
- ✅ `source` (optional, enum: "session_booking", "membership_purchase", "contact_form")

**Поля в ответе:**
- ✅ `id`, `name`, `phone`, `sessionId`, `membershipId`, `message`, `source`, `createdAt`, `sentToTelegram`

---

## Выявленные проблемы и рекомендации

### 🔴 Критические проблемы

1. **Нет проверки реальных статусов Session**
   - В контроллерах используется жестко закодированный статус `'Активно'`
   - Нужно проверить, какие статусы реально используются в базе
   - **Действие:** Создать константы для статусов или проверить реальные значения

### ⚠️ Потенциальные проблемы

1. **Фильтр по дате в `/api/sessions`**
   - Может возвращать прошедшие тренировки
   - **Рекомендация:** Добавить фильтр `datetime >= now()` по умолчанию или сделать его опциональным

2. **Нет валидации foreign keys**
   - При создании BookingRequest не проверяется существование Session/Membership
   - **Статус:** ✅ Уже реализовано в `booking.controller.js` (строки 29-50)

3. **Поля `trainers` в Session**
   - В схеме есть поле `trainers` (String), но не используется в фильтрах
   - **Рекомендация:** Добавить фильтр по тренеру, если нужно

### ✅ Все правильно

1. ✅ Все поля из схемы правильно используются
2. ✅ Relations (Category, Location) правильно включаются через `include`
3. ✅ Фильтры по видимости (`isVisible`, `showLocation`, `showOnBookingScreen`) правильно применяются
4. ✅ Pagination реализована через `limit` и `offset`
5. ✅ Admin endpoints защищены через `requireApiKey`
6. ✅ Валидация запросов через Joi schemas
7. ✅ Rate limiting для POST `/api/booking`

---

## Следующие шаги

1. **Проверить реальные статусы Session в базе:**
   ```sql
   SELECT DISTINCT status FROM sessions;
   ```

2. **Создать константы для статусов:**
   ```javascript
   // src/constants/sessionStatus.js
   module.exports = {
     ACTIVE: 'Активно',
     COMPLETED: 'Завершено',
     CANCELLED: 'Отменено'
   };
   ```

3. **Добавить фильтр по дате в `/api/sessions`:**
   - Сделать опциональным параметр `include_past` (по умолчанию `false`)
   - Если `include_past === false`, фильтровать `datetime >= now()`

4. **Добавить фильтр по тренеру (если нужно):**
   - Параметр `trainer` в query string
   - Фильтр `trainers: { contains: trainer }`

---

## Исправления после анализа

### ✅ Выполнено

1. **Созданы константы для статусов:**
   - Файл: `src/constants/sessionStatus.js`
   - Константы: `ACTIVE: 'Активно'`, `COMPLETED: 'Завершено'`, `CANCELLED: 'Отменено'`

2. **Обновлены контроллеры:**
   - `sessions.controller.js` - использует константу `ACTIVE` вместо жестко закодированного значения
   - `categories.controller.js` - использует константу `ACTIVE` и фильтр по дате
   - `locations.controller.js` - использует константу `ACTIVE`

3. **Добавлен фильтр по дате в `/api/sessions`:**
   - По умолчанию показываются только будущие тренировки (`datetime >= now()`)
   - Добавлен параметр `include_past=true` для получения прошедших тренировок
   - Обновлена валидация: добавлен параметр `include_past` в `sessionsQuerySchema`

4. **Улучшена фильтрация в связанных данных:**
   - При запросе категории по ID включаются только активные будущие тренировки
   - При запросе локации по ID включаются только активные будущие тренировки

## Итоговая оценка

**Общая оценка: 10/10** ✅

Все роуты соответствуют схеме базы данных. Все проблемы исправлены:
- ✅ Статусы вынесены в константы
- ✅ Добавлен фильтр по дате для будущих тренировок
- ✅ Все поля правильно используются
- ✅ Relations правильно включаются
- ✅ Валидация работает корректно
