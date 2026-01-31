# 📘 Руководство для фронтенд-разработчика

> **Версия API:** 1.0.0  
> **Последнее обновление:** 2026-01-31  
> **Production URL:** `https://apismash.braidx.tech/api`

---

## 📋 Содержание

1. [Быстрый старт](#быстрый-старт)
2. [Настройка API клиента](#настройка-api-клиента)
3. [Получение данных](#получение-данных)
4. [Отправка заявок](#отправка-заявок)
5. [Обработка ошибок](#обработка-ошибок)
6. [Примеры кода](#примеры-кода)
7. [Чеклист интеграции](#чеклист-интеграции)

---

## 🚀 Быстрый старт

### Базовый URL API

```javascript
// Production (используйте этот URL)
const API_BASE_URL = 'https://apismash.braidx.tech/api';

// Development (если бэкенд запущен локально)
// const API_BASE_URL = 'http://localhost:3000/api';
```

### Минимальный пример

```javascript
// Получить список видимых абонементов
const response = await fetch('https://apismash.braidx.tech/api/memberships');
const data = await response.json();

if (data.success) {
  console.log('Абонементы:', data.data);
}
```

---

## ⚙️ Настройка API клиента

### Рекомендуемая структура

```javascript
// src/config/api.js
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://apismash.braidx.tech/api';

class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Ошибка запроса');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
```

### Переменные окружения

Создайте файл `.env.local` (для Next.js) или `.env`:

```env
NEXT_PUBLIC_API_URL=https://apismash.braidx.tech/api
```

---

## 📊 Получение данных

### 1. Категории тренировок

**Получить все видимые категории:**

```javascript
GET /api/categories
```

**Пример запроса:**

```javascript
const response = await apiClient.get('/categories');
// или
const response = await fetch('https://apismash.braidx.tech/api/categories');
const data = await response.json();

// Структура ответа:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Тренировка",
      "sortOrder": 1,
      "isVisible": true,
      "lastUpdated": "2026-01-31T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 100,
    "offset": 0
  }
}
```

**Получить категорию по ID:**

```javascript
GET /api/categories/:id

const category = await apiClient.get('/categories/1');
```

---

### 2. Абонементы (Memberships)

**Получить все видимые абонементы:**

```javascript
GET /api/memberships
```

**Пример запроса:**

```javascript
const memberships = await apiClient.get('/memberships');

// Структура ответа:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Месячный абонемент",
      "type": "Обычный абик",
      "price": 5000,
      "sessionCount": 8,
      "isVisible": true,
      "lastUpdated": "2026-01-31T10:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Разовое посещение",
      "type": "Обычный абик",
      "price": 1200,
      "sessionCount": 1,
      "isVisible": false,  // ⚠️ Но этот абонемент нужен для разовых посещений!
      "lastUpdated": "2026-01-31T10:00:00.000Z"
    }
  ]
}
```

**⚠️ Важно:** Абонемент с `id=2` (разовое посещение, цена 1200 руб) может быть невидимым (`isVisible: false`), но его нужно получать отдельно для отображения опции "Разовое посещение".

**Получить конкретный абонемент (включая невидимые):**

```javascript
GET /api/memberships/:id

// Получить разовое посещение (id=2)
const singleSession = await apiClient.get('/memberships/2');
```

**Получить абонементы по типу:**

```javascript
GET /api/memberships/by-type/:type

const regularMemberships = await apiClient.get('/memberships/by-type/Обычный абик');
```

---

### 3. Локации (Locations)

**Получить все видимые локации для экрана записи:**

```javascript
GET /api/locations
```

**Пример запроса:**

```javascript
const locations = await apiClient.get('/locations');

// Структура ответа:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Зал №1",
      "showLocation": true,
      "showOnBookingScreen": true,  // ✅ Показывается на экране записи
      "description": "Основной зал",
      "sortOrder": 1,
      "lastUpdated": "2026-01-31T10:00:00.000Z"
    }
  ]
}
```

**Получить локацию по ID (с активными тренировками):**

```javascript
GET /api/locations/:id

const location = await apiClient.get('/locations/1');
// Включает массив sessions с активными тренировками
```

**Получить тренировки для конкретной локации:**

```javascript
GET /api/locations/:id/sessions

const locationSessions = await apiClient.get('/locations/1/sessions', {
  date_from: '2026-02-01',
  date_to: '2026-02-07'
});
```

---

### 4. Тренировки (Sessions)

**Получить список тренировок с фильтрами:**

```javascript
GET /api/sessions
```

**Параметры запроса (все опциональны):**

| Параметр | Тип | Описание | Пример |
|----------|-----|----------|--------|
| `date` | string (ISO) | Конкретная дата | `2026-02-01` |
| `date_from` | string (ISO) | Начало периода | `2026-02-01` |
| `date_to` | string (ISO) | Конец периода | `2026-02-07` |
| `category_id` | number | ID категории | `1` |
| `location_id` | number | ID локации | `1` |
| `available_only` | boolean | Только доступные | `true` |
| `include_past` | boolean | Включать прошедшие | `false` (по умолчанию) |
| `limit` | number | Лимит записей | `100` (макс 1000) |
| `offset` | number | Смещение | `0` |

**Примеры запросов:**

```javascript
// Все активные тренировки на сегодня
const today = new Date().toISOString().split('T')[0];
const sessions = await apiClient.get('/sessions', { date: today });

// Тренировки на неделю
const weekSessions = await apiClient.get('/sessions', {
  date_from: '2026-02-01',
  date_to: '2026-02-07',
  available_only: true
});

// Тренировки в конкретной локации
const locationSessions = await apiClient.get('/sessions', {
  location_id: 1,
  date_from: '2026-02-01'
});

// Тренировки определенной категории
const categorySessions = await apiClient.get('/sessions', {
  category_id: 1,
  available_only: true
});
```

**Структура ответа:**

```javascript
{
  "success": true,
  "data": [
    {
      "id": 123,
      "datetime": "2026-02-01T18:00:00.000Z",
      "location": {
        "id": 1,
        "name": "Зал №1"
      },
      "category": {
        "id": 1,
        "name": "Тренировка"
      },
      "trainers": "Иван Петров",
      "name": "Групповая тренировка",
      "maxSpots": 12,
      "availableSpots": 5,
      "status": "Активно",
      "lastUpdated": "2026-01-31T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 100,
    "offset": 0
  }
}
```

**Получить тренировку по ID:**

```javascript
GET /api/sessions/:id

const session = await apiClient.get('/sessions/123');
```

---

## 📝 Отправка заявок

### Единый эндпоинт для всех типов заявок

```javascript
POST /api/booking
```

**Все заявки отправляются в один Telegram чат.** Поле `source` опционально и влияет только на форматирование сообщения в Telegram.

### Структура запроса

```javascript
{
  "name": "Иван Иванов",           // ✅ Обязательно
  "phone": "+79001234567",         // ✅ Обязательно
  "sessionId": 123,                // Опционально (для записи на тренировку)
  "membershipId": 2,               // Опционально (для покупки абонемента)
  "message": "Дополнительная информация",  // Опционально
  "source": "session_booking"      // Опционально: "session_booking" | "membership_purchase" | "contact_form"
}
```

### Типы заявок

#### 1. Запись на тренировку

```javascript
const bookingResponse = await apiClient.post('/booking', {
  name: 'Иван Иванов',
  phone: '+79001234567',
  sessionId: 123,
  source: 'session_booking',
  message: 'Хочу записаться на тренировку'
});
```

#### 2. Покупка абонемента

```javascript
const membershipResponse = await apiClient.post('/booking', {
  name: 'Иван Иванов',
  phone: '+79001234567',
  membershipId: 1,
  source: 'membership_purchase',
  message: 'Хочу купить месячный абонемент'
});
```

#### 3. Контактная форма

```javascript
const contactResponse = await apiClient.post('/booking', {
  name: 'Иван Иванов',
  phone: '+79001234567',
  message: 'Есть вопросы по расписанию',
  source: 'contact_form'  // Можно не указывать, это значение по умолчанию
});
```

### Структура ответа

```javascript
{
  "success": true,
  "message": "Заявка успешно отправлена",
  "data": {
    "id": 456,
    "name": "Иван Иванов",
    "phone": "+79001234567",
    "sessionId": 123,
    "membershipId": null,
    "message": "Хочу записаться на тренировку",
    "source": "session_booking",
    "createdAt": "2026-01-31T12:00:00.000Z",
    "sentToTelegram": true
  }
}
```

### Ограничения (Rate Limiting)

- Максимум **5 запросов в минуту** с одного IP
- При превышении лимита вернется ошибка `429 Too Many Requests`

---

## ⚠️ Обработка ошибок

### Стандартная структура ошибки

```javascript
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "phone",
        "message": "\"phone\" is required"
      }
    ]
  }
}
```

### Коды ошибок

| Код | HTTP Status | Описание |
|-----|-------------|----------|
| `VALIDATION_ERROR` | 400 | Ошибка валидации данных |
| `UNAUTHORIZED` | 401 | Требуется аутентификация |
| `FORBIDDEN` | 403 | Доступ запрещен |
| `NOT_FOUND` | 404 | Ресурс не найден |
| `TOO_MANY_REQUESTS` | 429 | Превышен лимит запросов |
| `INTERNAL_ERROR` | 500 | Внутренняя ошибка сервера |

### Пример обработки ошибок

```javascript
async function sendBooking(data) {
  try {
    const response = await apiClient.post('/booking', data);
    return response;
  } catch (error) {
    if (error.response) {
      const { error: apiError } = error.response;
      
      if (apiError.code === 'VALIDATION_ERROR') {
        // Показать ошибки валидации пользователю
        apiError.details.forEach(detail => {
          console.error(`${detail.field}: ${detail.message}`);
        });
      } else if (apiError.code === 'TOO_MANY_REQUESTS') {
        alert('Слишком много запросов. Подождите немного.');
      } else {
        alert(`Ошибка: ${apiError.message}`);
      }
    } else {
      alert('Ошибка соединения с сервером');
    }
    throw error;
  }
}
```

---

## 💻 Примеры кода

### React Hook для получения данных

```javascript
// src/hooks/useMemberships.js
import { useState, useEffect } from 'react';
import { apiClient } from '../config/api';

export function useMemberships() {
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchMemberships() {
      try {
        setLoading(true);
        const response = await apiClient.get('/memberships');
        setMemberships(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMemberships();
  }, []);

  return { memberships, loading, error };
}
```

### React Hook для получения тренировок

```javascript
// src/hooks/useSessions.js
import { useState, useEffect } from 'react';
import { apiClient } from '../config/api';

export function useSessions(filters = {}) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSessions() {
      try {
        setLoading(true);
        const response = await apiClient.get('/sessions', filters);
        setSessions(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, [JSON.stringify(filters)]);

  return { sessions, loading, error };
}
```

### Компонент формы записи

```javascript
// src/components/BookingForm.jsx
import { useState } from 'react';
import { apiClient } from '../config/api';

export function BookingForm({ sessionId, membershipId }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = {
        ...formData,
        sessionId: sessionId || undefined,
        membershipId: membershipId || undefined,
        source: sessionId ? 'session_booking' : membershipId ? 'membership_purchase' : 'contact_form'
      };

      await apiClient.post('/booking', data);
      setSuccess(true);
      setFormData({ name: '', phone: '', message: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Ваше имя"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      <input
        type="tel"
        placeholder="Телефон"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        required
      />
      <textarea
        placeholder="Сообщение (необязательно)"
        value={formData.message}
        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
      />
      {error && <div className="error">{error}</div>}
      {success && <div className="success">Заявка отправлена!</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Отправка...' : 'Отправить'}
      </button>
    </form>
  );
}
```

### Получение разового посещения

```javascript
// Важно: получать отдельно, даже если isVisible: false
async function getSingleSessionMembership() {
  try {
    const response = await apiClient.get('/memberships/2');
    return response.data; // { id: 2, name: "Разовое посещение", price: 1200, ... }
  } catch (error) {
    console.error('Ошибка получения разового посещения:', error);
    return null;
  }
}
```

---

## ✅ Чеклист интеграции

### Базовые настройки

- [ ] Настроить базовый URL API (`https://apismash.braidx.tech/api`)
- [ ] Создать API клиент с обработкой ошибок
- [ ] Настроить переменные окружения

### Получение данных

- [ ] Реализовать получение категорий (`/api/categories`)
- [ ] Реализовать получение видимых абонементов (`/api/memberships`)
- [ ] Реализовать получение разового посещения (`/api/memberships/2`)
- [ ] Реализовать получение локаций (`/api/locations`)
- [ ] Реализовать получение тренировок с фильтрами (`/api/sessions`)

### Отправка заявок

- [ ] Реализовать форму записи на тренировку
- [ ] Реализовать форму покупки абонемента
- [ ] Реализовать контактную форму
- [ ] Добавить обработку ошибок валидации
- [ ] Добавить обработку rate limiting

### Дополнительно

- [ ] Добавить индикаторы загрузки
- [ ] Реализовать пагинацию (если нужно)
- [ ] Добавить кэширование данных (опционально)
- [ ] Протестировать все формы на разных устройствах

---

## 🔗 Полезные ссылки

- **Swagger документация:** `https://apismash.braidx.tech/api-docs` (после деплоя)
- **Health check:** `https://apismash.braidx.tech/api/health`

---

## ❓ Часто задаваемые вопросы

### Q: Как получить разовое посещение, если оно невидимо?

**A:** Используйте прямой запрос по ID:
```javascript
const singleSession = await apiClient.get('/memberships/2');
```

### Q: Нужно ли указывать `source` при отправке заявки?

**A:** Нет, это опционально. Если не указать, будет использовано значение по умолчанию `contact_form`.

### Q: Как фильтровать тренировки по дате?

**A:** Используйте параметры `date_from` и `date_to`:
```javascript
const sessions = await apiClient.get('/sessions', {
  date_from: '2026-02-01',
  date_to: '2026-02-07'
});
```

### Q: Что делать при ошибке 429 (Too Many Requests)?

**A:** Это означает превышение лимита запросов. Подождите минуту перед следующим запросом.

### Q: Как получить только доступные тренировки?

**A:** Используйте параметр `available_only: true`:
```javascript
const sessions = await apiClient.get('/sessions', {
  available_only: true
});
```

---

**Готово к использованию!** 🎉

Если возникнут вопросы, обращайтесь к бэкенд-разработчику.
