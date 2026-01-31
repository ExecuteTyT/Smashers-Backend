/**
 * Database Sync Service
 *
 * Saves parsed data from Django admin directly to PostgreSQL database.
 * This is used when parsing directly without Google Sheets.
 */

const logger = require('../config/logger');
const { prisma } = require('../config/database');

/**
 * Save categories to database
 * @param {Array} categories - Array of category objects from parser
 * @returns {Promise<Object>} - { added: number, updated: number, errors: number }
 */
async function saveCategories(categories) {
  logger.logSync('Saving categories to database');
  let added = 0;
  let updated = 0;
  let errors = 0;

  for (const category of categories) {
    try {
      const existing = await prisma.category.findUnique({
        where: { id: category.id }
      });

      if (existing) {
        await prisma.category.update({
          where: { id: category.id },
          data: {
            name: category.name,
            sortOrder: category.sortOrder,
            isVisible: category.isVisible,
            lastUpdated: category.lastUpdated
          }
        });
        updated++;
      } else {
        await prisma.category.create({
          data: {
            id: category.id,
            name: category.name,
            sortOrder: category.sortOrder,
            isVisible: category.isVisible,
            lastUpdated: category.lastUpdated
          }
        });
        added++;
      }
    } catch (error) {
      logger.error('Failed to save category', { category, error: error.message });
      errors++;
    }
  }

  logger.logSync(`Categories saved: ${added} added, ${updated} updated, ${errors} errors`);
  return { added, updated, errors };
}

/**
 * Save locations to database
 * @param {Array} locations - Array of location objects from parser
 * @returns {Promise<Object>} - { added: number, updated: number, errors: number }
 */
async function saveLocations(locations) {
  logger.logSync('Saving locations to database');
  let added = 0;
  let updated = 0;
  let errors = 0;

  for (const location of locations) {
    try {
      const existing = await prisma.location.findUnique({
        where: { id: location.id }
      });

      if (existing) {
        await prisma.location.update({
          where: { id: location.id },
          data: {
            name: location.name,
            showLocation: location.showLocation,
            showOnBookingScreen: location.showOnBookingScreen,
            description: location.description || null,
            sortOrder: location.sortOrder,
            lastUpdated: location.lastUpdated
          }
        });
        updated++;
      } else {
        await prisma.location.create({
          data: {
            id: location.id,
            name: location.name,
            showLocation: location.showLocation,
            showOnBookingScreen: location.showOnBookingScreen,
            description: location.description || null,
            sortOrder: location.sortOrder,
            lastUpdated: location.lastUpdated
          }
        });
        added++;
      }
    } catch (error) {
      logger.error('Failed to save location', { location, error: error.message });
      errors++;
    }
  }

  logger.logSync(`Locations saved: ${added} added, ${updated} updated, ${errors} errors`);
  return { added, updated, errors };
}

/**
 * Save memberships to database
 * @param {Array} memberships - Array of membership objects from parser
 * @returns {Promise<Object>} - { added: number, updated: number, errors: number }
 */
async function saveMemberships(memberships) {
  logger.logSync('Saving memberships to database');
  let added = 0;
  let updated = 0;
  let errors = 0;

  for (const membership of memberships) {
    try {
      const existing = await prisma.membership.findUnique({
        where: { id: membership.id }
      });

      if (existing) {
        await prisma.membership.update({
          where: { id: membership.id },
          data: {
            name: membership.name,
            type: membership.type,
            price: membership.price,
            sessionCount: membership.sessionCount,
            isVisible: membership.isVisible,
            lastUpdated: membership.lastUpdated
          }
        });
        updated++;
      } else {
        await prisma.membership.create({
          data: {
            id: membership.id,
            name: membership.name,
            type: membership.type,
            price: membership.price,
            sessionCount: membership.sessionCount,
            isVisible: membership.isVisible,
            lastUpdated: membership.lastUpdated
          }
        });
        added++;
      }
    } catch (error) {
      logger.error('Failed to save membership', { membership, error: error.message });
      errors++;
    }
  }

  logger.logSync(`Memberships saved: ${added} added, ${updated} updated, ${errors} errors`);
  return { added, updated, errors };
}

/**
 * Save sessions to database
 * @param {Array} sessions - Array of session objects from parser
 * @param {boolean} clearOldSessions - If true, delete sessions older than current week (for Friday updates)
 * @returns {Promise<Object>} - { added: number, updated: number, deleted: number, errors: number }
 */
async function saveSessions(sessions, clearOldSessions = false) {
  logger.logSync('Saving sessions to database');
  let added = 0;
  let updated = 0;
  let deleted = 0;
  let errors = 0;

  // If it's Friday update, delete old sessions (older than current week)
  if (clearOldSessions) {
    try {
      const now = new Date();
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() - now.getDay() + 1); // Monday of current week
      currentWeekStart.setHours(0, 0, 0, 0);

      const deletedSessions = await prisma.session.deleteMany({
        where: {
          datetime: {
            lt: currentWeekStart
          }
        }
      });
      deleted = deletedSessions.count;
      logger.logSync(`Deleted ${deleted} old sessions (before ${currentWeekStart.toISOString()})`);
    } catch (error) {
      logger.error('Failed to delete old sessions', { error: error.message });
    }
  }

  for (const session of sessions) {
    try {
      // Validate required fields
      if (!session.locationId || !session.categoryId) {
        logger.warn('Skipping session with missing locationId or categoryId', { session });
        errors++;
        continue;
      }

      const existing = await prisma.session.findUnique({
        where: { id: session.id }
      });

      if (existing) {
        await prisma.session.update({
          where: { id: session.id },
          data: {
            datetime: session.datetime,
            locationId: session.locationId,
            trainers: session.trainers,
            name: session.name,
            categoryId: session.categoryId,
            maxSpots: session.maxSpots,
            availableSpots: session.availableSpots,
            price: session.price !== undefined ? session.price : null,
            status: session.status,
            lastUpdated: session.lastUpdated
          }
        });
        updated++;
      } else {
        await prisma.session.create({
          data: {
            id: session.id,
            datetime: session.datetime,
            locationId: session.locationId,
            trainers: session.trainers,
            name: session.name,
            categoryId: session.categoryId,
            maxSpots: session.maxSpots,
            availableSpots: session.availableSpots,
            price: session.price !== undefined ? session.price : null,
            status: session.status,
            lastUpdated: session.lastUpdated
          }
        });
        added++;
      }
    } catch (error) {
      logger.error('Failed to save session', { session, error: error.message });
      errors++;
    }
  }

  logger.logSync(`Sessions saved: ${added} added, ${updated} updated, ${deleted} deleted, ${errors} errors`);
  return { added, updated, deleted, errors };
}

/**
 * Save all parsed data to database
 * @param {Object} parsed - Parsed data from parser
 * @param {boolean} isFridayUpdate - If true, clear old sessions (for weekly Friday updates)
 * @returns {Promise<Object>} - Save statistics
 */
async function saveAllToDatabase(parsed, isFridayUpdate = false) {
  const startTime = Date.now();
  logger.logSync('Starting database sync');

  const result = {
    categories: { added: 0, updated: 0, errors: 0 },
    locations: { added: 0, updated: 0, errors: 0 },
    memberships: { added: 0, updated: 0, errors: 0 },
    sessions: { added: 0, updated: 0, deleted: 0, errors: 0 },
    duration: 0
  };

  try {
    // Save in dependency order
    if (parsed.categories && parsed.categories.length > 0) {
      result.categories = await saveCategories(parsed.categories);
    }

    if (parsed.locations && parsed.locations.length > 0) {
      result.locations = await saveLocations(parsed.locations);
    }

    if (parsed.memberships && parsed.memberships.length > 0) {
      result.memberships = await saveMemberships(parsed.memberships);
    }

    if (parsed.sessions && parsed.sessions.length > 0) {
      result.sessions = await saveSessions(parsed.sessions, isFridayUpdate);
    }

    result.duration = Date.now() - startTime;
    logger.logSync('Database sync completed', {
      duration: `${result.duration}ms`,
      categories: result.categories,
      locations: result.locations,
      memberships: result.memberships,
      sessions: result.sessions
    });

    return result;
  } catch (error) {
    logger.error('Database sync failed', { error: error.message });
    throw error;
  }
}

module.exports = {
  saveCategories,
  saveLocations,
  saveMemberships,
  saveSessions,
  saveAllToDatabase
};
