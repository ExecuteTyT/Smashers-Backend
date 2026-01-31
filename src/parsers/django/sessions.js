/**
 * Future Workouts Parser
 *
 * Parses future training sessions (будущие тренировки) from Django admin panel.
 * URL: /admin/core/futureworkout/
 *
 * Note: This parser handles pagination as future workouts table can have many entries.
 */

const logger = require('../../config/logger');
const { navigateToAdminPage, getPage } = require('./auth');
const { extractIdFromUrl, parseDjangoBoolean, sanitizeString, parseIntSafe, parseRussianDate } = require('../../utils/helpers');

/**
 * Parse a single page of sessions
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<Array>} - Array of session data from current page
 */
async function parseSessionsPage(page) {
  return page.evaluate(() => {
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

      const item = {
        href,
        firstColumn: thCell ? thCell.textContent.trim() : '',
        cells: Array.from(cells).map((cell) => {
          const img = cell.querySelector('img');
          const cellLink = cell.querySelector('a');
          return {
            text: cell.textContent.trim(),
            href: cellLink ? cellLink.getAttribute('href') : null,
            imgAlt: img ? img.getAttribute('alt') : null,
            imgSrc: img ? img.getAttribute('src') : null
          };
        })
      };

      results.push(item);
    });

    return results;
  });
}

/**
 * Check if there's a next page and navigate to it
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<boolean>} - True if navigated to next page
 */
async function goToNextPage(page) {
  // Look for pagination links
  const nextLink = await page.$('a.next, .paginator a:last-child');
  if (!nextLink) return false;

  // Check if it's actually a "next" link
  const text = await page.evaluate((el) => el.textContent, nextLink);
  if (!text || text.includes('previous') || text.includes('prev')) return false;

  // Click and wait for navigation
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
    nextLink.click()
  ]);

  return true;
}

/**
 * Parse all sessions from Django admin (handles pagination)
 * @returns {Promise<Array>} - Array of session objects
 */
async function parseSessions() {
  logger.logParser('Parsing sessions (future workouts)');

  try {
    const page = await navigateToAdminPage('/core/futureworkout/');

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

    const allSessions = [];
    let pageNum = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      logger.logParser(`Parsing sessions page ${pageNum}`);

      // Parse current page
      const pageSessions = await parseSessionsPage(page);
      allSessions.push(...pageSessions);

      // Try to go to next page
      hasNextPage = await goToNextPage(page);
      pageNum++;

      // Safety limit to prevent infinite loops
      if (pageNum > 100) {
        logger.warn('Reached page limit (100), stopping pagination');
        break;
      }
    }

    // Transform parsed data to session objects
    const now = new Date();
    const parsedSessions = allSessions
      .filter((item) => item.href)
      .map((item) => {
        const id = extractIdFromUrl(item.href);
        if (!id) return null;

        // Django admin table structure for future workouts (futureworkout):
        // th: ID (link) - format: "858: 31.01.2026 (Сб) 19:30 Все уровни 1: Центр бадминтона"
        // Format: "ID: DD.MM.YYYY (День недели) HH:MM Название LocationID: Название локации"
        // Need to parse this complex string from firstColumn

        // Parse the first column string
        // Example: "858: 31.01.2026 (Сб) 19:30 Все уровни 1: Центр бадминтона"
        let datetime = now;
        let name = '';
        let locationId = 1;
        let locationName = '';

        if (item.firstColumn) {
          // Extract date and time: "31.01.2026 (Сб) 19:30"
          const dateTimeMatch = item.firstColumn.match(/(\d{2})\.(\d{2})\.(\d{4})\s+\([^)]+\)\s+(\d{2}):(\d{2})/);
          if (dateTimeMatch) {
            const [, day, month, year, hour, minute] = dateTimeMatch;
            datetime = new Date(year, month - 1, day, hour, minute);
          }

          // Extract location ID and name: "1: Центр бадминтона"
          const locationMatch = item.firstColumn.match(/(\d+):\s+([^:]+)$/);
          if (locationMatch) {
            locationId = parseIntSafe(locationMatch[1], 1);
            locationName = locationMatch[2].trim();
          }

          // Extract name (between time and location): "Все уровни"
          const nameMatch = item.firstColumn.match(/\d{2}:\d{2}\s+(.+?)\s+\d+:/);
          if (nameMatch) {
            name = nameMatch[1].trim();
          }
        }

        // Extract category ID from cells if available
        let categoryId = 1;
        const categoryCell = item.cells.find((c) => c.href && c.href.includes('/category/'));
        if (categoryCell) {
          categoryId = extractIdFromUrl(categoryCell.href) || 1;
        }

        // Find numeric cells for spots (if available in future workouts)
        const numericCells = item.cells.filter((c) => /^\d+$/.test(c.text.trim()));

        // Find visibility icon (if available)
        const visibilityCell = item.cells.find((c) => c.imgAlt || c.imgSrc);

        return {
          id,
          datetime: datetime || now,
          locationId: locationId || 1,
          trainers: sanitizeString(item.cells.find((c) => c.text && c.text.includes('тренер'))?.text || ''),
          name: sanitizeString(name || item.cells[0]?.text || ''),
          categoryId: categoryId || 1,
          maxSpots: parseIntSafe(numericCells[0]?.text, 10),
          availableSpots: parseIntSafe(numericCells[1]?.text, 0),
          status: parseDjangoBoolean(visibilityCell?.imgAlt || visibilityCell?.imgSrc)
            ? 'Активно'
            : 'Неактивно',
          lastUpdated: now
        };
      })
      .filter(Boolean);

    logger.logParser(`Parsed ${parsedSessions.length} sessions total`);

    return parsedSessions;
  } catch (error) {
    logger.error('Failed to parse sessions', { error: error.message });
    throw error;
  }
}

module.exports = { parseSessions };
