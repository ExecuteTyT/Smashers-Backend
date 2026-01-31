/**
 * Prisma Database Client Configuration
 *
 * Singleton pattern to reuse the same Prisma client instance
 * across the application.
 */

const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

let prisma;

// Create a singleton Prisma client
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error', 'warn']
  });
} else {
  // In development, prevent multiple instances due to hot reloading
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['query', 'error', 'warn']
    });
  }
  prisma = global.__prisma;
}

// Handle connection events
prisma.$on('error', (e) => {
  logger.error('Prisma error', { error: e.message });
});

// Graceful shutdown
const disconnectPrisma = async () => {
  try {
    await prisma.$disconnect();
    logger.info('Prisma disconnected');
  } catch (error) {
    logger.error('Error disconnecting Prisma', { error: error.message });
  }
};

// Test database connection
const testConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection failed', { error: error.message });
    return false;
  }
};

module.exports = {
  prisma,
  disconnectPrisma,
  testConnection
};
