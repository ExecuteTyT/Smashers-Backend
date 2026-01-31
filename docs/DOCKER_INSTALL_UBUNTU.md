# Установка Docker и Docker Compose на Ubuntu 24

## Шаг 1: Обновление системы

```bash
sudo apt update
sudo apt upgrade -y
```

## Шаг 2: Установка зависимостей

```bash
sudo apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release
```

## Шаг 3: Добавление официального GPG ключа Docker

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

## Шаг 4: Настройка репозитория Docker

```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

## Шаг 5: Установка Docker Engine

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## Шаг 6: Установка Docker Compose (standalone)

Если нужна отдельная команда `docker-compose` (не только `docker compose`):

```bash
# Скачать последнюю версию
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Сделать исполняемым
sudo chmod +x /usr/local/bin/docker-compose

# Проверить версию
docker-compose --version
```

## Шаг 7: Настройка прав для пользователя (опционально)

Чтобы запускать Docker без sudo:

```bash
# Добавить пользователя в группу docker
sudo usermod -aG docker $USER

# Применить изменения (нужно выйти и зайти заново, или выполнить):
newgrp docker
```

## Шаг 8: Проверка установки

```bash
# Проверить версию Docker
docker --version

# Проверить версию Docker Compose
docker compose version

# Или если установили standalone
docker-compose --version

# Запустить тестовый контейнер
docker run hello-world
```

Если команда `docker run hello-world` выполнилась успешно - Docker установлен правильно!

## Шаг 9: Включение автозапуска Docker

```bash
sudo systemctl enable docker
sudo systemctl start docker
sudo systemctl status docker
```

## Готово!

Теперь можно использовать Docker и Docker Compose для разворачивания PostgreSQL.

## Следующие шаги

После установки Docker:

1. Перейдите в директорию проекта:
   ```bash
   cd /path/to/smashers-backend
   ```

2. Запустите PostgreSQL:
   ```bash
   docker-compose up -d postgres
   ```

3. Проверьте статус:
   ```bash
   docker ps
   ```

## Устранение проблем

### Ошибка "permission denied"

Если получаете ошибку доступа:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### Ошибка "Cannot connect to Docker daemon"

Проверьте, что Docker запущен:
```bash
sudo systemctl status docker
sudo systemctl start docker
```

### Проверка установки через snap

Если установили через snap (не рекомендуется для production):
```bash
sudo snap install docker
```

Но лучше использовать официальный репозиторий (инструкция выше).
