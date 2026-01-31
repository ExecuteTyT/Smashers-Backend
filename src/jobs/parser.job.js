/**
 * Parser Cron Job
 *
 * Runs the Django admin parser on schedule.
 * Default: every hour at minute 0
 */

const cron = require('node-cron');
const logger = require('../config/logger');
const { runFullParse } = require('../services/parser.service');
const { sendSystemAlert } = require('../services/telegram.service');

let parserTask = null;

/**
 * Get cron schedule from environment or use default
 * @returns {string} - Cron expression
 */
function getParserSchedule() {
  // Check if custom schedule is provided
  if (process.env.PARSER_CRON_SCHEDULE) {
    return process.env.PARSER_CRON_SCHEDULE;
  }

  const hours = parseInt(process.env.PARSE_INTERVAL_HOURS, 10) || 1;

  if (hours === 1) {
    return '0 * * * *'; // Every hour at minute 0
  } else if (hours < 24) {
    return `0 */${hours} * * *`; // Every N hours
  } else {
    return '0 0 * * *'; // Once a day at midnight
  }
}

/**
 * Check if today is Friday
 * @returns {boolean}
 */
function isFriday() {
  const today = new Date();
  return today.getDay() === 5; // 5 = Friday
}

/**
 * Run parser job
 */
async function runParser() {
  const isFridayUpdate = isFriday();
  logger.logParser('Scheduled parser job starting', { isFridayUpdate });

  try {
    const result = await runFullParse(isFridayUpdate);

    if (result.success) {
      logger.logParser('Scheduled parser job completed successfully', {
        parsed: result.parsed,
        saved: result.saved,
        duration: result.duration,
        isFridayUpdate
      });
    } else {
      logger.warn('Scheduled parser job completed with errors', {
        errors: result.errors
      });
    }
  } catch (error) {
    logger.error('Scheduled parser job failed', { error: error.message });

    // Send alert
    await sendSystemAlert(`Scheduled parser job failed: ${error.message}`);
  }
}

/**
 * Start the parser cron job
 */
function startParserJob() {
  const schedule = getParserSchedule();

  // Validate cron expression
  if (!cron.validate(schedule)) {
    logger.error('Invalid parser cron schedule', { schedule });
    return;
  }

  parserTask = cron.schedule(
    schedule,
    async () => {
      await runParser();
    },
    {
      scheduled: true,
      timezone: 'Europe/Moscow' // Moscow timezone
    }
  );

  logger.info('Parser cron job started', { schedule });
}

/**
 * Stop the parser cron job
 */
function stopParserJob() {
  if (parserTask) {
    parserTask.stop();
    parserTask = null;
    logger.info('Parser cron job stopped');
  }
}

/**
 * Check if parser job is running
 * @returns {boolean}
 */
function isParserJobRunning() {
  return parserTask !== null;
}

// Handle command line execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--once')) {
    // Run once and exit
    logger.info('Running parser once...');
    runParser()
      .then(() => {
        logger.info('Parser completed');
        process.exit(0);
      })
      .catch((error) => {
        logger.error('Parser failed', { error: error.message });
        process.exit(1);
      });
  } else {
    // Start as scheduled job
    startParserJob();
    logger.info('Parser job running. Press Ctrl+C to stop.');
  }
}

module.exports = {
  startParserJob,
  stopParserJob,
  isParserJobRunning,
  runParser
};
