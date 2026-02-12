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
const { extractIdFromUrl, parseDjangoBoolean, sanitizeString, parseIntSafe, parseRussianDate, formatDateForDjango, parsePrice, moscowTimeToUTC } = require('../../utils/helpers');

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
        // Extract date and time: "01.02.26 (Вс) 19:30" or "01.02.2026 (Вс) 19:30"
        // Support both 2-digit and 4-digit years
        const dateTimeMatch = item.firstColumn.match(/(\d{2})\.(\d{2})\.(\d{2,4})\s+\([^)]+\)\s+(\d{2}):(\d{2})/);
        if (dateTimeMatch) {
          const [, day, month, yearStr, hour, minute] = dateTimeMatch;
          // Convert 2-digit year to 4-digit (assume 2000-2099)
          let year = parseInt(yearStr, 10);
          if (yearStr.length === 2) {
            year = year < 50 ? 2000 + year : 1900 + year; // 00-49 = 2000-2049, 50-99 = 1950-1999
          }
          datetime = moscowTimeToUTC(year, parseInt(month, 10), parseInt(day, 10), parseInt(hour, 10), parseInt(minute, 10));
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
      
      logger.logParser(`Session ${id}: firstColumn="${item.firstColumn?.substring(0, 100)}", cells count=${cells.length}`);
      
      // Log all cells for debugging
      if (cells.length > 0) {
        logger.logParser(`Session ${id}: cells content: ${cells.map((c, i) => `[${i}]="${c.text?.substring(0, 50)}"`).join(', ')}`);
      }
      
      // Parse date/time from cells if not found in firstColumn
      // Look for cell with date pattern: "DD.MM.YY (День) HH:mm" or "DD.MM.YYYY (День) HH:mm"
      if (!datetime || datetime === now) {
        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i];
          const text = cell.text.trim();
          // Try to match date pattern: "31.01.26 (Сб) 19:30" or "31.01.2026 (Пт) 19:30"
          // Support both 2-digit and 4-digit years
          const dateTimeMatch = text.match(/(\d{2})\.(\d{2})\.(\d{2,4})\s+(?:\([^)]+\)\s+)?(\d{2}):(\d{2})/);
          if (dateTimeMatch) {
            const [, day, month, yearStr, hour, minute] = dateTimeMatch;
            // Convert 2-digit year to 4-digit (assume 2000-2099)
            let year = parseInt(yearStr, 10);
            if (yearStr.length === 2) {
              year = year < 50 ? 2000 + year : 1900 + year; // 00-49 = 2000-2049, 50-99 = 1950-1999
            }
            datetime = moscowTimeToUTC(year, parseInt(month, 10), parseInt(day, 10), parseInt(hour, 10), parseInt(minute, 10));
            logger.logParser(`Session ${id}: parsed datetime from cell[${i}]: "${text}" -> ${datetime.toISOString()}`);
            break;
          }
        }
        if (datetime === now) {
          logger.logParser(`Session ${id}: WARNING - datetime not found, using current time: ${datetime.toISOString()}`);
        }
      }
      
      // Parse cells by index (based on Django admin table structure):
      // [0] = checkbox (empty)
      // [1] = КОГДА (date/time) - already parsed above
      // [2] = ЛОКАЦИЯ (location) - format: "ID: Name" or link
      // [3] = ТРЕНЕРЫ (trainers) - format: "ID: Name tg" or "ID: Name 🏸 tg"
      // [4] = НАЗВАНИЕ (name)
      // [5] = ВИДИМОЕ (visible) - icon
      // [6] = КАТЕГОРИЯ (category) - format: "ID: Name" or "-"
      // [7] = КОЛ-ВО МЕСТ ДЛЯ УЧЕНИКОВ (max spots)
      // [8] = ЦЕНА (price)
      // [9] = КОРТЫ (courts) - usually "-"
      
      // Parse location from cell[2]
      if (cells.length > 2) {
        const locationText = cells[2].text.trim();
        // Try to extract ID from link first
        if (cells[2].href && cells[2].href.includes('/location/')) {
          const locId = extractIdFromUrl(cells[2].href);
          if (locId) locationId = locId;
        } else if (locationText) {
          // Extract ID from format "1: Центр бадминтона🏸"
          const locationMatch = locationText.match(/^(\d+):/);
          if (locationMatch) {
            locationId = parseIntSafe(locationMatch[1], 1);
            logger.logParser(`Session ${id}: locationId=${locationId} from text "${locationText}"`);
          }
        }
      }

      // Parse trainers from cell[3]
      if (cells.length > 3) {
        const trainersText = cells[3].text.trim();
        if (trainersText) {
          trainers = sanitizeString(trainersText);
          logger.logParser(`Session ${id}: trainers="${trainers}" from cell[3]`);
        }
      }

      // Parse name from cell[4]
      if (cells.length > 4) {
        const nameText = cells[4].text.trim();
        if (nameText) {
          name = sanitizeString(nameText);
          logger.logParser(`Session ${id}: name="${name}" from cell[4]`);
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
      // Category is in cell[6] as text like "1: Тренировка" or "-" (empty)
      // First try to find by link (if it's a link)
      let categoryCell = cells.find((c) => c.href && c.href.includes('/category/'));
      if (categoryCell) {
        const catId = extractIdFromUrl(categoryCell.href);
        if (catId) {
          categoryId = catId;
          logger.logParser(`Session ${id}: categoryId=${categoryId} from link`);
        }
      } else {
        // If no link, try to parse from cell[6] text (format: "ID: Name" or "-")
        if (cells.length > 6) {
          const categoryText = cells[6].text.trim();
          if (categoryText && categoryText !== '-') {
            // Extract ID from format "1: Тренировка" or "2: Игровая"
            const categoryMatch = categoryText.match(/^(\d+):/);
            if (categoryMatch) {
              categoryId = parseIntSafe(categoryMatch[1], 1);
              logger.logParser(`Session ${id}: categoryId=${categoryId} from text "${categoryText}"`);
            } else {
              logger.logParser(`Session ${id}: category text found but no ID: "${categoryText}"`);
            }
          } else {
            logger.logParser(`Session ${id}: category is empty or "-", using default categoryId=1`);
          }
        }
      }

      // Parse max spots from cell[7] (КОЛ-ВО МЕСТ ДЛЯ УЧЕНИКОВ)
      if (cells.length > 7) {
        const maxSpotsText = cells[7].text.trim();
        if (maxSpotsText && /^\d+$/.test(maxSpotsText)) {
          maxSpots = parseIntSafe(maxSpotsText, 0);
          logger.logParser(`Session ${id}: maxSpots=${maxSpots} from cell[7]`);
        }
      }

      // Parse price from cell[8] (ЦЕНА)
      if (cells.length > 8) {
        const priceText = cells[8].text.trim();
        if (priceText && priceText !== '-') {
          const parsedPrice = parsePrice(priceText);
          // Price should be reasonable (between 100 and 50000 rubles)
          if (parsedPrice >= 100 && parsedPrice <= 50000) {
            price = parsedPrice;
            logger.logParser(`Session ${id}: price=${price} from cell[8] "${priceText}"`);
          } else {
            logger.logParser(`Session ${id}: price "${priceText}" parsed to ${parsedPrice}, but out of range, skipping`);
          }
        } else {
          logger.logParser(`Session ${id}: price is empty or "-"`);
        }
      }

      // Parse detail page for available spots
      logger.logParser(`Parsing details for session ${id}`);
      const availableSpots = await parseSessionDetails(id);

      // Log final parsed values for debugging
      logger.logParser(`Session ${id} final: datetime=${datetime.toISOString()}, name="${name}", locationId=${locationId}, categoryId=${categoryId}, maxSpots=${maxSpots}, price=${price}, isVisible=${isVisible}, status=${isVisible ? 'Активно' : 'Неактивно'}`);

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
