/**
 * Workouts Parser
 *
 * Parses training sessions (занятия) from Django admin panel.
 * URL: /admin/core/workout/?at__range__gte=DD.MM.YYYY&at__range__lte=
 *
 * Note: This parser handles pagination and parses detail pages for available spots.
 */

const logger = require('../../config/logger');
const { navigateToAdminPage, getPage } = require('./auth');
const { extractIdFromUrl, parseDjangoBoolean, sanitizeString, parseIntSafe, parseRussianDate, formatDateForDjango, parsePrice } = require('../../utils/helpers');

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
      // In Django admin, the first column is usually <th> with a link
      const thLink = row.querySelector('th a');
      const tdLink = row.querySelector('td a');
      
      // Skip header rows or rows without links
      if (!thLink && !tdLink) return;

      // Prefer th link (first column), fallback to td link
      const link = thLink || tdLink;
      const href = link ? link.getAttribute('href') : null;
      
      // Skip if href doesn't look like a workout detail page
      if (href && !href.includes('/workout/') && !href.includes('/core/workout/')) {
        return;
      }

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
 * Parse session details page to get available spots
 * @param {number} sessionId - Session ID
 * @returns {Promise<number>} - Available spots count
 */
async function parseSessionDetails(sessionId) {
  try {
    const page = await navigateToAdminPage(`/core/workout/${sessionId}/change/`);
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Extract "Осталось мест" from the "Места" section
    const availableSpots = await page.evaluate(() => {
      // Look for the "Места" section
      const sections = Array.from(document.querySelectorAll('fieldset, .form-row'));
      
      for (const section of sections) {
        const sectionText = section.textContent || '';
        if (sectionText.includes('Осталось мест') || sectionText.includes('Осталось мест:')) {
          // Try to find the number after "Осталось мест"
          const match = sectionText.match(/Осталось мест[:\s]+(\d+)/i);
          if (match) {
            return parseInt(match[1], 10);
          }
          
          // Alternative: look for input field or text with number
          const inputs = section.querySelectorAll('input, .readonly');
          for (const input of inputs) {
            const label = input.closest('.form-row')?.querySelector('label');
            if (label && (label.textContent.includes('Осталось мест') || label.textContent.includes('Осталось'))) {
              const value = input.value || input.textContent || '';
              const num = parseInt(value.trim(), 10);
              if (!isNaN(num)) {
                return num;
              }
            }
          }
          
          // Try to find any number in the section that might be "осталось мест"
          const numbers = sectionText.match(/(\d+)/g);
          if (numbers && numbers.length > 0) {
            // Usually "Осталось мест" is the second number (after "Кол-во мест для учеников")
            return parseInt(numbers[numbers.length - 1], 10);
          }
        }
      }
      
      return null;
    });
    
    if (availableSpots !== null && !isNaN(availableSpots)) {
      logger.logParser(`Parsed available spots for session ${sessionId}: ${availableSpots}`);
      return availableSpots;
    }
    
    logger.warn(`Could not parse available spots for session ${sessionId}, using 0`);
    return 0;
  } catch (error) {
    logger.error(`Failed to parse session details for ${sessionId}`, { error: error.message });
    return 0;
  }
}

/**
 * Parse all sessions from Django admin (handles pagination)
 * @returns {Promise<Array>} - Array of session objects
 */
async function parseSessions() {
  logger.logParser('Parsing sessions (workouts)');

  try {
    // Format current date for Django filter (DD.MM.YYYY)
    const today = new Date();
    const dateFilter = formatDateForDjango(today);
    const workoutUrl = `/core/workout/?at__range__gte=${dateFilter}&at__range__lte=`;
    
    logger.logParser(`Using date filter: ${dateFilter}`);
    const page = await navigateToAdminPage(workoutUrl);

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
      logger.logParser(`Found ${pageSessions.length} rows on page ${pageNum}`);
      
      // Debug: log first row if available
      if (pageSessions.length > 0) {
        logger.logParser(`First row sample: href=${pageSessions[0].href}, firstColumn="${pageSessions[0].firstColumn?.substring(0, 100)}"`);
      } else {
        // Debug: check what's on the page
        const pageInfo = await page.evaluate(() => {
          const table = document.querySelector('#result_list') || document.querySelector('table.results') || document.querySelector('.change-list table');
          if (!table) return { tableFound: false, rowCount: 0, html: '' };
          const rows = table.querySelectorAll('tbody tr');
          return {
            tableFound: true,
            rowCount: rows.length,
            firstRowHtml: rows.length > 0 ? rows[0].outerHTML.substring(0, 500) : '',
            pageText: document.body.textContent.substring(0, 200)
          };
        });
        logger.logParser(`Page debug info: ${JSON.stringify(pageInfo)}`);
      }
      
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
    
    logger.logParser(`Total raw sessions found: ${allSessions.length}`);

    // Transform parsed data to session objects
    const now = new Date();
    const parsedSessions = [];
    
    logger.logParser(`Processing ${allSessions.length} raw session items`);
    
    for (const item of allSessions) {
      if (!item.href) {
        logger.logParser(`Skipping item without href: ${JSON.stringify({ firstColumn: item.firstColumn?.substring(0, 50), cellsCount: item.cells?.length })}`);
        continue;
      }
      
      const id = extractIdFromUrl(item.href);
      if (!id) {
        logger.logParser(`Skipping item with invalid href: ${item.href}`);
        continue;
      }
      
      logger.logParser(`Processing session ID: ${id}`);

      // Django admin table structure for workouts:
      // Columns: ID, КОГДА, ЛОКАЦИЯ, ТРЕНЕРЫ, НАЗВАНИЕ, ВИДИМОЕ, КАТЕГОРИЯ, КОЛ-ВО МЕСТ ДЛЯ УЧЕНИКОВ, ЦЕНА, КОРТЫ
      // First column (th): ID (link) - format: "859: 01.02.2026 (Вс) 19:30 Воскресный бадмик 1: Центр бадминтона"
      
      let datetime = now;
      let name = '';
      let locationId = 1;
      let trainers = '';
      let categoryId = 1;
      let maxSpots = 0;
      let price = null;
      let isVisible = true;

      // Parse first column (th) - contains ID, date/time, name, location
      if (item.firstColumn) {
        // Extract date and time: "01.02.2026 (Вс) 19:30"
        const dateTimeMatch = item.firstColumn.match(/(\d{2})\.(\d{2})\.(\d{4})\s+\([^)]+\)\s+(\d{2}):(\d{2})/);
        if (dateTimeMatch) {
          const [, day, month, year, hour, minute] = dateTimeMatch;
          datetime = new Date(year, month - 1, day, hour, minute);
        }

        // Extract location ID and name: "1: Центр бадминтона"
        const locationMatch = item.firstColumn.match(/(\d+):\s+([^:]+)$/);
        if (locationMatch) {
          locationId = parseIntSafe(locationMatch[1], 1);
        }

        // Extract name (between time and location): "Воскресный бадмик"
        const nameMatch = item.firstColumn.match(/\d{2}:\d{2}\s+(.+?)\s+\d+:/);
        if (nameMatch) {
          name = nameMatch[1].trim();
        }
      }

      // Parse cells (td) - columns in order
      // Expected order: КОГДА, ЛОКАЦИЯ, ТРЕНЕРЫ, НАЗВАНИЕ, ВИДИМОЕ, КАТЕГОРИЯ, КОЛ-ВО МЕСТ, ЦЕНА, КОРТЫ
      const cells = item.cells;
      
      // Find location ID from location cell (if available)
      const locationCell = cells.find((c) => c.href && c.href.includes('/location/'));
      if (locationCell) {
        const locId = extractIdFromUrl(locationCell.href);
        if (locId) locationId = locId;
      }

      // Find trainers cell (contains "тренер" or trainer name)
      const trainerCell = cells.find((c) => c.text && (c.text.includes('тренер') || c.text.includes('tg')));
      if (trainerCell) {
        trainers = sanitizeString(trainerCell.text);
      }

      // Find name cell (if not found in firstColumn)
      if (!name) {
        const nameCell = cells.find((c) => c.text && c.text.length > 0 && !c.href);
        if (nameCell) {
          name = sanitizeString(nameCell.text);
        }
      }

      // Find visibility icon (ВИДИМОЕ)
      // Try multiple approaches to find visibility
      let visibilityCell = cells.find((c) => {
        // Check if cell has an image (Django admin uses icons for boolean fields)
        if (c.imgAlt || c.imgSrc) {
          const alt = (c.imgAlt || '').toLowerCase();
          const src = (c.imgSrc || '').toLowerCase();
          // Look for Django admin boolean icons
          return alt.includes('true') || alt.includes('false') || 
                 src.includes('icon-yes') || src.includes('icon-no') ||
                 src.includes('true') || src.includes('false');
        }
        return false;
      });
      
      if (visibilityCell) {
        isVisible = parseDjangoBoolean(visibilityCell.imgAlt || visibilityCell.imgSrc);
        logger.logParser(`Session ${id}: isVisible=${isVisible} (from icon: ${visibilityCell.imgAlt || visibilityCell.imgSrc})`);
      } else {
        // If no visibility icon found, check if we can infer from other cells
        // In Django admin, visible sessions usually have certain patterns
        // For now, default to true (visible) if not found, as sessions in "Занятия" table are typically visible
        isVisible = true;
        logger.logParser(`Session ${id}: visibility icon not found, defaulting to visible=true`);
      }

      // Find category ID from category cell
      const categoryCell = cells.find((c) => c.href && c.href.includes('/category/'));
      if (categoryCell) {
        const catId = extractIdFromUrl(categoryCell.href);
        if (catId) categoryId = catId;
      }

      // Find max spots (КОЛ-ВО МЕСТ ДЛЯ УЧЕНИКОВ) - numeric cell
      const numericCells = cells.filter((c) => {
        const text = c.text.trim();
        return /^\d+$/.test(text) && parseInt(text, 10) > 0 && parseInt(text, 10) <= 100; // Reasonable range for spots
      });
      if (numericCells.length > 0) {
        maxSpots = parseIntSafe(numericCells[0].text, 0);
      }

      // Find price (ЦЕНА) - cell with price format (may contain spaces, currency symbols)
      // Price is usually in a cell that contains digits but is not maxSpots
      // Try to find cell that looks like price (contains digits, may have spaces/currency)
      for (const cell of cells) {
        const text = cell.text.trim();
        // Skip if it's a link, empty, or matches maxSpots
        if (cell.href || !text || text === String(maxSpots)) continue;
        
        // Check if it looks like a price (contains digits, may have spaces/currency symbols)
        if (/[\d\s₽руб]+/.test(text)) {
          const parsedPrice = parsePrice(text);
          // Price should be reasonable (between 100 and 50000 rubles)
          if (parsedPrice >= 100 && parsedPrice <= 50000) {
            price = parsedPrice;
            break;
          }
        }
      }

      // Parse detail page for available spots
      logger.logParser(`Parsing details for session ${id}`);
      const availableSpots = await parseSessionDetails(id);

      parsedSessions.push({
        id,
        datetime: datetime || now,
        locationId: locationId || 1,
        trainers: trainers || '',
        name: sanitizeString(name || ''),
        categoryId: categoryId || 1,
        maxSpots: maxSpots || 0,
        availableSpots: availableSpots,
        price: price,
        status: isVisible ? 'Активно' : 'Неактивно',
        lastUpdated: now
      });
    }

    logger.logParser(`Parsed ${parsedSessions.length} sessions total`);

    return parsedSessions;
  } catch (error) {
    logger.error('Failed to parse sessions', { error: error.message });
    throw error;
  }
}

module.exports = { parseSessions };
