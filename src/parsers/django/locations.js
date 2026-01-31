/**
 * Locations Parser
 *
 * Parses locations from Django admin panel.
 * URL: /admin/core/location/
 */

const logger = require('../../config/logger');
const { navigateToAdminPage } = require('./auth');
const { extractIdFromUrl, parseDjangoBoolean, sanitizeString, parseIntSafe } = require('../../utils/helpers');

/**
 * Parse locations from Django admin
 * @returns {Promise<Array>} - Array of location objects
 */
async function parseLocations() {
  logger.logParser('Parsing locations');

  try {
    const page = await navigateToAdminPage('/core/location/');

    // Wait for table to load
    await page.waitForSelector('#result_list', { timeout: 10000 }).catch(() => {
      logger.logParser('No result_list found, table might be empty');
    });

    // Parse table rows
    const locations = await page.evaluate(() => {
      const rows = document.querySelectorAll('#result_list tbody tr');
      const results = [];

      rows.forEach((row) => {
        if (!row.querySelector('th') && !row.querySelector('td a')) return;

        const link = row.querySelector('th a') || row.querySelector('td a');
        const href = link ? link.getAttribute('href') : null;

        const cells = row.querySelectorAll('td');
        const thCell = row.querySelector('th');
        
        // В Django админке для локаций структура может быть разной:
        // Вариант 1: th содержит ID (link), td[0] содержит название
        // Вариант 2: th содержит название (link)
        // Ищем название по наличию кириллицы
        const thText = thCell ? thCell.textContent.trim() : '';
        const thLink = thCell ? thCell.querySelector('a') : null;
        const thLinkText = thLink ? thLink.textContent.trim() : '';
        
        // Проверяем все ячейки для названия
        let locationName = '';
        let showLocationIndex = -1;
        let showOnBookingScreenIndex = -1;
        let descriptionIndex = -1;
        let sortOrderIndex = -1;
        
        // Ищем название - обычно это первая текстовая ячейка с кириллицей
        for (let i = 0; i < cells.length; i++) {
          const cellText = cells[i].textContent.trim();
          const hasImage = cells[i].querySelector('img');
          
          // Если ячейка содержит кириллицу и не является числом - это название или описание
          if (!hasImage && /[а-яёА-ЯЁ]/.test(cellText) && !/^\d+$/.test(cellText)) {
            if (!locationName) {
              locationName = cellText;
            } else if (!descriptionIndex || descriptionIndex === -1) {
              descriptionIndex = i;
            }
          }
          // Если ячейка содержит изображение - это showLocation или showOnBookingScreen
          else if (hasImage) {
            if (showLocationIndex === -1) {
              showLocationIndex = i;
            } else if (showOnBookingScreenIndex === -1) {
              showOnBookingScreenIndex = i;
            }
          }
          // Если ячейка содержит только цифры и нет изображения - это sort_order
          else if (!hasImage && /^\d+$/.test(cellText) && sortOrderIndex === -1) {
            sortOrderIndex = i;
          }
        }
        
        // Если название не найдено в ячейках, пробуем из th
        if (!locationName) {
          // Если th содержит кириллицу - это название
          if (/[а-яёА-ЯЁ]/.test(thText)) {
            locationName = thText;
          } else if (thLinkText && /[а-яёА-ЯЁ]/.test(thLinkText)) {
            locationName = thLinkText;
          } else {
            // Fallback: используем thText или первую ячейку
            locationName = thText || (cells[0] ? cells[0].textContent.trim() : '');
          }
        }
        
        // Если индексы не найдены, используем дефолтные
        if (showLocationIndex === -1) showLocationIndex = 0;
        if (showOnBookingScreenIndex === -1) showOnBookingScreenIndex = 1;
        if (descriptionIndex === -1) descriptionIndex = 2;
        if (sortOrderIndex === -1) sortOrderIndex = 3;

        const item = {
          href,
          name: locationName,
          thText: thText,
          showLocationIndex,
          showOnBookingScreenIndex,
          descriptionIndex,
          sortOrderIndex,
          cells: Array.from(cells).map((cell) => {
            const img = cell.querySelector('img');
            return {
              text: cell.textContent.trim(),
              imgAlt: img ? img.getAttribute('alt') : null,
              imgSrc: img ? img.getAttribute('src') : null
            };
          })
        };

        results.push(item);
      });

      return results;
    });

    // Transform parsed data to location objects
    const now = new Date();
    const parsedLocations = locations
      .filter((item) => item.href)
      .map((item) => {
        const id = extractIdFromUrl(item.href);
        if (!id) return null;

        // Используем индексы, найденные при парсинге
        return {
          id,
          name: sanitizeString(item.name || ''),
          showLocation: parseDjangoBoolean(item.cells[item.showLocationIndex]?.imgAlt || item.cells[item.showLocationIndex]?.imgSrc),
          showOnBookingScreen: parseDjangoBoolean(item.cells[item.showOnBookingScreenIndex]?.imgAlt || item.cells[item.showOnBookingScreenIndex]?.imgSrc),
          description: sanitizeString(item.cells[item.descriptionIndex]?.text || ''),
          sortOrder: parseIntSafe(item.cells[item.sortOrderIndex]?.text, 0),
          lastUpdated: now
        };
      })
      .filter(Boolean);

    logger.logParser(`Parsed ${parsedLocations.length} locations`);

    return parsedLocations;
  } catch (error) {
    logger.error('Failed to parse locations', { error: error.message });
    throw error;
  }
}

module.exports = { parseLocations };
