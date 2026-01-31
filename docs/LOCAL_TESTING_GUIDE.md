# Руководство по локальному тестированию бэкенда

## Быстрый старт для локального тестирования

### Шаг 1: Проверка подключения к базе данных

Убедитесь, что PostgreSQL запущен и доступен:

```bash
# Если база на удаленном сервере, проверьте подключение
cd smashers-backend
npx prisma db pull  # Проверка подключения
```

Если база на удаленном сервере, убедитесь что:
- В `.env` указан правильный `DATABASE_URL`
- Сервер доступен из вашей сети
- Порт 5432 открыт (или используйте SSH туннель)

### Шаг 2: Настройка переменных окружения

Откройте `.env` и проверьте/настройте:

```env
# Server
NODE_ENV=development
PORT=3000

# Database (уже настроена)
DATABASE_URL=postgresql://smashers:password@your-server-ip:5432/smashers_db

# CORS - ВАЖНО для фронтенда!
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:5174,http://127.0.0.1:3000,http://127.0.0.1:5173

# Django Admin (для парсера)
DJANGO_URL=https://smashers.bookbot.olegb.dev/admin
DJANGO_USERNAME=your_username
DJANGO_PASSWORD=your_password

# Telegram (опционально для тестирования)
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_MANAGER_CHAT_ID=your_chat_id

# API Key (для админских эндпоинтов)
API_KEY=test_api_key_123
```

**Важно для CORS:**
- Добавьте все порты, на которых может работать фронтенд
- Обычно Next.js: `3000`, Vite: `5173`, Create React App: `3000`

### Шаг 3: Установка зависимостей (если еще не установлены)

```bash
cd smashers-backend
npm install
```

### Шаг 4: Применение миграций базы данных

```bash
# Генерация Prisma Client
npx prisma generate

# Применение миграций (если нужно)
npx prisma migrate deploy
```

### Шаг 5: Запуск бэкенда

```bash
# Вариант 1: Обычный запуск (для разработки)
npm run dev

# Вариант 2: Запуск с автоперезагрузкой (если настроено)
npm start
```

Бэкенд должен запуститься на `http://localhost:3000`

### Шаг 6: Проверка работы API

Откройте в браузере или через curl:

```bash
# Health check
curl http://localhost:3000/api/health

# Должен вернуть: {"status":"ok"}

# Проверка категорий
curl http://localhost:3000/api/categories

# Проверка абонементов
curl http://localhost:3000/api/memberships

# Проверка локаций
curl http://localhost:3000/api/locations

# Проверка тренировок
curl http://localhost:3000/api/sessions
```

Или откройте в браузере:
- Health: http://localhost:3000/api/health
- Swagger документация: http://localhost:3000/api-docs (если настроено)

---

## Настройка фронтенда для подключения к локальному бэкенду

### Для Next.js / React / Vue

Создайте файл конфигурации API:

```javascript
// config/api.js или utils/api.js
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default API_BASE_URL;
```

Или используйте переменную окружения:

```env
# .env.local (для Next.js)
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### Пример использования в компоненте:

```javascript
// components/MembershipsList.jsx
import { useEffect, useState } from 'react';

const API_BASE_URL = 'http://localhost:3000/api';

export default function MembershipsList() {
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/memberships`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMemberships(data.data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Ошибка загрузки абонементов:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Загрузка...</div>;

  return (
    <div>
      <h2>Абонементы</h2>
      {memberships.map(membership => (
        <div key={membership.id}>
          <h3>{membership.name}</h3>
          <p>Цена: {membership.price} руб</p>
          <p>Тренировок: {membership.sessionCount}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Тестирование API endpoints

### 1. Тестирование через браузер

Откройте DevTools (F12) → Console и выполните:

```javascript
// Получить абонементы
fetch('http://localhost:3000/api/memberships')
  .then(r => r.json())
  .then(data => console.log('Абонементы:', data));

// Получить локации
fetch('http://localhost:3000/api/locations')
  .then(r => r.json())
  .then(data => console.log('Локации:', data));

// Получить тренировки
fetch('http://localhost:3000/api/sessions?limit=5')
  .then(r => r.json())
  .then(data => console.log('Тренировки:', data));
```

### 2. Тестирование через Postman / Insomnia

Создайте коллекцию запросов:

**GET запросы:**
- `GET http://localhost:3000/api/health`
- `GET http://localhost:3000/api/categories`
- `GET http://localhost:3000/api/memberships`
- `GET http://localhost:3000/api/locations`
- `GET http://localhost:3000/api/sessions`

**POST запрос (отправка заявки):**
```
POST http://localhost:3000/api/booking
Content-Type: application/json

{
  "name": "Тестовый пользователь",
  "phone": "+7 (999) 123-45-67",
  "message": "Тестовая заявка",
  "source": "contact_form"
}
```

### 3. Тестирование через curl

```bash
# Health check
curl http://localhost:3000/api/health

# Получить абонементы
curl http://localhost:3000/api/memberships

# Отправить заявку
curl -X POST http://localhost:3000/api/booking \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Иван Иванов",
    "phone": "+7 (999) 123-45-67",
    "message": "Хочу записаться",
    "source": "contact_form"
  }'
```

---

## Решение проблем

### Проблема: CORS ошибка в браузере

**Симптомы:**
```
Access to fetch at 'http://localhost:3000/api/...' from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

**Решение:**
1. Проверьте `ALLOWED_ORIGINS` в `.env`
2. Добавьте порт фронтенда в список:
   ```env
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:3001
   ```
3. Перезапустите бэкенд: `npm run dev`

### Проблема: Не могу подключиться к базе данных

**Симптомы:**
```
Error: Can't reach database server
```

**Решение:**
1. Проверьте `DATABASE_URL` в `.env`
2. Если база на удаленном сервере:
   - Проверьте доступность сервера: `ping your-server-ip`
   - Проверьте порт: `telnet your-server-ip 5432`
   - Используйте SSH туннель (см. ниже)

### Проблема: База данных на удаленном сервере

Если PostgreSQL на удаленном сервере, используйте SSH туннель:

```bash
# Создать SSH туннель (в отдельном терминале)
ssh -L 5432:localhost:5432 user@your-server-ip

# Затем в .env используйте:
DATABASE_URL=postgresql://smashers:password@localhost:5432/smashers_db
```

### Проблема: Порт 3000 уже занят

**Решение:**
1. Измените порт в `.env`:
   ```env
   PORT=3001
   ```
2. Или остановите процесс, занимающий порт:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   
   # Linux/Mac
   lsof -ti:3000 | xargs kill
   ```

---

## Чеклист для тестирования

### ✅ Базовые проверки:

- [ ] Бэкенд запускается без ошибок
- [ ] Health endpoint работает: `http://localhost:3000/api/health`
- [ ] База данных подключена (нет ошибок в логах)
- [ ] CORS настроен (нет ошибок в консоли браузера)

### ✅ Проверка данных:

- [ ] `/api/categories` возвращает категории
- [ ] `/api/memberships` возвращает абонементы
- [ ] `/api/locations` возвращает локации
- [ ] `/api/sessions` возвращает тренировки

### ✅ Проверка фильтров:

- [ ] `/api/memberships` возвращает только видимые (`isVisible: true`)
- [ ] `/api/memberships/2` возвращает абонемент для разовых посещений
- [ ] `/api/locations` возвращает только видимые локации
- [ ] `/api/sessions` возвращает только будущие тренировки (по умолчанию)

### ✅ Проверка отправки заявок:

- [ ] POST `/api/booking` с минимальными данными (name, phone) работает
- [ ] POST `/api/booking` с sessionId работает
- [ ] POST `/api/booking` с membershipId работает
- [ ] Валидация работает (ошибки при неправильных данных)

### ✅ Проверка фронтенда:

- [ ] Фронтенд может делать запросы к API
- [ ] Данные отображаются корректно
- [ ] Формы отправки заявок работают
- [ ] Ошибки обрабатываются правильно

---

## Полезные команды

```bash
# Запуск бэкенда
npm run dev

# Проверка подключения к БД
npx prisma db pull

# Просмотр логов в реальном времени
# (если используется PM2 или другой менеджер процессов)

# Проверка портов
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000
```

---

## Следующие шаги после локального тестирования

1. ✅ Протестируйте все endpoints
2. ✅ Убедитесь, что фронтенд корректно работает с API
3. ✅ Проверьте отправку заявок в Telegram (если настроено)
4. ✅ Запустите парсер: `npm run parse` (для заполнения БД данными)
5. ✅ После успешного тестирования - деплой на сервер (см. `DEPLOYMENT_GUIDE.md`)

---

## Быстрая справка по URL

**Локальный бэкенд:**
- API: `http://localhost:3000/api`
- Health: `http://localhost:3000/api/health`
- Swagger: `http://localhost:3000/api-docs` (если настроено)

**Для фронтенда:**
- Используйте: `http://localhost:3000/api` как базовый URL
- В production замените на: `https://api.yourdomain.com/api`
