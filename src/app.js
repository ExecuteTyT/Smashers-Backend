/**
 * Smashers Backend - Main Application
 *
 * Express server with API routes, middleware, and scheduled jobs.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const logger = require('./config/logger');
const { testConnection, disconnectPrisma } = require('./config/database');
const { initTelegramBot } = require('./config/telegram');
const { initGoogleSheets } = require('./config/googleSheets');
const { initializeAllSheets } = require('./services/googleSheets.service');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { createRateLimiter } = require('./middleware/rateLimiter');

// Import jobs (don't start them yet)
const { startParserJob, stopParserJob } = require('./jobs/parser.job');
const { startSyncJob, stopSyncJob } = require('./jobs/sync.job');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Swagger Configuration
// ============================================

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smashers Backend API',
      version: '1.0.0',
      description: 'Backend API for Smashers Badminton Club',
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// ============================================
// Middleware
// ============================================

// Security headers
app.use(helmet());

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim());

logger.info(`CORS: Allowed origins: ${allowedOrigins.join(', ')}`);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) {
        logger.debug('CORS: Request with no origin, allowing');
        return callback(null, true);
      }

      // Log all CORS requests for debugging
      logger.debug(`CORS: Request from origin: ${origin}`);

      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        logger.debug(`CORS: Origin ${origin} allowed`);
        callback(null, true);
      } else {
        logger.warn(`CORS: Origin ${origin} not allowed. Allowed origins: ${allowedOrigins.join(', ')}`);
        callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Rate limiting (global)
app.use(createRateLimiter());

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// ============================================
// Routes
// ============================================

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use(routes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// ============================================
// Server Startup
// ============================================

async function startServer() {
  try {
    logger.info('Starting Smashers Backend...');

    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.error('Database connection failed. Exiting...');
      process.exit(1);
    }

    // Initialize Telegram bot (optional)
    initTelegramBot();

    // Initialize Google Sheets (optional)
    await initGoogleSheets();
    await initializeAllSheets().catch((err) => {
      logger.warn('Failed to initialize Google Sheets headers', { error: err.message });
    });

    // Start scheduled jobs (only in production or if explicitly enabled)
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_JOBS === 'true') {
      startParserJob();
      startSyncJob();
    } else {
      logger.info('Scheduled jobs disabled in development. Set ENABLE_JOBS=true to enable.');
    }

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`API docs available at http://localhost:${PORT}/api-docs`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);

      // Stop accepting new requests
      server.close(async () => {
        logger.info('HTTP server closed');

        // Stop scheduled jobs
        stopParserJob();
        stopSyncJob();

        // Disconnect from database
        await disconnectPrisma();

        logger.info('Graceful shutdown completed');
        process.exit(0);
      });

      // Force exit if graceful shutdown takes too long
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;
