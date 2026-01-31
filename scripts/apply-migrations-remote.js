#!/usr/bin/env node
/**
 * Скрипт для применения Prisma миграций на удаленном сервере
 * Можно запустить локально с подключением к удаленной БД
 * 
 * Использование:
 *   node scripts/apply-migrations-remote.js
 * 
 * Или с явным указанием DATABASE_URL:
 *   DATABASE_URL=postgresql://... node scripts/apply-migrations-remote.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

function log(message, type = 'info') {
  const prefix = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    step: '🔧'
  }[type] || 'ℹ️';
  
  console.log(`${prefix} ${message}`);
}

function checkEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    log('Файл .env не найден. Создайте его с DATABASE_URL', 'error');
    process.exit(1);
  }
  
  require('dotenv').config({ path: envPath });
  
  if (!process.env.DATABASE_URL) {
    log('DATABASE_URL не установлен в .env файле', 'error');
    log('Добавьте: DATABASE_URL=postgresql://user:password@host:port/database', 'warning');
    process.exit(1);
  }
  
  log(`DATABASE_URL найден: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`, 'success');
}

function runCommand(command, description) {
  try {
    log(description, 'step');
    execSync(command, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: { ...process.env }
    });
    return true;
  } catch (error) {
    log(`Ошибка при выполнении: ${description}`, 'error');
    log(error.message, 'error');
    return false;
  }
}

async function main() {
  console.log('\n🚀 Применение Prisma миграций\n');
  
  // Проверка окружения
  checkEnv();
  
  // Установка зависимостей
  if (!runCommand('npm install', 'Установка зависимостей...')) {
    process.exit(1);
  }
  
  // Генерация Prisma Client
  if (!runCommand('npx prisma generate', 'Генерация Prisma Client...')) {
    process.exit(1);
  }
  
  // Применение схемы
  log('Применение схемы к базе данных...', 'step');
  log('Это создаст все таблицы согласно prisma/schema.prisma', 'info');
  
  if (!runCommand('npx prisma db push --accept-data-loss', 'Применение схемы...')) {
    process.exit(1);
  }
  
  // Проверка таблиц
  log('Проверка созданных таблиц...', 'step');
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    console.log('\n📋 Созданные таблицы:');
    result.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    await prisma.$disconnect();
  } catch (error) {
    log('Не удалось проверить таблицы, но миграции применены', 'warning');
  }
  
  console.log('\n✨ Готово! Таблицы созданы и готовы к использованию.\n');
}

main().catch(error => {
  log('Критическая ошибка:', 'error');
  console.error(error);
  process.exit(1);
});
