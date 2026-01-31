#!/usr/bin/env node
/**
 * Debug Parser Script
 * 
 * Помогает отладить парсеры, сохраняя скриншоты и HTML страниц
 * 
 * Использование:
 *   node scripts/debug-parser.js memberships
 *   node scripts/debug-parser.js sessions
 */

const path = require('path');
const fs = require('fs');

// Load .env file
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {
  // Fallback: load .env manually if dotenv is not available
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      // Skip comments and empty lines
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    });
  }
}

const { navigateToAdminPage, closeBrowser } = require('../src/parsers/django/auth');

async function debugParser(type) {
  const urls = {
    memberships: '/core/abon/',
    sessions: '/core/futureworkout/',
    categories: '/core/category/',
    locations: '/core/location/'
  };

  const url = urls[type];
  if (!url) {
    console.error(`❌ Неизвестный тип: ${type}`);
    console.log('Доступные типы: memberships, sessions, categories, locations');
    process.exit(1);
  }

  console.log(`🔍 Отладка парсера: ${type}`);
  console.log(`📍 URL: ${process.env.DJANGO_URL}${url}`);

  try {
    const page = await navigateToAdminPage(url);

    // Подождать загрузки (waitForTimeout удален в новых версиях Puppeteer)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Создать папку debug если её нет
    const debugDir = path.join(__dirname, '..', 'debug');
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
      console.log(`📁 Создана папка: ${debugDir}`);
    }

    // Сохранить скриншот
    const screenshotPath = path.join(debugDir, `${type}-screenshot.png`);
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true 
    });
    console.log(`📸 Скриншот сохранен: ${screenshotPath}`);

    // Сохранить HTML
    const html = await page.content();
    const htmlPath = path.join(debugDir, `${type}-page.html`);
    fs.writeFileSync(htmlPath, html);
    console.log(`📄 HTML сохранен: ${htmlPath}`);

    // Проверить наличие таблицы
    const hasResultList = await page.$('#result_list');
    console.log(`\n🔎 Найден #result_list: ${hasResultList ? '✅ Да' : '❌ Нет'}`);

    if (hasResultList) {
      // Подсчитать строки
      const rowCount = await page.evaluate(() => {
        return document.querySelectorAll('#result_list tbody tr').length;
      });
      console.log(`📊 Количество строк в таблице: ${rowCount}`);

      // Показать структуру таблицы
      const tableStructure = await page.evaluate(() => {
        const table = document.querySelector('#result_list');
        if (!table) return null;

        const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
        const firstRow = table.querySelector('tbody tr');
        const cells = firstRow ? Array.from(firstRow.querySelectorAll('td, th')).map(cell => {
          const link = cell.querySelector('a');
          const img = cell.querySelector('img');
          return {
            text: cell.textContent.trim(),
            hasLink: !!link,
            linkHref: link ? link.getAttribute('href') : null,
            hasImg: !!img,
            imgAlt: img ? img.getAttribute('alt') : null
          };
        }) : [];

        return { headers, firstRowCells: cells };
      });

      if (tableStructure) {
        console.log('\n📋 Структура таблицы:');
        console.log('Заголовки:', tableStructure.headers);
        console.log('\nПервая строка:');
        tableStructure.firstRowCells.forEach((cell, i) => {
          console.log(`  [${i}]: ${JSON.stringify(cell)}`);
        });
      }
    } else {
      // Попробовать найти альтернативные селекторы
      console.log('\n🔍 Поиск альтернативных селекторов...');
      const alternatives = await page.evaluate(() => {
        const results = {};
        
        // Проверить различные селекторы таблиц
        const selectors = [
          'table',
          '.results',
          '.change-list',
          '[id*="result"]',
          '[class*="result"]',
          'tbody tr',
          '.module',
          '.changelist',
          '#changelist'
        ];

        selectors.forEach(sel => {
          const elements = document.querySelectorAll(sel);
          if (elements.length > 0) {
            results[sel] = elements.length;
          }
        });

        return results;
      });

      console.log('Найденные элементы:');
      if (Object.keys(alternatives).length === 0) {
        console.log('  ❌ Ничего не найдено');
      } else {
        Object.entries(alternatives).forEach(([sel, count]) => {
          console.log(`  ✅ ${sel}: ${count} элементов`);
        });
      }

      // Проверить наличие сообщения "No items" или "пусто"
      const pageText = await page.evaluate(() => {
        return document.body.textContent;
      });

      if (pageText.includes('No items') || 
          pageText.includes('Нет элементов') ||
          pageText.includes('пусто') ||
          pageText.includes('нет записей')) {
        console.log('\n⚠️  На странице есть сообщение об отсутствии элементов');
        console.log('   Возможно, таблица действительно пустая в Django админке');
      }

      // Проверить заголовок страницы
      const pageTitle = await page.title();
      console.log(`\n📄 Заголовок страницы: ${pageTitle}`);

      // Проверить текущий URL
      const currentUrl = page.url();
      console.log(`🔗 Текущий URL: ${currentUrl}`);
    }

    // Проверить наличие сообщения "No items"
    const noItemsMessage = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      return bodyText.includes('No items') || 
             bodyText.includes('Нет элементов') ||
             bodyText.includes('пусто');
    });

    if (noItemsMessage) {
      console.log('\n⚠️  На странице может быть сообщение об отсутствии элементов');
    }

    await closeBrowser();
    console.log('\n✅ Отладка завершена');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    await closeBrowser();
    process.exit(1);
  }
}

const type = process.argv[2];
if (!type) {
  console.error('❌ Укажите тип парсера для отладки');
  console.log('Использование: node scripts/debug-parser.js <type>');
  console.log('Типы: memberships, sessions, categories, locations');
  process.exit(1);
}

debugParser(type);
