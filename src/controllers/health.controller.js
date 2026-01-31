/**
 * Health Controller
 *
 * Health checks and status endpoints.
 */

const { prisma, testConnection } = require('../config/database');
const { testSheetsConnection } = require('../config/googleSheets');
const { testBotConnection } = require('../config/telegram');
const { testDjangoConnection } = require('../parsers/django/auth');
const { getLastSyncStatus, getSyncHistory } = require('../services/parser.service');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * GET /api/health
 * Basic health check
 */
const healthCheck = asyncHandler(async (req, res) => {
  const dbConnected = await testConnection();

  res.json({
    success: true,
    status: dbConnected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: dbConnected ? 'connected' : 'disconnected'
    }
  });
});

/**
 * GET /api/health/detailed
 * Detailed health check with all services (may be slow)
 */
const detailedHealthCheck = asyncHandler(async (req, res) => {
  logger.info('Running detailed health check');

  const results = {
    database: { status: 'unknown' },
    googleSheets: { status: 'unknown' },
    telegram: { status: 'unknown' },
    djangoAdmin: { status: 'unknown' }
  };

  // Check database
  try {
    const dbConnected = await testConnection();
    results.database = {
      status: dbConnected ? 'connected' : 'disconnected'
    };
  } catch (error) {
    results.database = { status: 'error', reason: error.message };
  }

  // Check Google Sheets
  try {
    const sheetsResult = await testSheetsConnection();
    results.googleSheets = {
      status: sheetsResult.connected ? 'accessible' : 'not_configured',
      ...sheetsResult
    };
  } catch (error) {
    results.googleSheets = { status: 'error', reason: error.message };
  }

  // Check Telegram
  try {
    const telegramResult = await testBotConnection();
    results.telegram = {
      status: telegramResult.connected ? 'accessible' : 'not_configured',
      ...telegramResult
    };
  } catch (error) {
    results.telegram = { status: 'error', reason: error.message };
  }

  // Check Django Admin
  try {
    const djangoResult = await testDjangoConnection();
    results.djangoAdmin = {
      status: djangoResult.accessible ? 'accessible' : 'not_accessible',
      ...djangoResult
    };
  } catch (error) {
    results.djangoAdmin = { status: 'error', reason: error.message };
  }

  // Get last sync status
  const lastSync = await getLastSyncStatus();

  // Determine overall status
  const allConnected = Object.values(results).every(
    (s) => s.status === 'connected' || s.status === 'accessible' || s.status === 'not_configured'
  );

  res.json({
    success: true,
    status: allConnected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: results,
    lastSync: lastSync
      ? {
          time: lastSync.lastSync,
          type: lastSync.syncType,
          status: lastSync.status,
          duration: lastSync.duration
        }
      : null
  });
});

/**
 * GET /api/sync-status
 * Get sync status and history
 */
const getSyncStatus = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const history = await getSyncHistory(parseInt(limit, 10));
  const lastParser = await getLastSyncStatus('parser');
  const lastSync = await getLastSyncStatus('sheets_to_db');

  res.json({
    success: true,
    data: {
      lastParser,
      lastSync,
      history
    }
  });
});

/**
 * GET /api/stats
 * Get database statistics
 */
const getStats = asyncHandler(async (req, res) => {
  const [categories, locations, memberships, sessions, bookings] = await Promise.all([
    prisma.category.count(),
    prisma.location.count(),
    prisma.membership.count(),
    prisma.session.count(),
    prisma.bookingRequest.count()
  ]);

  const activeSessions = await prisma.session.count({
    where: {
      status: 'Активно',
      datetime: { gte: new Date() }
    }
  });

  const todayBookings = await prisma.bookingRequest.count({
    where: {
      createdAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    }
  });

  // Get status distribution for sessions
  const statusCounts = await prisma.session.groupBy({
    by: ['status'],
    _count: {
      status: true
    }
  });

  // Get date range of sessions
  const dateRange = await prisma.session.aggregate({
    _min: {
      datetime: true
    },
    _max: {
      datetime: true
    }
  });

  res.json({
    success: true,
    data: {
      totals: {
        categories,
        locations,
        memberships,
        sessions,
        bookings
      },
      active: {
        upcomingSessions: activeSessions,
        todayBookings
      },
      sessionsStatus: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}),
      sessionsDateRange: {
        earliest: dateRange._min.datetime,
        latest: dateRange._max.datetime
      }
    }
  });
});

module.exports = {
  healthCheck,
  detailedHealthCheck,
  getSyncStatus,
  getStats
};
