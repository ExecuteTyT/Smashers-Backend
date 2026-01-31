# Установка зависимостей Puppeteer для Ubuntu 24.04

## Проблема
Puppeteer требует системные библиотеки для запуска Chrome. В Ubuntu 24.04 некоторые пакеты имеют другие имена.

## Решение

### Вариант 1: Установка Chromium (рекомендуется)

```bash
sudo apt update
sudo apt install -y chromium-browser
```

Chromium автоматически установит все необходимые зависимости.

### Вариант 2: Установка зависимостей вручную (для Ubuntu 24.04)

```bash
sudo apt update
sudo apt install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2t64 \
  libatk-bridge2.0-0t64 \
  libatk1.0-0t64 \
  libc6 \
  libcairo2 \
  libcups2t64 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc-s1 \
  libglib2.0-0t64 \
  libgtk-3-0t64 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  xdg-utils
```

### Вариант 3: Минимальный набор (если предыдущие не работают)

```bash
sudo apt install -y \
  libatk1.0-0t64 \
  libatk-bridge2.0-0t64 \
  libcups2t64 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0t64 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libasound2t64
```

## После установки

Проверьте работу парсера:

```bash
cd /opt/Smashers-Backend
npm run parse
```

## Если все еще не работает

Проверьте, установлен ли Chrome/Chromium:

```bash
which chromium-browser
which google-chrome
which chromium
```

Если Chrome установлен, но Puppeteer его не находит, можно указать путь в коде или использовать переменную окружения.
