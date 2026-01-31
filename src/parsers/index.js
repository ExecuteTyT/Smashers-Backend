/**
 * Parser Orchestrator
 *
 * Coordinates parsing of all entities from Django admin.
 * Runs parsers in the correct order (dependencies first).
 */

const logger = require('../config/logger');
const { closeBrowser } = require('./django/auth');
const { parseCategories } = require('./django/categories');
const { parseLocations } = require('./django/locations');
const { parseMemberships } = require('./django/memberships');
const { parseSessions } = require('./django/sessions');
const { retryOperation } = require('../utils/retry');

/**
 * Parse all entities from Django admin
 * @returns {Promise<Object>} - Parsed data for all entities
 */
async function parseAll() {
  const startTime = Date.now();
  logger.logParser('Starting full parse');

  const result = {
    categories: [],
    locations: [],
    memberships: [],
    sessions: [],
    errors: [],
    duration: 0
  };

  try {
    // Parse categories first (sessions depend on them)
    try {
      result.categories = await retryOperation(() => parseCategories(), {
        maxAttempts: 3,
        operationName: 'parseCategories'
      });
    } catch (error) {
      logger.error('Categories parsing failed', { error: error.message });
      result.errors.push({ entity: 'categories', error: error.message });
    }

    // Parse locations (sessions depend on them)
    try {
      result.locations = await retryOperation(() => parseLocations(), {
        maxAttempts: 3,
        operationName: 'parseLocations'
      });
    } catch (error) {
      logger.error('Locations parsing failed', { error: error.message });
      result.errors.push({ entity: 'locations', error: error.message });
    }

    // Parse memberships (independent)
    try {
      result.memberships = await retryOperation(() => parseMemberships(), {
        maxAttempts: 3,
        operationName: 'parseMemberships'
      });
    } catch (error) {
      logger.error('Memberships parsing failed', { error: error.message });
      result.errors.push({ entity: 'memberships', error: error.message });
    }

    // Parse sessions (depends on categories and locations)
    try {
      result.sessions = await retryOperation(() => parseSessions(), {
        maxAttempts: 3,
        operationName: 'parseSessions'
      });
    } catch (error) {
      logger.error('Sessions parsing failed', { error: error.message });
      result.errors.push({ entity: 'sessions', error: error.message });
    }
  } finally {
    // Always close browser
    await closeBrowser();
  }

  result.duration = Date.now() - startTime;

  logger.logParser('Parse completed', {
    categories: result.categories.length,
    locations: result.locations.length,
    memberships: result.memberships.length,
    sessions: result.sessions.length,
    errors: result.errors.length,
    duration: `${result.duration}ms`
  });

  return result;
}

/**
 * Parse only specific entities
 * @param {string[]} entities - Array of entity names to parse
 * @returns {Promise<Object>} - Parsed data
 */
async function parseEntities(entities) {
  const startTime = Date.now();
  logger.logParser('Starting selective parse', { entities });

  const result = {
    errors: [],
    duration: 0
  };

  const parsers = {
    categories: parseCategories,
    locations: parseLocations,
    memberships: parseMemberships,
    sessions: parseSessions
  };

  try {
    for (const entity of entities) {
      if (parsers[entity]) {
        try {
          result[entity] = await retryOperation(() => parsers[entity](), {
            maxAttempts: 3,
            operationName: `parse${entity.charAt(0).toUpperCase() + entity.slice(1)}`
          });
        } catch (error) {
          logger.error(`${entity} parsing failed`, { error: error.message });
          result.errors.push({ entity, error: error.message });
          result[entity] = [];
        }
      }
    }
  } finally {
    await closeBrowser();
  }

  result.duration = Date.now() - startTime;

  logger.logParser('Selective parse completed', {
    entities,
    duration: `${result.duration}ms`
  });

  return result;
}

module.exports = {
  parseAll,
  parseEntities,
  parseCategories,
  parseLocations,
  parseMemberships,
  parseSessions
};
