# Быстрое разворачивание на тестовом сервере

## Полная последовательность команд для Ubuntu 24

Скопируйте и выполните команды по порядку:

### 1. Установка Docker

```bash
# Обновить систему
sudo apt update && sudo apt upgrade -y

# Установить зависимости
sudo apt install -y ca-certificates curl gnupg lsb-release

# Добавить GPG ключ Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Настроить репозиторий
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Установить Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Установить Docker Compose (standalone)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Добавить пользователя в группу docker
sudo usermod -aG docker $USER
newgrp docker

# Включить автозапуск
sudo systemctl enable docker
sudo systemctl start docker

# Проверить установку
docker --version
docker-compose --version
docker run hello-world
```

### 2. Клонирование/Загрузка проекта

```bash
# Если проект уже на сервере, перейдите в директорию
cd /path/to/smashers-backend

# Или клонируйте репозиторий
# git clone <your-repo-url>
# cd smashers-backend
```

### 3. Настройка .env файла

```bash
# Создать .env из примера
cp .env.example .env

# Отредактировать .env (используйте nano или vim)
nano .env
```

**Минимальные настройки для PostgreSQL:**

```env
# PostgreSQL для Docker
DB_USER=smashers
DB_PASSWORD=ваш_надежный_пароль_здесь
DB_NAME=smashers_db

# DATABASE_URL для приложения
DATABASE_URL=postgresql://smashers:ваш_надежный_пароль_здесь@localhost:5432/smashers_db
```

**Важно:** Замените `ваш_надежный_пароль_здесь` на реальный пароль!

### 4. Запуск PostgreSQL

```bash
# Запустить только PostgreSQL
docker-compose up -d postgres

# Проверить статус
docker ps | grep postgres

# Проверить логи
docker-compose logs postgres
```

### 5. Применение миграций

```bash
# Установить зависимости (если еще не установлены)
npm install

# Применить схему к БД
npm run db:push

# Или через Prisma напрямую
npx prisma db push
```

### 6. Проверка работоспособности

```bash
# Проверить подключение к БД
docker exec -it smashers-postgres psql -U smashers -d smashers_db -c "SELECT version();"

# Проверить созданные таблицы
docker exec -it smashers-postgres psql -U smashers -d smashers_db -c "\dt"

# Или через Prisma Studio (GUI)
npm run studio
# Откроется на http://localhost:5555
```

### 7. Запуск парсера (опционально)

```bash
# Запустить парсер для заполнения данными
npm run parse
```

## Проверочный чек-лист

После выполнения всех шагов проверьте:

- [ ] Docker установлен: `docker --version`
- [ ] Docker Compose установлен: `docker-compose --version`
- [ ] PostgreSQL контейнер запущен: `docker ps | grep postgres`
- [ ] Подключение к БД работает: `docker exec -it smashers-postgres psql -U smashers -d smashers_db -c "SELECT 1;"`
- [ ] Таблицы созданы: `docker exec -it smashers-postgres psql -U smashers -d smashers_db -c "\dt"`
- [ ] `.env` файл настроен с правильным паролем

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

# Подключиться к БД через psql
docker exec -it smashers-postgres psql -U smashers -d smashers_db

# Удалить контейнер (данные сохранятся в volume)
docker-compose down postgres

# Удалить контейнер и данные (⚠️ удалит все данные!)
docker-compose down -v postgres
```

## Следующие шаги

1. ✅ PostgreSQL развернут и работает
2. ✅ Миграции применены
3. ⏭️ Запустить парсер для заполнения данными
4. ⏭️ Настроить остальные переменные в `.env` (Telegram, Django и т.д.)
5. ⏭️ Запустить backend API (если нужно)

## Устранение проблем

### Ошибка "permission denied" при запуске Docker

```bash
sudo usermod -aG docker $USER
newgrp docker
```

### Ошибка "Cannot connect to Docker daemon"

```bash
sudo systemctl start docker
sudo systemctl status docker
```

### Ошибка подключения к БД

1. Проверьте, что контейнер запущен: `docker ps`
2. Проверьте логи: `docker-compose logs postgres`
3. Проверьте `.env` файл - правильный ли пароль
4. Проверьте `DATABASE_URL` в `.env`

### Ошибка "relation does not exist"

Примените миграции:
```bash
npm run db:push
```

## Подробные инструкции

- **Установка Docker**: `docs/DOCKER_INSTALL_UBUNTU.md`
- **Разворачивание БД**: `docs/DATABASE_DEPLOYMENT.md`
- **Быстрый старт**: `docs/QUICK_START.md`
