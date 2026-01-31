/**
 * Memberships Parser
 *
 * Parses memberships (абонементы) from Django admin panel.
 * URL: /admin/core/abik/
 */

const logger = require('../../config/logger');
const { navigateToAdminPage } = require('./auth');
const { extractIdFromUrl, parseDjangoBoolean, sanitizeString, parseIntSafe, parsePrice } = require('../../utils/helpers');

/**
 * Parse memberships from Django admin
 * @returns {Promise<Array>} - Array of membership objects
 */
async function parseMemberships() {
  logger.logParser('Parsing memberships');

  try {
    const page = await navigateToAdminPage('/core/abon/');

    // Wait for page to load (waitForTimeout removed in newer Puppeteer versions)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Wait for table to load (try multiple selectors)
    let tableFound = false;
    try {
      await page.waitForSelector('#result_list', { timeout: 10000 });
      tableFound = true;
    } catch (e) {
      // Try alternative selectors
      const hasTable = await page.evaluate(() => {
        return !!(
          document.querySelector('#result_list') ||
          document.querySelector('table.results') ||
          document.querySelector('.change-list table') ||
          document.querySelector('tbody tr')
        );
      });
      if (hasTable) {
        tableFound = true;
        logger.logParser('Table found with alternative selector');
      } else {
        logger.logParser('No result_list found, table might be empty');
      }
    }

    // Parse table rows
    const memberships = await page.evaluate(() => {
      // Try multiple selectors for table
      let table = document.querySelector('#result_list');
      if (!table) {
        table = document.querySelector('table.results');
      }
      if (!table) {
        table = document.querySelector('.change-list table');
      }
      if (!table) {
        // Fallback: find any table with rows
        const tables = document.querySelectorAll('table');
        for (const t of tables) {
          if (t.querySelector('tbody tr')) {
            table = t;
            break;
          }
        }
      }

      if (!table) {
        return [];
      }

      const rows = table.querySelectorAll('tbody tr');
      const results = [];

      rows.forEach((row) => {
        if (!row.querySelector('th') && !row.querySelector('td a')) return;

        const link = row.querySelector('th a') || row.querySelector('td a');
        const href = link ? link.getAttribute('href') : null;

        const cells = row.querySelectorAll('td');
        const thCell = row.querySelector('th');
        
        // В Django админке для абонементов:
        // th: ID (link) - например "2"
        // td[0]: НАЗВАНИЕ - например "Разовая тренировка"
        // td[1]: ТИП - например "Обычний абик"
        // td[2]: ЦЕНА - например "1200"
        // td[3]: КОЛ-ВО ТРЕНИРОВОК - например "1"
        // td[4]: ВИДИМЫЙ - иконка
        
        const item = {
          href,
          thText: thCell ? thCell.textContent.trim() : '',
          cells: Array.from(cells).map((cell) => {
            const img = cell.querySelector('img');
            const link = cell.querySelector('a');
            return {
              text: cell.textContent.trim(),
              linkHref: link ? link.getAttribute('href') : null,
              imgAlt: img ? img.getAttribute('alt') : null,
              imgSrc: img ? img.getAttribute('src') : null
            };
          })
        };

        results.push(item);
      });

      return results;
    });

    // Transform parsed data to membership objects
    const now = new Date();
    const parsedMemberships = memberships
      .filter((item) => item.href)
      .map((item) => {
        const id = extractIdFromUrl(item.href);
        if (!id) return null;

        // Django admin table structure for memberships (abon):
        // По скриншоту Prisma Studio видно, что type содержит кириллицу, значит структура другая
        // Ищем колонки по содержимому:
        // - Название: ячейка с кириллицей (не число, не иконка)
        // - Тип: может быть пустым или содержать текст
        // - Цена: число (может быть с пробелами и символами валюты)
        // - Количество тренировок: число
        // - Видимый: иконка
        
        let name = '';
        let type = 'Обычный абик';
        let price = 0;
        let sessionCount = 1;
        let isVisible = false;
        
        // Ищем колонки по содержимому
        for (let i = 0; i < item.cells.length; i++) {
          const cell = item.cells[i];
          const cellText = cell.text.trim();
          const hasImage = cell.imgAlt || cell.imgSrc;
          
          // Если ячейка содержит изображение - это is_visible
          if (hasImage) {
            isVisible = parseDjangoBoolean(cell.imgAlt || cell.imgSrc);
          }
          // Если ячейка содержит кириллицу и не является числом - это название или тип
          else if (/[а-яёА-ЯЁ]/.test(cellText) && !/^\d+$/.test(cellText)) {
            // Если название еще не найдено, это название
            if (!name) {
              name = cellText;
            } else if (!type || type === 'Обычный абик') {
              // Если название уже есть, это тип
              type = cellText;
            }
          }
          // Если ячейка содержит число (может быть с пробелами) - это цена или количество
          else if (/[\d\s]/.test(cellText)) {
            const numValue = parsePrice(cellText);
            if (numValue > 0) {
              // Если цена еще не найдена и число большое (>= 100) - это цена
              if (price === 0 && numValue >= 100) {
                price = numValue;
              } 
              // Если цена уже найдена или число маленькое - это количество тренировок
              else if (price > 0 || numValue < 100) {
                sessionCount = numValue || 1;
              }
            }
          }
        }
        
        // Если название не найдено, пробуем из th
        if (!name && item.thText) {
          const match = item.thText.match(/^\d+:\s*(.+)$/);
          if (match) {
            name = match[1].trim();
          } else if (/[а-яёА-ЯЁ]/.test(item.thText)) {
            name = item.thText;
          }
        }
        
        // Fallback: если название все еще пустое, используем первую ячейку с текстом
        if (!name && item.cells[0]?.text) {
          name = item.cells[0].text;
        }

        return {
          id,
          name: sanitizeString(name),
          type: sanitizeString(type),
          price: price,
          sessionCount: sessionCount,
          isVisible: isVisible,
          lastUpdated: now
        };
      })
      .filter(Boolean);

    logger.logParser(`Parsed ${parsedMemberships.length} memberships`);

    return parsedMemberships;
  } catch (error) {
    logger.error('Failed to parse memberships', { error: error.message });
    throw error;
  }
}

module.exports = { parseMemberships };
