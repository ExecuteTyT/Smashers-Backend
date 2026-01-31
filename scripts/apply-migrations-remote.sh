#!/bin/bash
# Скрипт для применения Prisma миграций на удаленном сервере
# Использование: ./apply-migrations-remote.sh

set -e

echo "🚀 Применение Prisma миграций на удаленном сервере"
echo ""

# Проверка наличия .env файла
if [ ! -f .env ]; then
    echo "❌ Ошибка: Файл .env не найден"
    echo "Создайте .env файл с DATABASE_URL"
    exit 1
fi

# Проверка DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Ошибка: DATABASE_URL не установлен в .env"
    exit 1
fi

echo "📦 Установка зависимостей..."
npm install

echo ""
echo "🔧 Генерация Prisma Client..."
npx prisma generate

echo ""
echo "📊 Применение схемы к базе данных..."
npx prisma db push --accept-data-loss

echo ""
echo "✅ Миграции успешно применены!"
echo ""
echo "📋 Проверка созданных таблиц:"
npx prisma db execute --stdin <<< "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"

echo ""
echo "✨ Готово! Таблицы созданы и готовы к использованию."
