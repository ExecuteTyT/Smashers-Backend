# Настройка проекта на сервере

## Поиск проекта на сервере

Если проект уже загружен на сервер, найдите его:

```bash
# Поиск директории smashers-backend
find / -type d -name "smashers-backend" 2>/dev/null

# Поиск docker-compose.yml
find / -name "docker-compose.yml" 2>/dev/null | grep smashers

# Поиск по имени проекта
find /home -type d -name "*smashers*" 2>/dev/null
find /var/www -type d -name "*smashers*" 2>/dev/null
find /opt -type d -name "*smashers*" 2>/dev/null
```

## Загрузка проекта на сервер

### Вариант 1: Через Git (если есть репозиторий)

```bash
# Перейти в нужную директорию (например, /opt или /var/www)
cd /opt

# Клонировать репозиторий
git clone <your-repo-url> smashers-backend

# Перейти в директорию проекта
cd smashers-backend/smashers-backend
# или
cd smashers-backend
```

### Вариант 2: Через SCP (с локальной машины)

С локальной машины (Windows/Mac/Linux):

```bash
# Загрузить проект на сервер
scp -r smashers-backend root@your-server-ip:/opt/

# Или через WinSCP / FileZilla (GUI)
```

### Вариант 3: Через rsync

```bash
# С локальной машины
rsync -avz smashers-backend/ root@your-server-ip:/opt/smashers-backend/
```

### Вариант 4: Создать структуру вручную

Если нужно создать минимальную структуру:

```bash
# Создать директорию
mkdir -p /opt/smashers-backend
cd /opt/smashers-backend

# Создать docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
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
    networks:
      - smashers-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-smashers} -d ${DB_NAME:-smashers_db}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
    driver: local

networks:
  smashers-network:
    driver: bridge
EOF

# Создать .env.example
cat > .env.example << 'EOF'
# PostgreSQL для Docker
DB_USER=smashers
DB_PASSWORD=your_secure_password_here
DB_NAME=smashers_db

# DATABASE_URL для приложения
DATABASE_URL=postgresql://smashers:your_secure_password_here@localhost:5432/smashers_db
EOF
```

## После загрузки проекта

### 1. Перейти в директорию проекта

```bash
# Если нашли проект
cd /path/to/smashers-backend

# Или если создали в /opt
cd /opt/smashers-backend
```

### 2. Создать .env файл

```bash
# Создать из примера
cp .env.example .env

# Отредактировать
nano .env
```

**Минимальная конфигурация для PostgreSQL:**

```env
DB_USER=smashers
DB_PASSWORD=ваш_надежный_пароль
DB_NAME=smashers_db
DATABASE_URL=postgresql://smashers:ваш_надежный_пароль@localhost:5432/smashers_db
```

### 3. Запустить PostgreSQL

```bash
# Запустить контейнер
docker-compose up -d postgres

# Проверить статус
docker ps | grep postgres

# Проверить логи
docker-compose logs postgres
```

### 4. Проверить подключение

```bash
# Проверить, что БД работает
docker exec -it smashers-postgres psql -U smashers -d smashers_db -c "SELECT version();"
```

## Рекомендуемая структура директорий

```
/opt/smashers-backend/          # Или /var/www/smashers-backend
├── docker-compose.yml
├── .env
├── .env.example
├── package.json
├── prisma/
│   └── schema.prisma
└── src/
    └── ...
```

## Проверка наличия необходимых файлов

```bash
# Проверить наличие docker-compose.yml
ls -la docker-compose.yml

# Проверить наличие .env.example
ls -la .env.example

# Проверить структуру проекта
ls -la
```

## Следующие шаги

После того как проект найден или загружен:

1. ✅ Настроить `.env` файл
2. ✅ Запустить PostgreSQL: `docker-compose up -d postgres`
3. ✅ Применить миграции (если есть Prisma): `npm run db:push`
4. ✅ Проверить работоспособность

## Полезные команды

```bash
# Показать текущую директорию
pwd

# Показать содержимое директории
ls -la

# Найти файл docker-compose.yml
find ~ -name "docker-compose.yml" 2>/dev/null

# Найти все .env файлы
find ~ -name ".env*" 2>/dev/null
```
