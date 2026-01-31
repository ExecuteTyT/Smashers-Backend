/**
 * Sync Service
 *
 * Synchronizes data from Google Sheets to PostgreSQL database.
 * This runs more frequently than the parser to keep the database updated
 * if someone manually edits the Google Sheet.
 */

const logger = require('../config/logger');
const { prisma } = require('../config/database');
const { isSheetsEnabled, SHEET_NAMES } = require('../config/googleSheets');
const { readSheetAsObjects } = require('./googleSheets.service');
const { recordSyncStatus } = require('./parser.service');

/**
 * Parse boolean from sheet value
 * @param {string} value - Sheet cell value
 * @returns {boolean}
 */
function parseSheetBoolean(value) {
  if (!value) return false;
  const str = String(value).toLowerCase();
  return str === 'true' || str === '1' || str === 'yes' || str === 'да';
}

/**
 * Parse date from sheet value
 * @param {string} value - Sheet cell value
 * @returns {Date}
 */
function parseSheetDate(value) {
  if (!value) return new Date();
  const date = new Date(value);
  return isNaN(date.getTime()) ? new Date() : date;
}

/**
 * Parse integer from sheet value
 * @param {string} value - Sheet cell value
 * @param {number} fallback - Fallback value
 * @returns {number}
 */
function parseSheetInt(value, fallback = 0) {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Sync categories from Google Sheets to PostgreSQL
 * @returns {Promise<Object>} - { synced: number, errors: number }
 */
async function syncCategories() {
  logger.logSync('Syncing categories from Sheets to DB');

  const rows = await readSheetAsObjects(SHEET_NAMES.CATEGORIES);
  let synced = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const id = parseSheetInt(row['ID']);
      if (!id) continue;

      await prisma.category.upsert({
        where: { id },
        create: {
          id,
          name: row['Название'] || '',
          sortOrder: parseSheetInt(row['Порядок сортировки']),
          isVisible: parseSheetBoolean(row['Видимость']),
          lastUpdated: parseSheetDate(row['Последнее обновление'])
        },
        update: {
          name: row['Название'] || '',
          sortOrder: parseSheetInt(row['Порядок сортировки']),
          isVisible: parseSheetBoolean(row['Видимость']),
          lastUpdated: parseSheetDate(row['Последнее обновление'])
        }
      });
      synced++;
    } catch (error) {
      logger.error('Failed to sync category', { row, error: error.message });
      errors++;
    }
  }

  logger.logSync(`Categories synced: ${synced}, errors: ${errors}`);
  return { synced, errors };
}

/**
 * Sync locations from Google Sheets to PostgreSQL
 * @returns {Promise<Object>}
 */
async function syncLocations() {
  logger.logSync('Syncing locations from Sheets to DB');

  const rows = await readSheetAsObjects(SHEET_NAMES.LOCATIONS);
  let synced = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const id = parseSheetInt(row['ID']);
      if (!id) continue;

      await prisma.location.upsert({
        where: { id },
        create: {
          id,
          name: row['Название'] || '',
          showLocation: parseSheetBoolean(row['Показывать локацию']),
          showOnBookingScreen: parseSheetBoolean(row['Показать на экране записи']),
          description: row['Описание'] || null,
          sortOrder: parseSheetInt(row['Порядок сортировки']),
          lastUpdated: parseSheetDate(row['Последнее обновление'])
        },
        update: {
          name: row['Название'] || '',
          showLocation: parseSheetBoolean(row['Показывать локацию']),
          showOnBookingScreen: parseSheetBoolean(row['Показать на экране записи']),
          description: row['Описание'] || null,
          sortOrder: parseSheetInt(row['Порядок сортировки']),
          lastUpdated: parseSheetDate(row['Последнее обновление'])
        }
      });
      synced++;
    } catch (error) {
      logger.error('Failed to sync location', { row, error: error.message });
      errors++;
    }
  }

  logger.logSync(`Locations synced: ${synced}, errors: ${errors}`);
  return { synced, errors };
}

/**
 * Sync memberships from Google Sheets to PostgreSQL
 * @returns {Promise<Object>}
 */
async function syncMemberships() {
  logger.logSync('Syncing memberships from Sheets to DB');

  const rows = await readSheetAsObjects(SHEET_NAMES.MEMBERSHIPS);
  let synced = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const id = parseSheetInt(row['ID']);
      if (!id) continue;

      await prisma.membership.upsert({
        where: { id },
        create: {
          id,
          name: row['Название'] || '',
          type: row['Тип'] || 'Обычный абик',
          price: parseSheetInt(row['Цена']),
          sessionCount: parseSheetInt(row['Кол-во тренировок'], 1),
          isVisible: parseSheetBoolean(row['Видимость']),
          lastUpdated: parseSheetDate(row['Последнее обновление'])
        },
        update: {
          name: row['Название'] || '',
          type: row['Тип'] || 'Обычный абик',
          price: parseSheetInt(row['Цена']),
          sessionCount: parseSheetInt(row['Кол-во тренировок'], 1),
          isVisible: parseSheetBoolean(row['Видимость']),
          lastUpdated: parseSheetDate(row['Последнее обновление'])
        }
      });
      synced++;
    } catch (error) {
      logger.error('Failed to sync membership', { row, error: error.message });
      errors++;
    }
  }

  logger.logSync(`Memberships synced: ${synced}, errors: ${errors}`);
  return { synced, errors };
}

/**
 * Sync sessions from Google Sheets to PostgreSQL
 * @returns {Promise<Object>}
 */
async function syncSessions() {
  logger.logSync('Syncing sessions from Sheets to DB');

  const rows = await readSheetAsObjects(SHEET_NAMES.SESSIONS);
  let synced = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const id = parseSheetInt(row['ID']);
      if (!id) continue;

      const locationId = parseSheetInt(row['Локация ID'], 1);
      const categoryId = parseSheetInt(row['Категория ID'], 1);

      // Check if location and category exist
      const locationExists = await prisma.location.findUnique({ where: { id: locationId } });
      const categoryExists = await prisma.category.findUnique({ where: { id: categoryId } });

      if (!locationExists || !categoryExists) {
        logger.warn(`Skipping session ${id}: missing location or category`, {
          locationId,
          categoryId,
          locationExists: !!locationExists,
          categoryExists: !!categoryExists
        });
        errors++;
        continue;
      }

      await prisma.session.upsert({
        where: { id },
        create: {
          id,
          datetime: parseSheetDate(row['Когда']),
          locationId,
          trainers: row['Тренеры'] || '',
          name: row['Название'] || '',
          categoryId,
          maxSpots: parseSheetInt(row['Макс мест'], 10),
          availableSpots: parseSheetInt(row['Свободно мест'], 0),
          status: row['Статус'] || 'Активно',
          lastUpdated: parseSheetDate(row['Последнее обновление'])
        },
        update: {
          datetime: parseSheetDate(row['Когда']),
          locationId,
          trainers: row['Тренеры'] || '',
          name: row['Название'] || '',
          categoryId,
          maxSpots: parseSheetInt(row['Макс мест'], 10),
          availableSpots: parseSheetInt(row['Свободно мест'], 0),
          status: row['Статус'] || 'Активно',
          lastUpdated: parseSheetDate(row['Последнее обновление'])
        }
      });
      synced++;
    } catch (error) {
      logger.error('Failed to sync session', { row, error: error.message });
      errors++;
    }
  }

  logger.logSync(`Sessions synced: ${synced}, errors: ${errors}`);
  return { synced, errors };
}

/**
 * Run full sync from Google Sheets to PostgreSQL
 * @returns {Promise<Object>}
 */
async function syncAll() {
  const startTime = Date.now();
  logger.logSync('Starting full sync from Sheets to DB');

  if (!isSheetsEnabled()) {
    logger.warn('Google Sheets not configured, skipping sync');
    return {
      success: false,
      reason: 'Google Sheets not configured',
      duration: 0
    };
  }

  const result = {
    success: true,
    synced: {
      categories: 0,
      locations: 0,
      memberships: 0,
      sessions: 0
    },
    errors: [],
    duration: 0
  };

  try {
    // Sync in dependency order: categories and locations first, then sessions
    const categoriesResult = await syncCategories();
    result.synced.categories = categoriesResult.synced;
    if (categoriesResult.errors > 0) {
      result.errors.push({ entity: 'categories', count: categoriesResult.errors });
    }

    const locationsResult = await syncLocations();
    result.synced.locations = locationsResult.synced;
    if (locationsResult.errors > 0) {
      result.errors.push({ entity: 'locations', count: locationsResult.errors });
    }

    const membershipsResult = await syncMemberships();
    result.synced.memberships = membershipsResult.synced;
    if (membershipsResult.errors > 0) {
      result.errors.push({ entity: 'memberships', count: membershipsResult.errors });
    }

    const sessionsResult = await syncSessions();
    result.synced.sessions = sessionsResult.synced;
    if (sessionsResult.errors > 0) {
      result.errors.push({ entity: 'sessions', count: sessionsResult.errors });
    }

    result.success = result.errors.length === 0;
    result.duration = Date.now() - startTime;

    // Record sync status
    await recordSyncStatus('sheets_to_db', result);

    logger.logSync('Full sync completed', {
      synced: result.synced,
      errors: result.errors.length,
      duration: `${result.duration}ms`
    });

    return result;
  } catch (error) {
    result.success = false;
    result.errors.push({ entity: 'general', error: error.message });
    result.duration = Date.now() - startTime;

    await recordSyncStatus('sheets_to_db', result);

    logger.error('Full sync failed', { error: error.message });
    throw error;
  }
}

module.exports = {
  syncCategories,
  syncLocations,
  syncMemberships,
  syncSessions,
  syncAll
};
