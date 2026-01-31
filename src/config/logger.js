/**
 * Winston Logger Configuration
 *
 * Provides structured logging with:
 * - Console output (with colors in development)
 * - Daily rotating file logs
 * - Separate error log file
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const logsDir = path.join(__dirname, '../../logs');

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  })
);

// Custom format for file output (JSON for parsing)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports based on environment
const transports = [
  // Console transport - always enabled
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
  })
];

// File transports - only in non-test environment
if (process.env.NODE_ENV !== 'test') {
  // Daily rotating file for all logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d',
      format: fileFormat,
      level: 'debug'
    })
  );

  // Separate file for errors only (keep longer)
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: fileFormat,
      level: 'error'
    })
  );
}

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'smashers-backend' },
  transports,
  // Don't exit on handled exceptions
  exitOnError: false
});

// Stream for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// Helper methods for structured logging
logger.logParser = (action, data = {}) => {
  logger.info(`[Parser] ${action}`, { component: 'parser', ...data });
};

logger.logSync = (action, data = {}) => {
  logger.info(`[Sync] ${action}`, { component: 'sync', ...data });
};

logger.logApi = (action, data = {}) => {
  logger.info(`[API] ${action}`, { component: 'api', ...data });
};

logger.logTelegram = (action, data = {}) => {
  logger.info(`[Telegram] ${action}`, { component: 'telegram', ...data });
};

module.exports = logger;
