#!/usr/bin/env node
/**
 * Скрипт для отладки структуры таблиц Django админки
 * 
 * Использование:
 *   node scripts/debug-table-structure.js categories
 *   node scripts/debug-table-structure.js memberships
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

const puppeteer = require('puppeteer');
const { navigateToAdminPage } = require('../src/parsers/django/auth');

const entityType = process.argv[2] || 'categories';
const urls = {
  categories: '/core/category/',
  memberships: '/core/abon/',
  locations: '/core/location/',
  sessions: '/core/futureworkout/'
};

async function debugTableStructure() {
  const url = urls[entityType];
  if (!url) {
    console.error(`Unknown entity type: ${entityType}`);
    console.error(`Available: ${Object.keys(urls).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n🔍 Отладка структуры таблицы: ${entityType}`);
  console.log(`URL: ${url}\n`);

  let browser;
  try {
    const page = await navigateToAdminPage(url);
    browser = page.browser();

    // Wait for table
    await page.waitForSelector('#result_list', { timeout: 10000 }).catch(() => {
      console.log('⚠️  #result_list не найден, пробую альтернативные селекторы...');
    });

    // Get table structure
    const structure = await page.evaluate(() => {
      const table = document.querySelector('#result_list') || 
                    document.querySelector('table.results') ||
                    document.querySelector('.change-list table') ||
                    document.querySelector('table');
      
      if (!table) {
        return { error: 'Таблица не найдена' };
      }

      // Get headers
      const headers = [];
      const headerRow = table.querySelector('thead tr');
      if (headerRow) {
        headerRow.querySelectorAll('th').forEach((th, index) => {
          headers.push({
            index,
            text: th.textContent.trim(),
            className: th.className,
            innerHTML: th.innerHTML.substring(0, 100) // First 100 chars
          });
        });
      }

      // Get first 3 rows
      const rows = [];
      const tbody = table.querySelector('tbody');
      if (tbody) {
        const rowElements = Array.from(tbody.querySelectorAll('tr')).slice(0, 3);
        rowElements.forEach((row, rowIndex) => {
          const th = row.querySelector('th');
          const tds = row.querySelectorAll('td');
          
          const rowData = {
            rowIndex,
            th: th ? {
              text: th.textContent.trim(),
              innerHTML: th.innerHTML.substring(0, 200),
              link: th.querySelector('a') ? th.querySelector('a').getAttribute('href') : null
            } : null,
            cells: Array.from(tds).map((td, cellIndex) => {
              const img = td.querySelector('img');
              const link = td.querySelector('a');
              return {
                index: cellIndex,
                text: td.textContent.trim(),
                innerHTML: td.innerHTML.substring(0, 200),
                hasImage: !!img,
                imgAlt: img ? img.getAttribute('alt') : null,
                imgSrc: img ? img.getAttribute('src') : null,
                hasLink: !!link,
                linkHref: link ? link.getAttribute('href') : null
              };
            })
          };
          rows.push(rowData);
        });
      }

      return { headers, rows, tableFound: !!table };
    });

    console.log('📊 СТРУКТУРА ТАБЛИЦЫ:\n');
    console.log('='.repeat(80));
    
    if (structure.error) {
      console.error('❌', structure.error);
      return;
    }

    if (!structure.tableFound) {
      console.error('❌ Таблица не найдена');
      return;
    }

    console.log('\n📋 ЗАГОЛОВКИ:');
    if (structure.headers && structure.headers.length > 0) {
      structure.headers.forEach((h, i) => {
        console.log(`  [${i}] ${h.text || '(пусто)'}`);
        if (h.className) console.log(`      class: ${h.className}`);
      });
    } else {
      console.log('  (заголовки не найдены)');
    }

    console.log('\n📝 ПЕРВЫЕ 3 СТРОКИ:');
    structure.rows.forEach((row, idx) => {
      console.log(`\n  Строка ${idx + 1}:`);
      
      if (row.th) {
        console.log(`    <th>: "${row.th.text}"`);
        if (row.th.link) console.log(`      ссылка: ${row.th.link}`);
      }
      
      row.cells.forEach((cell, cellIdx) => {
        console.log(`    <td[${cellIdx}]>: "${cell.text}"`);
        if (cell.hasImage) {
          console.log(`      изображение: ${cell.imgSrc || cell.imgAlt || 'N/A'}`);
        }
        if (cell.hasLink) {
          console.log(`      ссылка: ${cell.linkHref}`);
        }
      });
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Отладка завершена\n');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

debugTableStructure();
