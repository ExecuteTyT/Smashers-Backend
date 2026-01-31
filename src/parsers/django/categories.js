/**
 * Categories Parser
 *
 * Parses categories from Django admin panel.
 * URL: /admin/core/category/
 */

const logger = require('../../config/logger');
const { navigateToAdminPage } = require('./auth');
const { extractIdFromUrl, parseDjangoBoolean, sanitizeString, parseIntSafe } = require('../../utils/helpers');

/**
 * Parse categories from Django admin
 * @returns {Promise<Array>} - Array of category objects
 */
async function parseCategories() {
  logger.logParser('Parsing categories');

  try {
    const page = await navigateToAdminPage('/core/category/');

    // Wait for table to load
    await page.waitForSelector('#result_list', { timeout: 10000 }).catch(() => {
      logger.logParser('No result_list found, table might be empty');
    });

    // Parse table rows
    const categories = await page.evaluate(() => {
      const rows = document.querySelectorAll('#result_list tbody tr');
      const results = [];

      rows.forEach((row) => {
        // Skip empty rows
        if (!row.querySelector('th') && !row.querySelector('td a')) return;

        // Get the link to extract ID
        const link = row.querySelector('th a') || row.querySelector('td a');
        const href = link ? link.getAttribute('href') : null;

        // Get all cells
        const cells = row.querySelectorAll('td');
        const thCell = row.querySelector('th');

        // Extract data
        // В Django админке для категорий структура может быть разной:
        // Вариант 1: th содержит ID (link), td[0] содержит название
        // Вариант 2: th содержит название (link)
        // Ищем название по наличию кириллицы
        const thText = thCell ? thCell.textContent.trim() : '';
        const thLink = thCell ? thCell.querySelector('a') : null;
        const thLinkText = thLink ? thLink.textContent.trim() : '';
        
        // Проверяем все ячейки для названия
        let categoryName = '';
        let sortOrderIndex = -1;
        let isVisibleIndex = -1;
        
        // Ищем название - обычно это первая текстовая ячейка с кириллицей
        for (let i = 0; i < cells.length; i++) {
          const cellText = cells[i].textContent.trim();
          const hasImage = cells[i].querySelector('img');
          
          // Если ячейка содержит кириллицу и не является числом - это название
          if (!hasImage && /[а-яёА-ЯЁ]/.test(cellText) && !/^\d+$/.test(cellText)) {
            if (!categoryName) {
              categoryName = cellText;
            }
          }
          // Если ячейка содержит только цифры и нет изображения - это sort_order
          else if (!hasImage && /^\d+$/.test(cellText) && sortOrderIndex === -1) {
            sortOrderIndex = i;
          }
          // Если ячейка содержит изображение - это is_visible
          else if (hasImage && isVisibleIndex === -1) {
            isVisibleIndex = i;
          }
        }
        
        // Если название не найдено в ячейках, пробуем из th
        if (!categoryName) {
          // Если th содержит кириллицу - это название
          if (/[а-яёА-ЯЁ]/.test(thText)) {
            categoryName = thText;
          } else if (thLinkText && /[а-яёА-ЯЁ]/.test(thLinkText)) {
            categoryName = thLinkText;
          } else {
            // Fallback: используем thText или первую ячейку
            categoryName = thText || (cells[0] ? cells[0].textContent.trim() : '');
          }
        }
        
        // Если индексы не найдены, используем дефолтные
        if (sortOrderIndex === -1) sortOrderIndex = 0;
        if (isVisibleIndex === -1) isVisibleIndex = 1;
        
        const item = {
          href,
          name: categoryName,
          thText: thText,
          sortOrderIndex,
          isVisibleIndex,
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

    // Transform parsed data to category objects
    const now = new Date();
    const parsedCategories = categories
      .filter((item) => item.href)
      .map((item) => {
        const id = extractIdFromUrl(item.href);
        if (!id) return null;

        // Используем индексы, найденные при парсинге
        return {
          id,
          name: sanitizeString(item.name || ''),
          sortOrder: parseIntSafe(item.cells[item.sortOrderIndex]?.text, 0),
          isVisible: parseDjangoBoolean(item.cells[item.isVisibleIndex]?.imgAlt || item.cells[item.isVisibleIndex]?.imgSrc),
          lastUpdated: now
        };
      })
      .filter(Boolean);

    logger.logParser(`Parsed ${parsedCategories.length} categories`);

    return parsedCategories;
  } catch (error) {
    logger.error('Failed to parse categories', { error: error.message });
    throw error;
  }
}

module.exports = { parseCategories };
