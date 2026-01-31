# Быстрое применение миграций

## Вариант 1: С локальной машины (если проект у вас)

### Шаг 1: Настроить подключение к удаленной БД

В файле `.env` вашего проекта добавьте:

```env
DATABASE_URL=postgresql://smashers:ваш_пароль@IP_СЕРВЕРА:5432/smashers_db
```

**Если БД доступна только локально на сервере**, используйте SSH туннель:

```bash
# В отдельном терминале (Windows PowerShell или Git Bash)
ssh -L 5433:localhost:5432 root@IP_СЕРВЕРА
```

Тогда в `.env`:
```env
DATABASE_URL=postgresql://smashers:ваш_пароль@localhost:5433/smashers_db
```

### Шаг 2: Применить миграции

```bash
cd smashers-backend

# Установить зависимости (если еще не установлены)
npm install

# Применить схему
npx prisma db push
```

### Шаг 3: Проверить

```bash
# Через Prisma Studio (откроется GUI)
npm run studio
```

---

## Вариант 2: На сервере (если проект там)

### Шаг 1: Загрузить проект на сервер

```bash
# На сервере
cd /opt
git clone <your-repo-url> smashers-backend
# или загрузить через scp
cd smashers-backend
```

### Шаг 2: Настроить .env

```bash
cp .env.example .env
nano .env
```

Добавить:
```env
DATABASE_URL=postgresql://smashers:ваш_пароль@localhost:5432/smashers_db
```

### Шаг 3: Применить миграции

```bash
npm install
npx prisma generate
npx prisma db push
```

---

## Проверка результата

После применения миграций проверьте таблицы:

```bash
# Через Docker (если БД в Docker)
docker exec -it smashers-postgres psql -U smashers -d smashers_db -c "\dt"
```

Должны быть созданы таблицы:
- categories
- memberships
- locations
- sessions
- booking_requests
- sync_status

---

## После создания таблиц

Запустите парсер для заполнения данными:

```bash
npm run parse
```

Парсер подключится к Django админке и заполнит все таблицы данными.
