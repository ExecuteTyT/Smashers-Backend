/**
 * Google Sheets Service
 *
 * Handles all operations with Google Sheets:
 * - Reading data from sheets
 * - Writing/updating data
 * - Incremental updates (comparing changes)
 */

const logger = require('../config/logger');
const {
  initGoogleSheets,
  getSheetsClient,
  isSheetsEnabled,
  getSpreadsheetId,
  SHEET_NAMES
} = require('../config/googleSheets');
const { chunkArray } = require('../utils/helpers');

// Column definitions for each sheet
const SHEET_COLUMNS = {
  [SHEET_NAMES.CATEGORIES]: ['ID', 'Название', 'Порядок сортировки', 'Видимость', 'Последнее обновление'],
  [SHEET_NAMES.MEMBERSHIPS]: [
    'ID',
    'Название',
    'Тип',
    'Цена',
    'Кол-во тренировок',
    'Видимость',
    'Последнее обновление'
  ],
  [SHEET_NAMES.SESSIONS]: [
    'ID',
    'Когда',
    'Локация ID',
    'Тренеры',
    'Название',
    'Категория ID',
    'Макс мест',
    'Свободно мест',
    'Статус',
    'Последнее обновление'
  ],
  [SHEET_NAMES.LOCATIONS]: [
    'ID',
    'Название',
    'Показывать локацию',
    'Показать на экране записи',
    'Описание',
    'Порядок сортировки',
    'Последнее обновление'
  ]
};

/**
 * Ensure Google Sheets client is initialized
 * @returns {Promise<boolean>}
 */
async function ensureInitialized() {
  if (!getSheetsClient()) {
    await initGoogleSheets();
  }
  return isSheetsEnabled();
}

/**
 * Read all data from a sheet
 * @param {string} sheetName - Name of the sheet tab
 * @returns {Promise<Array<Array>>} - 2D array of values
 */
async function readSheet(sheetName) {
  if (!(await ensureInitialized())) {
    logger.warn('Google Sheets not configured, skipping read');
    return [];
  }

  try {
    const response = await getSheetsClient().spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: `${sheetName}!A:Z` // Read all columns
    });

    const rows = response.data.values || [];
    logger.logSync(`Read ${rows.length} rows from ${sheetName}`);

    return rows;
  } catch (error) {
    logger.error(`Failed to read sheet ${sheetName}`, { error: error.message });
    throw error;
  }
}

/**
 * Read sheet data as objects (using header row as keys)
 * @param {string} sheetName - Name of the sheet tab
 * @returns {Promise<Array<Object>>} - Array of row objects
 */
async function readSheetAsObjects(sheetName) {
  const rows = await readSheet(sheetName);
  if (rows.length < 2) return []; // No data rows

  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });
}

/**
 * Write data to a sheet (replaces all content)
 * @param {string} sheetName - Name of the sheet tab
 * @param {Array<Array>} data - 2D array of values (including header row)
 * @returns {Promise<void>}
 */
async function writeSheet(sheetName, data) {
  if (!(await ensureInitialized())) {
    logger.warn('Google Sheets not configured, skipping write');
    return;
  }

  try {
    // Clear existing content
    await getSheetsClient().spreadsheets.values.clear({
      spreadsheetId: getSpreadsheetId(),
      range: `${sheetName}!A:Z`
    });

    // Write new data
    if (data.length > 0) {
      await getSheetsClient().spreadsheets.values.update({
        spreadsheetId: getSpreadsheetId(),
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: data }
      });
    }

    logger.logSync(`Wrote ${data.length} rows to ${sheetName}`);
  } catch (error) {
    logger.error(`Failed to write sheet ${sheetName}`, { error: error.message });
    throw error;
  }
}

/**
 * Append rows to a sheet
 * @param {string} sheetName - Name of the sheet tab
 * @param {Array<Array>} rows - Rows to append
 * @returns {Promise<void>}
 */
async function appendRows(sheetName, rows) {
  if (!(await ensureInitialized())) {
    logger.warn('Google Sheets not configured, skipping append');
    return;
  }

  if (rows.length === 0) return;

  try {
    await getSheetsClient().spreadsheets.values.append({
      spreadsheetId: getSpreadsheetId(),
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: rows }
    });

    logger.logSync(`Appended ${rows.length} rows to ${sheetName}`);
  } catch (error) {
    logger.error(`Failed to append to sheet ${sheetName}`, { error: error.message });
    throw error;
  }
}

/**
 * Update specific rows by ID (incremental update)
 * @param {string} sheetName - Name of the sheet tab
 * @param {Array<Object>} items - Items to update (must have 'id' field)
 * @param {Function} toRowFn - Function to convert item to row array
 * @returns {Promise<Object>} - { added: number, updated: number }
 */
async function updateByIds(sheetName, items, toRowFn) {
  if (!(await ensureInitialized())) {
    logger.warn('Google Sheets not configured, skipping update');
    return { added: 0, updated: 0 };
  }

  if (items.length === 0) return { added: 0, updated: 0 };

  try {
    // Read existing data
    const existingRows = await readSheet(sheetName);
    const headers = existingRows[0] || SHEET_COLUMNS[sheetName];

    // Build map of existing IDs to row numbers
    const existingMap = new Map();
    for (let i = 1; i < existingRows.length; i++) {
      const id = existingRows[i][0]; // ID is always first column
      if (id) existingMap.set(String(id), i + 1); // +1 for 1-based row number
    }

    // Separate items into updates and additions
    const updates = [];
    const additions = [];

    for (const item of items) {
      const row = toRowFn(item);
      const id = String(item.id);

      if (existingMap.has(id)) {
        updates.push({ rowNum: existingMap.get(id), data: row });
      } else {
        additions.push(row);
      }
    }

    // Batch update existing rows
    if (updates.length > 0) {
      const batchData = updates.map(({ rowNum, data }) => ({
        range: `${sheetName}!A${rowNum}`,
        values: [data]
      }));

      // Process in chunks of 100 to avoid API limits
      const chunks = chunkArray(batchData, 100);
      for (const chunk of chunks) {
        await getSheetsClient().spreadsheets.values.batchUpdate({
          spreadsheetId: getSpreadsheetId(),
          resource: {
            valueInputOption: 'USER_ENTERED',
            data: chunk
          }
        });
      }
    }

    // Append new rows
    if (additions.length > 0) {
      await appendRows(sheetName, additions);
    }

    logger.logSync(`Updated ${sheetName}`, {
      updated: updates.length,
      added: additions.length
    });

    return { added: additions.length, updated: updates.length };
  } catch (error) {
    logger.error(`Failed to update sheet ${sheetName}`, { error: error.message });
    throw error;
  }
}

// ============================================
// Entity-specific conversion functions
// ============================================

/**
 * Convert category object to row array
 */
function categoryToRow(category) {
  return [
    category.id,
    category.name,
    category.sortOrder,
    category.isVisible ? 'TRUE' : 'FALSE',
    category.lastUpdated instanceof Date
      ? category.lastUpdated.toISOString()
      : category.lastUpdated
  ];
}

/**
 * Convert membership object to row array
 */
function membershipToRow(membership) {
  return [
    membership.id,
    membership.name,
    membership.type,
    membership.price,
    membership.sessionCount,
    membership.isVisible ? 'TRUE' : 'FALSE',
    membership.lastUpdated instanceof Date
      ? membership.lastUpdated.toISOString()
      : membership.lastUpdated
  ];
}

/**
 * Convert session object to row array
 */
function sessionToRow(session) {
  return [
    session.id,
    session.datetime instanceof Date ? session.datetime.toISOString() : session.datetime,
    session.locationId,
    session.trainers,
    session.name,
    session.categoryId,
    session.maxSpots,
    session.availableSpots,
    session.status,
    session.lastUpdated instanceof Date ? session.lastUpdated.toISOString() : session.lastUpdated
  ];
}

/**
 * Convert location object to row array
 */
function locationToRow(location) {
  return [
    location.id,
    location.name,
    location.showLocation ? 'TRUE' : 'FALSE',
    location.showOnBookingScreen ? 'TRUE' : 'FALSE',
    location.description || '',
    location.sortOrder,
    location.lastUpdated instanceof Date
      ? location.lastUpdated.toISOString()
      : location.lastUpdated
  ];
}

// ============================================
// High-level update methods
// ============================================

/**
 * Update categories in Google Sheets
 * @param {Array} categories - Category objects
 * @returns {Promise<Object>}
 */
async function updateCategories(categories) {
  return updateByIds(SHEET_NAMES.CATEGORIES, categories, categoryToRow);
}

/**
 * Update memberships in Google Sheets
 * @param {Array} memberships - Membership objects
 * @returns {Promise<Object>}
 */
async function updateMemberships(memberships) {
  return updateByIds(SHEET_NAMES.MEMBERSHIPS, memberships, membershipToRow);
}

/**
 * Update sessions in Google Sheets
 * @param {Array} sessions - Session objects
 * @returns {Promise<Object>}
 */
async function updateSessions(sessions) {
  return updateByIds(SHEET_NAMES.SESSIONS, sessions, sessionToRow);
}

/**
 * Update locations in Google Sheets
 * @param {Array} locations - Location objects
 * @returns {Promise<Object>}
 */
async function updateLocations(locations) {
  return updateByIds(SHEET_NAMES.LOCATIONS, locations, locationToRow);
}

/**
 * Initialize sheet with headers if empty
 * @param {string} sheetName - Sheet name
 * @returns {Promise<void>}
 */
async function initializeSheetHeaders(sheetName) {
  const rows = await readSheet(sheetName);
  if (rows.length === 0) {
    const headers = SHEET_COLUMNS[sheetName];
    if (headers) {
      await writeSheet(sheetName, [headers]);
      logger.logSync(`Initialized headers for ${sheetName}`);
    }
  }
}

/**
 * Initialize all sheets with headers
 * @returns {Promise<void>}
 */
async function initializeAllSheets() {
  if (!(await ensureInitialized())) {
    logger.warn('Google Sheets not configured, skipping initialization');
    return;
  }

  for (const sheetName of Object.values(SHEET_NAMES)) {
    await initializeSheetHeaders(sheetName);
  }
}

module.exports = {
  readSheet,
  readSheetAsObjects,
  writeSheet,
  appendRows,
  updateByIds,
  updateCategories,
  updateMemberships,
  updateSessions,
  updateLocations,
  initializeAllSheets,
  SHEET_COLUMNS,
  categoryToRow,
  membershipToRow,
  sessionToRow,
  locationToRow
};
