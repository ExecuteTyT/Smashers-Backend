/**
 * Rate Limiter Middleware
 *
 * Limits the number of requests per IP address.
 */

const rateLimit = require('express-rate-limit');
const { ApiError, ErrorCodes } = require('./errorHandler');
const logger = require('../config/logger');

/**
 * Create rate limiter middleware
 * @param {Object} options - Rate limit options
 * @returns {Function} - Express middleware
 */
function createRateLimiter(options = {}) {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000; // 1 minute
  const max = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 60;

  return rateLimit({
    windowMs: options.windowMs || windowMs,
    max: options.max || max,
    standardHeaders: true,
    legacyHeaders: false,

    // Custom key generator (use IP address)
    keyGenerator: (req) => {
      return req.ip || req.connection.remoteAddress || 'unknown';
    },

    // Skip rate limiting for certain requests
    skip: (req) => {
      // Skip health checks
      if (req.path === '/api/health' || req.path === '/health') {
        return true;
      }
      return false;
    },

    // Custom handler when rate limit is exceeded
    handler: (req, res, next, options) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path
      });

      const error = new ApiError(
        429,
        ErrorCodes.RATE_LIMITED,
        `Too many requests. Please try again in ${Math.ceil(options.windowMs / 1000)} seconds.`
      );
      next(error);
    },

    // Message for rate limit hit (used if handler is not provided)
    message: {
      success: false,
      error: {
        code: ErrorCodes.RATE_LIMITED,
        message: 'Too many requests, please try again later.'
      }
    }
  });
}

/**
 * Strict rate limiter for sensitive endpoints
 */
function createStrictRateLimiter() {
  return createRateLimiter({
    windowMs: 60000, // 1 minute
    max: 10 // 10 requests per minute
  });
}

module.exports = {
  createRateLimiter,
  createStrictRateLimiter
};
