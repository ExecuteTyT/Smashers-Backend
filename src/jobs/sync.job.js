/**
 * Sync Cron Job
 *
 * Syncs data from Google Sheets to PostgreSQL on schedule.
 * Default: every 5 minutes
 */

const cron = require('node-cron');
const logger = require('../config/logger');
const { syncAll } = require('../services/sync.service');
const { isSheetsEnabled } = require('../config/googleSheets');

let syncTask = null;

/**
 * Get cron schedule from environment or use default
 * @returns {string} - Cron expression
 */
function getSyncSchedule() {
  const minutes = parseInt(process.env.SYNC_INTERVAL_MINUTES, 10) || 5;

  if (minutes === 1) {
    return '* * * * *'; // Every minute
  } else if (minutes < 60) {
    return `*/${minutes} * * * *`; // Every N minutes
  } else {
    return '0 * * * *'; // Every hour
  }
}

/**
 * Run sync job
 */
async function runSync() {
  // Skip if Google Sheets is not configured
  if (!isSheetsEnabled()) {
    logger.debug('Sync job skipped - Google Sheets not configured');
    return;
  }

  logger.logSync('Scheduled sync job starting');

  try {
    const result = await syncAll();

    if (result.success) {
      logger.logSync('Scheduled sync job completed successfully', {
        synced: result.synced,
        duration: result.duration
      });
    } else {
      logger.warn('Scheduled sync job completed with errors', {
        errors: result.errors
      });
    }
  } catch (error) {
    logger.error('Scheduled sync job failed', { error: error.message });
  }
}

/**
 * Start the sync cron job
 */
function startSyncJob() {
  const schedule = getSyncSchedule();

  // Validate cron expression
  if (!cron.validate(schedule)) {
    logger.error('Invalid sync cron schedule', { schedule });
    return;
  }

  syncTask = cron.schedule(
    schedule,
    async () => {
      await runSync();
    },
    {
      scheduled: true,
      timezone: 'Europe/Moscow' // Moscow timezone
    }
  );

  logger.info('Sync cron job started', { schedule });
}

/**
 * Stop the sync cron job
 */
function stopSyncJob() {
  if (syncTask) {
    syncTask.stop();
    syncTask = null;
    logger.info('Sync cron job stopped');
  }
}

/**
 * Check if sync job is running
 * @returns {boolean}
 */
function isSyncJobRunning() {
  return syncTask !== null;
}

// Handle command line execution
if (require.main === module) {
  // Load environment variables
  require('dotenv').config();

  const args = process.argv.slice(2);

  if (args.includes('--once')) {
    // Run once and exit
    logger.info('Running sync once...');
    runSync()
      .then(() => {
        logger.info('Sync completed');
        process.exit(0);
      })
      .catch((error) => {
        logger.error('Sync failed', { error: error.message });
        process.exit(1);
      });
  } else {
    // Start as scheduled job
    startSyncJob();
    logger.info('Sync job running. Press Ctrl+C to stop.');
  }
}

module.exports = {
  startSyncJob,
  stopSyncJob,
  isSyncJobRunning,
  runSync
};
