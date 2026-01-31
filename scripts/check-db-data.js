#!/usr/bin/env node
/**
 * Скрипт для проверки данных в базе данных
 * 
 * Использование:
 *   node scripts/check-db-data.js
 */

const path = require('path');
const fs = require('fs');

// Load .env file
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {
  // Fallback: load .env manually
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    });
  }
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('\n📊 Проверка данных в базе данных\n');
  console.log('='.repeat(60));

  try {
    // Проверка категорий
    console.log('\n📁 КАТЕГОРИИ:');
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' }
    });
    console.log(`   Всего: ${categories.length}`);
    console.log(`   Видимых: ${categories.filter(c => c.isVisible).length}`);
    console.log('   Примеры:');
    categories.slice(0, 3).forEach(cat => {
      console.log(`     - [${cat.id}] ${cat.name} (видимая: ${cat.isVisible ? 'да' : 'нет'})`);
    });

    // Проверка локаций
    console.log('\n📍 ЛОКАЦИИ:');
    const locations = await prisma.location.findMany({
      orderBy: { sortOrder: 'asc' }
    });
    console.log(`   Всего: ${locations.length}`);
    console.log(`   Показывать на экране записи: ${locations.filter(l => l.showOnBookingScreen).length}`);
    console.log('   Примеры:');
    locations.slice(0, 3).forEach(loc => {
      console.log(`     - [${loc.id}] ${loc.name} (на экране: ${loc.showOnBookingScreen ? 'да' : 'нет'})`);
    });

    // Проверка абонементов
    console.log('\n💳 АБОНЕМЕНТЫ:');
    const memberships = await prisma.membership.findMany({
      orderBy: { price: 'asc' }
    });
    console.log(`   Всего: ${memberships.length}`);
    console.log(`   Видимых: ${memberships.filter(m => m.isVisible).length}`);
    
    // Проверка абонемента id=2 (разовая тренировка)
    const singleSession = memberships.find(m => m.id === 2);
    if (singleSession) {
      console.log(`\n   ⭐ Абонемент для разовых посещений (id=2):`);
      console.log(`     Название: ${singleSession.name}`);
      console.log(`     Цена: ${singleSession.price} руб`);
      console.log(`     Видимый: ${singleSession.isVisible ? 'да' : 'нет'}`);
    } else {
      console.log(`\n   ⚠️  Абонемент id=2 не найден!`);
    }
    
    console.log('   Примеры:');
    memberships.slice(0, 5).forEach(mem => {
      console.log(`     - [${mem.id}] ${mem.name} - ${mem.price} руб (${mem.sessionCount} тренировок, видимый: ${mem.isVisible ? 'да' : 'нет'})`);
    });

    // Проверка тренировок
    console.log('\n🏸 ТРЕНИРОВКИ (будущие):');
    const sessions = await prisma.session.findMany({
      orderBy: { datetime: 'asc' },
      take: 100, // Показать первые 100
      include: {
        location: true,
        category: true
      }
    });
    console.log(`   Всего в БД: ${await prisma.session.count()}`);
    console.log(`   Показано: ${sessions.length}`);
    
    // Группировка по датам
    const sessionsByDate = {};
    sessions.forEach(session => {
      const date = session.datetime.toISOString().split('T')[0];
      if (!sessionsByDate[date]) {
        sessionsByDate[date] = [];
      }
      sessionsByDate[date].push(session);
    });
    
    console.log(`   Уникальных дат: ${Object.keys(sessionsByDate).length}`);
    console.log('   Распределение по датам:');
    Object.entries(sessionsByDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(0, 7)
      .forEach(([date, sessList]) => {
        const dateObj = new Date(date);
        const dateStr = dateObj.toLocaleDateString('ru-RU', { weekday: 'short', day: '2-digit', month: '2-digit' });
        console.log(`     ${dateStr}: ${sessList.length} тренировок`);
      });
    
    console.log('\n   Примеры тренировок:');
    sessions.slice(0, 5).forEach(sess => {
      const dateStr = sess.datetime.toLocaleString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      console.log(`     - [${sess.id}] ${dateStr} | ${sess.name} | ${sess.location?.name || 'N/A'} | ${sess.category?.name || 'N/A'}`);
    });

    // Статистика по статусам
    const statusStats = await prisma.session.groupBy({
      by: ['status'],
      _count: true
    });
    console.log('\n   Статусы тренировок:');
    statusStats.forEach(stat => {
      console.log(`     ${stat.status}: ${stat._count}`);
    });

    // Проверка связей
    console.log('\n🔗 ПРОВЕРКА СВЯЗЕЙ:');
    const sessionsWithMissingLocation = await prisma.session.findMany({
      where: {
        location: null
      }
    });
    const sessionsWithMissingCategory = await prisma.session.findMany({
      where: {
        category: null
      }
    });
    console.log(`   Тренировок без локации: ${sessionsWithMissingLocation.length}`);
    console.log(`   Тренировок без категории: ${sessionsWithMissingCategory.length}`);

    // Последняя синхронизация
    console.log('\n🔄 СИНХРОНИЗАЦИЯ:');
    const lastSync = await prisma.syncStatus.findFirst({
      orderBy: { lastSync: 'desc' }
    });
    if (lastSync) {
      const syncDate = new Date(lastSync.lastSync).toLocaleString('ru-RU');
      console.log(`   Последняя синхронизация: ${syncDate}`);
      console.log(`   Статус: ${lastSync.status}`);
      console.log(`   Длительность: ${lastSync.duration}ms`);
      if (lastSync.itemsParsed) {
        const parsed = typeof lastSync.itemsParsed === 'string' 
          ? JSON.parse(lastSync.itemsParsed)
          : lastSync.itemsParsed;
        console.log(`   Спарсено:`, parsed);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Проверка завершена!\n');

  } catch (error) {
    console.error('❌ Ошибка при проверке БД:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
