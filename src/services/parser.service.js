/**
 * Parser Service
 *
 * Orchestrates parsing from Django admin and updating Google Sheets.
 * This is the main entry point for the parser job.
 */

const logger = require('../config/logger');
const { prisma } = require('../config/database');
const { parseAll } = require('../parsers');
const googleSheetsService = require('./googleSheets.service');
const telegramService = require('./telegram.service');
const dbSyncService = require('./dbSync.service');

/**
 * Check if today is Friday (for weekly schedule updates)
 * @returns {boolean}
 */
function isFriday() {
  const today = new Date();
  return today.getDay() === 5; // 5 = Friday
}

/**
 * Run full parse and save to database (and optionally Google Sheets)
 * @param {boolean} forceFridayUpdate - Force Friday update behavior (clear old sessions)
 * @returns {Promise<Object>} - Parse result with statistics
 */
async function runFullParse(forceFridayUpdate = false) {
  const startTime = Date.now();
  const isFridayUpdate = forceFridayUpdate || isFriday();
  
  logger.logParser('Starting full parse', { isFridayUpdate });

  const result = {
    success: false,
    parsed: {
      categories: 0,
      locations: 0,
      memberships: 0,
      sessions: 0
    },
    saved: {
      categories: { added: 0, updated: 0, errors: 0 },
      locations: { added: 0, updated: 0, errors: 0 },
      memberships: { added: 0, updated: 0, errors: 0 },
      sessions: { added: 0, updated: 0, deleted: 0, errors: 0 }
    },
    updated: {
      categories: { added: 0, updated: 0 },
      locations: { added: 0, updated: 0 },
      memberships: { added: 0, updated: 0 },
      sessions: { added: 0, updated: 0 }
    },
    errors: [],
    duration: 0
  };

  try {
    // Step 1: Parse all entities from Django admin
    const parsed = await parseAll();

    result.parsed = {
      categories: parsed.categories.length,
      locations: parsed.locations.length,
      memberships: parsed.memberships.length,
      sessions: parsed.sessions.length
    };
    result.errors.push(...parsed.errors);

    // Step 2: Save to PostgreSQL database
    try {
      const dbResult = await dbSyncService.saveAllToDatabase(parsed, isFridayUpdate);
      result.saved = dbResult;
      
      if (isFridayUpdate) {
        logger.logParser('Friday update: old sessions cleared', { deleted: dbResult.sessions.deleted });
      }
    } catch (error) {
      logger.error('Failed to save to database', { error: error.message });
      result.errors.push({ entity: 'database', error: error.message });
    }

    // Step 3: Update Google Sheets (optional, if configured)
    try {
      result.updated.categories = await googleSheetsService.updateCategories(parsed.categories);
    } catch (error) {
      logger.error('Failed to update categories in Sheets', { error: error.message });
      result.errors.push({ entity: 'sheets_categories', error: error.message });
    }

    try {
      result.updated.locations = await googleSheetsService.updateLocations(parsed.locations);
    } catch (error) {
      logger.error('Failed to update locations in Sheets', { error: error.message });
      result.errors.push({ entity: 'sheets_locations', error: error.message });
    }

    try {
      result.updated.memberships = await googleSheetsService.updateMemberships(parsed.memberships);
    } catch (error) {
      logger.error('Failed to update memberships in Sheets', { error: error.message });
      result.errors.push({ entity: 'sheets_memberships', error: error.message });
    }

    try {
      result.updated.sessions = await googleSheetsService.updateSessions(parsed.sessions);
    } catch (error) {
      logger.error('Failed to update sessions in Sheets', { error: error.message });
      result.errors.push({ entity: 'sheets_sessions', error: error.message });
    }

    result.success = result.errors.length === 0;
    result.duration = Date.now() - startTime;

    // Step 3: Record sync status
    await recordSyncStatus('parser', result);

    // Step 4: Send alert if there were errors
    if (result.errors.length > 0) {
      await telegramService.sendSystemAlert(
        `Parser completed with ${result.errors.length} error(s):\n` +
          result.errors.map((e) => `- ${e.entity}: ${e.error}`).join('\n')
      );
    }

    logger.logParser('Full parse completed', {
      success: result.success,
      parsed: result.parsed,
      saved: result.saved,
      duration: `${result.duration}ms`,
      isFridayUpdate
    });

    return result;
  } catch (error) {
    result.errors.push({ entity: 'general', error: error.message });
    result.duration = Date.now() - startTime;

    await recordSyncStatus('parser', result);

    // Send critical alert
    await telegramService.sendSystemAlert(`Parser FAILED: ${error.message}`);

    logger.error('Full parse failed', { error: error.message });
    throw error;
  }
}

/**
 * Record sync status in database
 * @param {string} syncType - Type of sync ('parser' or 'sheets_to_db')
 * @param {Object} result - Parse/sync result
 */
async function recordSyncStatus(syncType, result) {
  try {
    await prisma.syncStatus.create({
      data: {
        syncType,
        lastSync: new Date(),
        status: result.success ? 'success' : 'failed',
        itemsParsed: result.parsed || result.synced || {},
        errorMessage: result.errors.length > 0 ? JSON.stringify(result.errors) : null,
        duration: result.duration
      }
    });
  } catch (error) {
    logger.error('Failed to record sync status', { error: error.message });
  }
}

/**
 * Get last sync status
 * @param {string} syncType - Type of sync
 * @returns {Promise<Object|null>}
 */
async function getLastSyncStatus(syncType = null) {
  try {
    const where = syncType ? { syncType } : {};
    const status = await prisma.syncStatus.findFirst({
      where,
      orderBy: { lastSync: 'desc' }
    });
    return status;
  } catch (error) {
    logger.error('Failed to get sync status', { error: error.message });
    return null;
  }
}

/**
 * Get sync history
 * @param {number} limit - Number of records to return
 * @returns {Promise<Array>}
 */
async function getSyncHistory(limit = 10) {
  try {
    return await prisma.syncStatus.findMany({
      orderBy: { lastSync: 'desc' },
      take: limit
    });
  } catch (error) {
    logger.error('Failed to get sync history', { error: error.message });
    return [];
  }
}

module.exports = {
  runFullParse,
  getLastSyncStatus,
  getSyncHistory,
  recordSyncStatus
};
