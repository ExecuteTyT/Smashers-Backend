# Разворачивание только PostgreSQL на сервере

Минимальная конфигурация для запуска только базы данных PostgreSQL без всего проекта.

## Шаг 1: Создать директорию для PostgreSQL

```bash
mkdir -p /opt/smashers-postgres
cd /opt/smashers-postgres
```

## Шаг 2: Создать docker-compose.yml

```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: smashers-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: smashers
      POSTGRES_PASSWORD: ${DB_PASSWORD:-change_this_password}
      POSTGRES_DB: smashers_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U smashers -d smashers_db"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
    driver: local
EOF
```

## Шаг 3: Создать .env файл с паролем

```bash
cat > .env << 'EOF'
DB_PASSWORD=ваш_надежный_пароль_здесь
EOF
```

**Важно:** Замените `ваш_надежный_пароль_здесь` на реальный надежный пароль!

Или отредактируйте вручную:

```bash
nano .env
```

Добавьте:
```
DB_PASSWORD=ваш_надежный_пароль_здесь
```

## Шаг 4: Запустить PostgreSQL

```bash
# Запустить контейнер
docker-compose up -d postgres

# Проверить статус
docker ps | grep postgres

# Посмотреть логи
docker-compose logs postgres
```

## Шаг 5: Проверка работоспособности

```bash
# Проверить подключение
docker exec -it smashers-postgres psql -U smashers -d smashers_db -c "SELECT version();"

# Проверить список баз данных
docker exec -it smashers-postgres psql -U smashers -d smashers_db -c "\l"

# Войти в psql интерактивно
docker exec -it smashers-postgres psql -U smashers -d smashers_db
```

## Параметры подключения

После запуска база данных будет доступна по следующим параметрам:

```
Host: localhost (или IP вашего сервера)
Port: 5432
Database: smashers_db
User: smashers
Password: (тот, который указали в .env)
```

**Connection String:**
```
postgresql://smashers:ваш_пароль@localhost:5432/smashers_db
```

## Полезные команды

```bash
# Остановить PostgreSQL
docker-compose stop postgres

# Запустить PostgreSQL
docker-compose start postgres

# Перезапустить PostgreSQL
docker-compose restart postgres

# Посмотреть логи
docker-compose logs -f postgres

# Остановить и удалить контейнер (данные сохранятся)
docker-compose down

# Остановить и удалить контейнер с данными (⚠️ удалит все данные!)
docker-compose down -v

# Проверить использование диска
docker system df
```

## Резервное копирование

```bash
# Создать бэкап
docker exec smashers-postgres pg_dump -U smashers smashers_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановить из бэкапа
docker exec -i smashers-postgres psql -U smashers smashers_db < backup.sql
```

## Настройка для удаленного доступа (опционально)

Если нужно подключиться к БД с другого сервера:

### 1. Изменить порт в docker-compose.yml (если нужно)

```yaml
ports:
  - "0.0.0.0:5432:5432"  # Доступно на всех интерфейсах
```

### 2. Настроить firewall (если используется)

```bash
# Разрешить порт 5432
sudo ufw allow 5432/tcp

# Или только для конкретного IP
sudo ufw allow from 192.168.1.100 to any port 5432
```

### 3. Изменить pg_hba.conf (если нужно)

```bash
# Войти в контейнер
docker exec -it smashers-postgres sh

# Отредактировать pg_hba.conf
vi /var/lib/postgresql/data/pg_hba.conf

# Добавить строку для удаленного доступа:
# host    smashers_db     smashers        0.0.0.0/0               md5

# Перезапустить контейнер
exit
docker-compose restart postgres
```

**⚠️ Внимание:** Открытие доступа к БД извне требует дополнительных мер безопасности!

## Проверочный чек-лист

После выполнения всех шагов:

- [ ] Директория `/opt/smashers-postgres` создана
- [ ] Файл `docker-compose.yml` создан
- [ ] Файл `.env` создан с паролем
- [ ] Контейнер PostgreSQL запущен: `docker ps | grep postgres`
- [ ] Подключение работает: `docker exec -it smashers-postgres psql -U smashers -d smashers_db -c "SELECT 1;"`
- [ ] Пароль сохранен в безопасном месте

## Следующие шаги

После разворачивания PostgreSQL:

1. ✅ База данных готова к использованию
2. ⏭️ Когда загрузите проект на сервер, используйте эти параметры подключения в `.env`:
   ```
   DATABASE_URL=postgresql://smashers:ваш_пароль@localhost:5432/smashers_db
   ```
3. ⏭️ Примените миграции Prisma: `npm run db:push`

## Структура файлов

```
/opt/smashers-postgres/
├── docker-compose.yml
└── .env
```

Готово! PostgreSQL развернут и готов к использованию.
