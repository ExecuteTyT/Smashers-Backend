# Документация по интеграции фронтенда с бэкенд API

> **Последнее обновление:** 2026-01-31  
> **Версия API:** 1.0.0  
> **Production URL:** `https://apismash.braidx.tech/api`

> **📘 Рекомендуется:** Для начала работы используйте [**FRONTEND_DEVELOPER_GUIDE.md**](./FRONTEND_DEVELOPER_GUIDE.md) - более структурированное и понятное руководство с актуальным URL API.

## 📋 Содержание

1. [Быстрый старт](#быстрый-старт)
2. [Базовый URL и настройка](#1-базовый-url)
3. [Эндпоинты для получения данных](#2-эндпоинты-для-получения-данных)
4. [Отправка заявок](#3-отправка-заявок)
5. [Обработка ошибок](#4-обработка-ошибок)
6. [Примеры реализации](#5-примеры-реализации)
7. [Чеклист для фронтенд-разработчика](#6-чеклист-для-фронтенд-разработчика)

---

## 🚀 Быстрый старт

### ⚡ Production URL (используйте этот URL)

```
https://apismash.braidx.tech/api
```

**Все примеры в документации используют этот URL для production.**

### Настройка базового URL

```javascript
// config/api.js
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://apismash.braidx.tech/api'  // Production URL
  : 'http://localhost:3000/api';  // Development URL

export default API_BASE_URL;
```

### Минимальный пример запроса

```javascript
// Получить все видимые абонементы
const response = await fetch(`${API_BASE_URL}/memberships`);
const { success, data } = await response.json();

if (success) {
  console.log('Абонементы:', data);
}
```

> **💡 Важно:** Production URL уже настроен: `https://apismash.braidx.tech/api`  
> Для локальной разработки используйте: `http://localhost:3000/api`

---

## Анализ текущей реализации бэкенда

### ✅ Реализация заявок

Бэкенд правильно реализован с единым эндпоинтом `/api/booking`, который обрабатывает все типы заявок.

**Важно:** Все заявки отправляются в один Telegram чат (`TELEGRAM_MANAGER_CHAT_ID`), независимо от типа. Поле `source` опционально и влияет только на форматирование сообщения в Telegram:

- **`session_booking`** - форматирует как запись на тренировку (показывает детали тренировки)
- **`membership_purchase`** - форматирует как покупку абонемента (показывает детали абонемента)
- **`contact_form`** - стандартное сообщение (используется по умолчанию, если `source` не указан)

**Минимальные требования:** Для отправки заявки достаточно передать только `name` и `phone`. Все остальные поля опциональны.

### Структура данных

Все формы используют одну и ту же структуру данных. Обязательны только `name` и `phone`. Остальные поля опциональны и используются для добавления дополнительной информации в Telegram сообщение.

## Документация для фронтенда

### 1. Базовый URL

**Development (локальная разработка):**
```
http://localhost:3000/api
```

**Production (используйте этот URL):**
```
https://apismash.braidx.tech/api
```

**Важно:** Для production используйте URL: `https://apismash.braidx.tech/api`

**Настройка CORS:** Бэкенд автоматически разрешает запросы с доменов, указанных в `ALLOWED_ORIGINS` (настраивается на сервере).

### 2. Эндпоинты для получения данных

#### 2.1. Категории

```javascript
GET /api/categories
GET /api/categories/:id
```

**Параметры запроса (опционально):**
- `limit` - количество записей (по умолчанию 100, максимум 1000)
- `offset` - смещение для пагинации (по умолчанию 0)

**Пример:**
```javascript
// Production
const response = await fetch('https://apismash.braidx.tech/api/categories?limit=50');
// Development
// const response = await fetch('http://localhost:3000/api/categories?limit=50');
const data = await response.json();
// { success: true, data: [...], pagination: {...} }
```

**Структура ответа:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Тренировка",
      "sortOrder": 1,
      "isVisible": true,
      "lastUpdated": "2024-01-29T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 10,
    "limit": 50,
    "offset": 0
  }
}
```

#### 2.2. Абонементы

```javascript
GET /api/memberships
GET /api/memberships/:id
GET /api/memberships/by-type/:type
```

**Важно:**
- Эндпоинт `/api/memberships` возвращает **только видимые абонементы** (`isVisible: true`)
- Для получения конкретного абонемента по ID (включая невидимые) используйте `/api/memberships/:id`
- **Специальный абонемент для разовых посещений**: Абонемент с `id=2` ("Разовая тренировка") используется для разовых посещений, даже если он не видимый в списке. Всегда получайте его через `/api/memberships/2` для отображения цены разового посещения (1200 руб).

**Пример:**
```javascript
// Получить все видимые абонементы (для отображения в каталоге)
const memberships = await fetch('/api/memberships').then(r => r.json());

// Получить абонементы по типу (только видимые)
const byType = await fetch('/api/memberships/by-type/Обычный абик').then(r => r.json());

// Получить конкретный абонемент по ID (включая невидимые)
// Используйте для получения абонемента с id=2 (разовая тренировка)
const singleSession = await fetch('/api/memberships/2').then(r => r.json());
```

**Структура ответа:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Абонемент на месяц",
      "type": "Обычный абик",
      "price": 5000,
      "sessionCount": 8,
      "isVisible": true,
      "lastUpdated": "2024-01-29T10:00:00.000Z"
    }
  ]
}
```

**Рекомендации по использованию:**
1. Для каталога абонементов используйте `/api/memberships` - он вернет только видимые абонементы
2. Для разовых посещений всегда получайте абонемент с `id=2` через `/api/memberships/2` для отображения цены (1200 руб)
3. При отправке заявки на разовое посещение используйте `membershipId: 2` в запросе `/api/booking`

#### 2.3. Тренировки (Sessions)

```javascript
GET /api/sessions
GET /api/sessions/:id
GET /api/sessions/upcoming
GET /api/sessions/by-date/:date
```

**Фильтры для `/api/sessions`:**
- `date` - конкретная дата (YYYY-MM-DD)
- `date_from` - начальная дата (YYYY-MM-DD)
- `date_to` - конечная дата (YYYY-MM-DD)
- `category_id` - ID категории
- `location_id` - ID локации
- `available_only` - только с доступными местами (true/false)
- `include_past` - включить прошедшие тренировки (true/false, по умолчанию false)
- `limit` - лимит записей (по умолчанию 100, максимум 1000)
- `offset` - смещение для пагинации (по умолчанию 0)

**Важно:**
- По умолчанию `/api/sessions` возвращает **только будущие активные тренировки** (`datetime >= now()`)
- Для получения прошедших тренировок используйте параметр `include_past=true`
- Если указаны `date_from` или `date_to`, фильтр по будущим датам применяется только если `include_past=false`

**Примеры:**
```javascript
// Тренировки на конкретную дату (только будущие)
const sessions = await fetch('/api/sessions?date=2024-01-29').then(r => r.json());

// Все будущие тренировки (по умолчанию)
const allFuture = await fetch('/api/sessions').then(r => r.json());

// Включить прошедшие тренировки
const allSessions = await fetch('/api/sessions?include_past=true').then(r => r.json());

// Тренировки с фильтрами (только будущие с доступными местами)
const filtered = await fetch('/api/sessions?category_id=1&location_id=2&available_only=true').then(r => r.json());

// Тренировки за период (только будущие)
const period = await fetch('/api/sessions?date_from=2024-01-01&date_to=2024-01-31').then(r => r.json());

// Тренировки за период (включая прошедшие)
const periodWithPast = await fetch('/api/sessions?date_from=2024-01-01&date_to=2024-01-31&include_past=true').then(r => r.json());

// Предстоящие тренировки (только с доступными местами)
const upcoming = await fetch('/api/sessions/upcoming').then(r => r.json());

// Тренировки по дате
const byDate = await fetch('/api/sessions/by-date/2024-01-29').then(r => r.json());
```

**Структура ответа:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "datetime": "2024-01-29T18:00:00.000Z",
      "locationId": 1,
      "location": {
        "id": 1,
        "name": "Зал 1",
        "showLocation": true,
        "showOnBookingScreen": true
      },
      "trainers": "Иван Иванов",
      "name": "Тренировка для начинающих",
      "categoryId": 1,
      "category": {
        "id": 1,
        "name": "Тренировка"
      },
      "maxSpots": 12,
      "availableSpots": 5,
      "price": 1200,
      "status": "Активно",
      "lastUpdated": "2024-01-29T10:00:00.000Z"
    }
  ]
}
```

**Важно:**
- Поле `price` (number, опционально) - цена занятия в рублях. Может быть `null`, если цена не указана.
- Поле `availableSpots` обновляется автоматически каждый час через парсинг данных из Django админки.
- Данные о занятиях актуализируются каждый час, поэтому информация о свободных местах всегда актуальна.

#### 2.4. Локации

```javascript
GET /api/locations
GET /api/locations/:id
GET /api/locations/:id/sessions
```

**Важно:**
- Эндпоинт `/api/locations` возвращает только локации, где **`showLocation: true` И `showOnBookingScreen: true`**
- Эти локации подходят для отображения на экране записи
- Для получения конкретной локации по ID (включая невидимые) используйте `/api/locations/:id`
- Локации сортируются по полю `sortOrder` (по возрастанию)

**Поля видимости:**
- `showLocation` - показывать локацию в общем списке
- `showOnBookingScreen` - показывать на экране записи
- Для отображения на сайте нужны локации, где оба поля `true`

**Пример:**
```javascript
// Получить все видимые локации для экрана записи
const locations = await fetch('/api/locations').then(r => r.json());

// Получить конкретную локацию по ID (включая невидимые)
const location = await fetch('/api/locations/1').then(r => r.json());

// Получить тренировки в конкретной локации
const locationSessions = await fetch('/api/locations/1/sessions').then(r => r.json());

// Получить тренировки в локации с фильтрами по дате
const filteredSessions = await fetch('/api/locations/1/sessions?date_from=2024-01-01&date_to=2024-01-31').then(r => r.json());
```

**Структура ответа:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Центр бадминтона",
      "showLocation": true,
      "showOnBookingScreen": true,
      "description": "Учебно-спортивный комплекс Центр бадминтона",
      "sortOrder": 1,
      "lastUpdated": "2024-01-29T10:00:00.000Z"
    }
  ]
}
```

**Параметры для `/api/locations/:id/sessions`:**
- `limit` - количество тренировок (по умолчанию 50)
- `date_from` - начальная дата (YYYY-MM-DD)
- `date_to` - конечная дата (YYYY-MM-DD)
- Если даты не указаны, возвращаются только будущие тренировки

### 3. Отправка заявок

#### 3.1. Единый эндпоинт для всех форм

```javascript
POST /api/booking
```

#### 3.2. Схема данных

**Обязательные поля для всех типов:**
- `name` (string, 2-100 символов) - имя клиента
- `phone` (string, 10-20 символов) - телефон

**Опциональные поля:**
- `message` (string, до 1000 символов) - дополнительное сообщение
- `source` (string, опционально) - тип заявки, влияет только на форматирование сообщения в Telegram:
  - `'session_booking'` - форматирует как запись на тренировку (показывает детали тренировки)
  - `'membership_purchase'` - форматирует как покупку абонемента (показывает детали абонемента)
  - `'contact_form'` - стандартное сообщение (по умолчанию, если не указано)

**Специфичные поля:**
- `sessionId` (number, опционально) - ID тренировки (если передается, бэкенд добавит детали тренировки в сообщение)
- `membershipId` (number, опционально) - ID абонемента (если передается, бэкенд добавит детали абонемента в сообщение)

**Важно:** Поле `source` необязательно. Если его не передавать, будет использоваться `'contact_form'` по умолчанию. Все заявки отправляются в один Telegram чат независимо от `source`. Поле `source` влияет только на форматирование и информативность сообщения в Telegram.

#### 3.3. Примеры использования

**Минимальная заявка (без source):**
```javascript
// Простейший вариант - только имя и телефон
const bookingData = {
  name: 'Иван Иванов',
  phone: '+7 (999) 123-45-67'
};

const response = await fetch('/api/booking', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(bookingData)
});

const result = await response.json();
// { success: true, data: { id: 1, message: 'Заявка успешно отправлена', notificationSent: true } }
```

**Запись на тренировку (с деталями):**
```javascript
// Если передать sessionId, бэкенд автоматически добавит детали тренировки в Telegram сообщение
const bookingData = {
  name: 'Иван Иванов',
  phone: '+7 (999) 123-45-67',
  sessionId: 123,
  message: 'Хочу записаться на тренировку',
  source: 'session_booking' // опционально, влияет только на форматирование
};

const response = await fetch('/api/booking', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(bookingData)
});
```

**Покупка абонемента (с деталями):**
```javascript
// Если передать membershipId, бэкенд автоматически добавит детали абонемента в Telegram сообщение
const membershipData = {
  name: 'Петр Петров',
  phone: '89991234567',
  membershipId: 5,
  message: 'Интересует абонемент на месяц',
  source: 'membership_purchase' // опционально, влияет только на форматирование
};

const response = await fetch('/api/booking', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(membershipData)
});
```

**Разовое посещение (используя абонемент id=2):**
```javascript
// Для разового посещения используйте membershipId: 2
const singleSessionData = {
  name: 'Анна Смирнова',
  phone: '+7 (999) 888-77-66',
  membershipId: 2, // Абонемент "Разовая тренировка" (1200 руб)
  message: 'Хочу записаться на разовую тренировку',
  source: 'membership_purchase' // опционально
};

const response = await fetch('/api/booking', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(singleSessionData)
});
```

**Контактная форма:**
```javascript
// Можно вообще не передавать source - будет использован 'contact_form' по умолчанию
const contactData = {
  name: 'Мария Сидорова',
  phone: '+79991234567',
  message: 'У меня вопрос о расписании'
  // source не обязателен
};

const response = await fetch('/api/booking', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(contactData)
});
```

**Структура успешного ответа:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "message": "Заявка успешно отправлена",
    "notificationSent": true
  }
}
```

### 4. Обработка ошибок

**Структура ошибки:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "name", "message": "Имя должно содержать минимум 2 символа" },
      { "field": "phone", "message": "Некорректный формат телефона" }
    ]
  }
}
```

**Коды ошибок:**
- `VALIDATION_ERROR` (400) - ошибка валидации
- `NOT_FOUND` (404) - ресурс не найден (например, sessionId или membershipId не существует)
- `RATE_LIMIT_EXCEEDED` (429) - превышен лимит запросов
- `INTERNAL_ERROR` (500) - внутренняя ошибка сервера

**Пример обработки:**
```javascript
try {
  const response = await fetch('/api/booking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const result = await response.json();

  if (!response.ok) {
    if (result.error?.code === 'VALIDATION_ERROR') {
      // Показать ошибки валидации пользователю
      result.error.details.forEach(err => {
        console.error(`${err.field}: ${err.message}`);
        // Отобразить ошибку в UI для соответствующего поля
      });
    } else if (result.error?.code === 'NOT_FOUND') {
      console.error('Ресурс не найден:', result.error.message);
    } else if (result.error?.code === 'RATE_LIMIT_EXCEEDED') {
      console.error('Слишком много запросов. Попробуйте позже.');
    }
    throw new Error(result.error?.message || 'Ошибка отправки заявки');
  }

  // Успешная отправка
  console.log('Заявка отправлена:', result.data.message);
  return result.data;
} catch (error) {
  console.error('Ошибка:', error.message);
  throw error;
}
```

### 5. Rate Limiting

Эндпоинт `/api/booking` имеет строгий rate limiting:
- По умолчанию: 60 запросов в минуту
- При превышении лимита возвращается 429 статус

**Рекомендация:** Добавьте задержку между повторными попытками отправки формы и показывайте пользователю сообщение о необходимости подождать.

**Пример обработки rate limiting:**
```javascript
const response = await fetch('/api/booking', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After') || 60;
  console.error(`Превышен лимит запросов. Попробуйте через ${retryAfter} секунд.`);
  // Показать пользователю сообщение
}
```

### 6. CORS настройки

Бэкенд настроен на работу с определенными доменами через `ALLOWED_ORIGINS`. Убедитесь, что ваш фронтенд домен добавлен в переменную окружения на бэкенде.

**Формат в .env (на сервере):**
```
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://braidx.tech,https://www.braidx.tech,https://smashers.bookbot.olegb.dev
```

**Важно:** Убедитесь, что домен вашего фронтенда добавлен в `ALLOWED_ORIGINS` на бэкенде.

### 7. Health Check

```javascript
GET /api/health
GET /api/health/detailed
```

Используйте для проверки доступности API.

**Пример:**
```javascript
const checkHealth = async () => {
  try {
    const API_URL = 'https://apismash.braidx.tech/api'; // Production
    // const API_URL = 'http://localhost:3000/api'; // Development
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    return false;
  }
};
```

## Рекомендации по реализации на фронтенде

### 1. Создание API клиента

```javascript
// api/client.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://apismash.braidx.tech/api'
    : 'http://localhost:3000/api');

class ApiError extends Error {
  constructor(error) {
    super(error.message || 'Ошибка запроса');
    this.code = error.code;
    this.details = error.details;
  }
}

class ApiClient {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(data.error || { message: 'Ошибка запроса' });
    }

    return data;
  }

  // Методы для получения данных
  async getCategories(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/categories${query ? `?${query}` : ''}`);
  }

  async getCategoryById(id) {
    return this.request(`/categories/${id}`);
  }

  async getSessions(filters = {}) {
    const query = new URLSearchParams(
      Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = value;
        }
        return acc;
      }, {})
    ).toString();
    return this.request(`/sessions${query ? `?${query}` : ''}`);
  }

  async getSessionById(id) {
    return this.request(`/sessions/${id}`);
  }

  async getUpcomingSessions() {
    return this.request('/sessions/upcoming');
  }

  async getSessionsByDate(date) {
    return this.request(`/sessions/by-date/${date}`);
  }

  async getMemberships() {
    return this.request('/memberships');
  }

  async getMembershipById(id) {
    return this.request(`/memberships/${id}`);
  }

  // Получить абонемент для разовых посещений (id=2)
  async getSingleSessionMembership() {
    return this.request('/memberships/2');
  }

  async getMembershipsByType(type) {
    return this.request(`/memberships/by-type/${encodeURIComponent(type)}`);
  }

  async getLocations() {
    return this.request('/locations');
  }

  async getLocationById(id) {
    return this.request(`/locations/${id}`);
  }

  async getLocationSessions(id, filters = {}) {
    const query = new URLSearchParams(
      Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = value;
        }
        return acc;
      }, {})
    ).toString();
    return this.request(`/locations/${id}/sessions${query ? `?${query}` : ''}`);
  }

  // Метод для отправки заявки
  async createBooking(bookingData) {
    return this.request('/booking', {
      method: 'POST',
      body: bookingData
    });
  }

  // Health check
  async checkHealth() {
    return this.request('/health');
  }

  async checkDetailedHealth() {
    return this.request('/health/detailed');
  }
}

export default new ApiClient();
```

### 2. React Hook для заявок

```javascript
// hooks/useBooking.js
import { useState } from 'react';
import apiClient from '../api/client';

export function useBooking() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submitBooking = async (bookingData) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.createBooking(bookingData);
      return { success: true, data: result.data };
    } catch (err) {
      setError(err);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  return { submitBooking, loading, error };
}
```

### 3. Компонент формы записи на тренировку

```javascript
// components/SessionBookingForm.jsx
import { useState } from 'react';
import { useBooking } from '../hooks/useBooking';

export function SessionBookingForm({ sessionId, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    message: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const { submitBooking, loading, error } = useBooking();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    
    const bookingData = {
      ...formData,
      ...(sessionId && { sessionId }),
      // source опционально - можно не передавать
      source: 'session_booking'
    };

    const result = await submitBooking(bookingData);
    
    if (result.success) {
      // Успешная отправка
      if (onSuccess) {
        onSuccess(result.data);
      }
      // Сброс формы
      setFormData({ name: '', phone: '', message: '' });
    } else if (result.error?.details) {
      // Обработка ошибок валидации
      const errors = {};
      result.error.details.forEach(err => {
        errors[err.field] = err.message;
      });
      setFieldErrors(errors);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="name">Имя *</label>
        <input
          id="name"
          type="text"
          placeholder="Ваше имя"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          minLength={2}
          maxLength={100}
        />
        {fieldErrors.name && <span className="error">{fieldErrors.name}</span>}
      </div>

      <div>
        <label htmlFor="phone">Телефон *</label>
        <input
          id="phone"
          type="tel"
          placeholder="+7 (999) 123-45-67"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
        />
        {fieldErrors.phone && <span className="error">{fieldErrors.phone}</span>}
      </div>

      <div>
        <label htmlFor="message">Сообщение (необязательно)</label>
        <textarea
          id="message"
          placeholder="Дополнительная информация"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          maxLength={1000}
          rows={4}
        />
        {fieldErrors.message && <span className="error">{fieldErrors.message}</span>}
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Отправка...' : 'Записаться на тренировку'}
      </button>

      {error && !error.details && (
        <div className="error">{error.message}</div>
      )}
    </form>
  );
}
```

### 4. Компонент формы покупки абонемента

```javascript
// components/MembershipPurchaseForm.jsx
import { useState } from 'react';
import { useBooking } from '../hooks/useBooking';

export function MembershipPurchaseForm({ membershipId, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    message: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const { submitBooking, loading, error } = useBooking();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    
    const bookingData = {
      ...formData,
      ...(membershipId && { membershipId }),
      // source опционально - можно не передавать
      source: 'membership_purchase'
    };

    const result = await submitBooking(bookingData);
    
    if (result.success) {
      if (onSuccess) {
        onSuccess(result.data);
      }
      setFormData({ name: '', phone: '', message: '' });
    } else if (result.error?.details) {
      const errors = {};
      result.error.details.forEach(err => {
        errors[err.field] = err.message;
      });
      setFieldErrors(errors);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="name">Имя *</label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          minLength={2}
          maxLength={100}
        />
        {fieldErrors.name && <span className="error">{fieldErrors.name}</span>}
      </div>

      <div>
        <label htmlFor="phone">Телефон *</label>
        <input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
        />
        {fieldErrors.phone && <span className="error">{fieldErrors.phone}</span>}
      </div>

      <div>
        <label htmlFor="message">Сообщение (необязательно)</label>
        <textarea
          id="message"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          maxLength={1000}
          rows={4}
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Отправка...' : 'Оформить заявку'}
      </button>

      {error && !error.details && (
        <div className="error">{error.message}</div>
      )}
    </form>
  );
}
```

### 5. Компонент контактной формы

```javascript
// components/ContactForm.jsx
import { useState } from 'react';
import { useBooking } from '../hooks/useBooking';

export function ContactForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    message: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const { submitBooking, loading, error } = useBooking();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    
    const bookingData = {
      ...formData
      // source необязателен - будет использован 'contact_form' по умолчанию
    };

    const result = await submitBooking(bookingData);
    
    if (result.success) {
      if (onSuccess) {
        onSuccess(result.data);
      }
      setFormData({ name: '', phone: '', message: '' });
    } else if (result.error?.details) {
      const errors = {};
      result.error.details.forEach(err => {
        errors[err.field] = err.message;
      });
      setFieldErrors(errors);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="name">Имя *</label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          minLength={2}
          maxLength={100}
        />
        {fieldErrors.name && <span className="error">{fieldErrors.name}</span>}
      </div>

      <div>
        <label htmlFor="phone">Телефон *</label>
        <input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
        />
        {fieldErrors.phone && <span className="error">{fieldErrors.phone}</span>}
      </div>

      <div>
        <label htmlFor="message">Сообщение *</label>
        <textarea
          id="message"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          required
          maxLength={1000}
          rows={6}
        />
        {fieldErrors.message && <span className="error">{fieldErrors.message}</span>}
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Отправка...' : 'Отправить сообщение'}
      </button>

      {error && !error.details && (
        <div className="error">{error.message}</div>
      )}
    </form>
  );
}
```

### 6. React Hook для получения данных

```javascript
// hooks/useApiData.js
import { useState, useEffect } from 'react';
import apiClient from '../api/client';

export function useCategories() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await apiClient.getCategories();
        setData(result.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}

export function useSessions(filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await apiClient.getSessions(filters);
        setData(result.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [JSON.stringify(filters)]);

  return { data, loading, error };
}

export function useMemberships() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await apiClient.getMemberships();
        setData(result.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}

export function useLocations() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await apiClient.getLocations();
        setData(result.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}
```

## Чек-лист для фронтенда

- [ ] Настроить базовый URL API: `https://apismash.braidx.tech/api` (production) или `http://localhost:3000/api` (development)
- [ ] Использовать переменную окружения `REACT_APP_API_URL` или `NEXT_PUBLIC_API_URL` для настройки URL
- [ ] Реализовать получение категорий (`GET /api/categories`)
- [ ] Реализовать получение абонементов (`GET /api/memberships`) - только видимые
- [ ] Реализовать получение абонемента для разовых посещений (`GET /api/memberships/2`) - для отображения цены разового посещения
- [ ] Реализовать получение тренировок с фильтрами (`GET /api/sessions`)
- [ ] Реализовать получение локаций (`GET /api/locations`) - только видимые для экрана записи (`showLocation: true` И `showOnBookingScreen: true`)
- [ ] Создать форму записи на тренировку (можно передать `sessionId` для добавления деталей в Telegram)
- [ ] Создать форму покупки абонемента (можно передать `membershipId` для добавления деталей в Telegram)
- [ ] Создать контактную форму (поле `source` необязательно)
- [ ] Добавить валидацию полей на фронтенде (имя 2-100 символов, телефон 10-20 символов)
- [ ] Реализовать обработку ошибок валидации с отображением для каждого поля
- [ ] Реализовать обработку других типов ошибок (404, 429, 500)
- [ ] Добавить индикаторы загрузки при отправке форм
- [ ] Настроить обработку rate limiting (429) с сообщением пользователю
- [ ] Добавить проверку доступности API (health check) при загрузке приложения
- [ ] Убедиться, что домен фронтенда добавлен в `ALLOWED_ORIGINS` на бэкенде
- [ ] Протестировать все три типа форм заявок
- [ ] Добавить успешные сообщения после отправки заявки
- [ ] Реализовать сброс формы после успешной отправки

## Важные замечания

1. **Единый эндпоинт**: Все заявки используют один и тот же эндпоинт `/api/booking`. Поле `source` опционально и влияет только на форматирование сообщения в Telegram.

2. **Telegram уведомления**: Все заявки автоматически отправляются в один Telegram чат (`TELEGRAM_MANAGER_CHAT_ID`), независимо от значения `source`. На фронтенде не требуется дополнительная настройка.

3. **Поле source необязательно**: Если не передавать `source`, будет использоваться `'contact_form'` по умолчанию. Все заявки будут отправлены в Telegram в любом случае.

4. **Детали в сообщении**: Если передать `sessionId` или `membershipId`, бэкенд автоматически добавит соответствующие детали (дата тренировки, название абонемента и т.д.) в Telegram сообщение, даже без указания `source`.

5. **Фильтрация абонементов по видимости**: 
   - Эндпоинт `/api/memberships` возвращает **только видимые абонементы** (`isVisible: true`)
   - Используйте этот эндпоинт для отображения каталога абонементов на сайте
   - Для получения конкретного абонемента (включая невидимые) используйте `/api/memberships/:id`

6. **Фильтрация локаций по видимости**:
   - Эндпоинт `/api/locations` возвращает только локации, где **`showLocation: true` И `showOnBookingScreen: true`**
   - Эти локации подходят для отображения на экране записи
   - Для получения конкретной локации (включая невидимые) используйте `/api/locations/:id`
   - Локации сортируются по полю `sortOrder` (по возрастанию)

7. **Абонемент для разовых посещений (id=2)**:
   - Абонемент с `id=2` ("Разовая тренировка", цена 1200 руб) используется для разовых посещений
   - Этот абонемент может быть невидимым в Django админке, но его нужно получать через `/api/memberships/2`
   - Используйте этот абонемент для отображения цены разового посещения на сайте
   - При отправке заявки на разовое посещение используйте `membershipId: 2` в запросе `/api/booking`

8. **Валидация**: Бэкенд валидирует все данные. Рекомендуется также добавить валидацию на фронтенде для лучшего UX.

9. **Формат телефона**: Бэкенд принимает различные форматы телефона (с пробелами, скобками, дефисами). Валидация: 10-20 символов, только цифры, пробелы, +, -, (, ).

10. **Rate Limiting**: Эндпоинт `/api/booking` имеет строгий rate limiting. Убедитесь, что пользователь не может отправлять множественные запросы быстро.

11. **Фильтрация тренировок по дате**:
    - По умолчанию `/api/sessions` возвращает **только будущие активные тренировки** (`datetime >= now()`)
    - Для получения прошедших тренировок используйте параметр `include_past=true`
    - Это важно для отображения расписания - пользователи обычно хотят видеть только предстоящие тренировки
    - Если нужна история тренировок, используйте `include_past=true` явно

12. **Обработка ошибок**: Всегда проверяйте `response.ok` и обрабатывайте ошибки. Структура ошибок содержит полезную информацию для отображения пользователю.

## Заключение

Бэкенд реализован правильно - все заявки отправляются в один Telegram чат через единый эндпоинт `/api/booking`. 

**Минимальные требования для отправки заявки:**
- `name` (обязательно)
- `phone` (обязательно)
- Остальные поля опциональны

**Поле `source` опционально** и влияет только на форматирование сообщения в Telegram:
- Если не передавать `source` - будет использован `'contact_form'` по умолчанию
- Если передать `sessionId` - бэкенд автоматически добавит детали тренировки в сообщение
- Если передать `membershipId` - бэкенд автоматически добавит детали абонемента в сообщение
- Поле `source` можно использовать для более информативного форматирования, но это не обязательно

**Работа с абонементами:**
- Используйте `/api/memberships` для получения списка видимых абонементов (для каталога)
- Используйте `/api/memberships/2` для получения информации о разовом посещении (цена 1200 руб)
- Абонемент с `id=2` используется для разовых посещений, даже если он не видимый в списке
- При отправке заявки на разовое посещение используйте `membershipId: 2`

Все данные из Django админки доступны через соответствующие GET эндпоинты и автоматически синхронизируются с базой данных.

---

## 📍 Production URL

**Используйте этот URL для всех запросов в production:**

```
https://apismash.braidx.tech/api
```

**Примеры полных URL:**
- Health: `https://apismash.braidx.tech/api/health`
- Абонементы: `https://apismash.braidx.tech/api/memberships`
- Локации: `https://apismash.braidx.tech/api/locations`
- Тренировки: `https://apismash.braidx.tech/api/sessions`
- Заявки: `POST https://apismash.braidx.tech/api/booking`

**Для локальной разработки:**
```
http://localhost:3000/api
```

---

## 🔄 Последние обновления (2026-01-31)

### Изменения в API тренировок

1. **Добавлено поле `price`** в ответы `/api/sessions`:
   - Тип: `number | null`
   - Описание: Цена занятия в рублях
   - Может быть `null`, если цена не указана

2. **Автоматическое обновление данных**:
   - Поле `availableSpots` (осталось мест) обновляется автоматически каждый час
   - Данные о занятиях актуализируются каждый час через парсинг Django админки
   - Информация о свободных местах всегда актуальна

3. **Источник данных изменен**:
   - Парсер теперь использует таблицу "Занятия" вместо "Будущие тренировки"
   - Данные фильтруются по текущей дате и будущим датам
   - Парсинг включает детальные страницы для получения актуального количества свободных мест

### Пример обновленного ответа

```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "datetime": "2026-02-01T18:00:00.000Z",
      "location": { "id": 1, "name": "Зал №1" },
      "category": { "id": 1, "name": "Тренировка" },
      "trainers": "Иван Петров",
      "name": "Групповая тренировка",
      "maxSpots": 12,
      "availableSpots": 5,
      "price": 1200,
      "status": "Активно",
      "lastUpdated": "2026-01-31T10:00:00.000Z"
    }
  ]
}
```

---

**Документация готова к использованию!** 🎉
