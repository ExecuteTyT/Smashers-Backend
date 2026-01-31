/**
 * Authentication Middleware
 *
 * API key authentication for protected endpoints.
 */

const { ApiError, ErrorCodes } = require('./errorHandler');
const logger = require('../config/logger');

/**
 * Verify API key from request headers
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Next middleware
 */
function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  const expectedKey = process.env.API_KEY;

  if (!expectedKey) {
    logger.warn('API_KEY not configured, skipping authentication');
    return next();
  }

  if (!apiKey) {
    logger.warn('Missing API key', { path: req.path, ip: req.ip });
    throw new ApiError(401, ErrorCodes.UNAUTHORIZED, 'API key required');
  }

  if (apiKey !== expectedKey) {
    logger.warn('Invalid API key', { path: req.path, ip: req.ip });
    throw new ApiError(403, ErrorCodes.FORBIDDEN, 'Invalid API key');
  }

  next();
}

/**
 * Optional API key - allows unauthenticated access but sets req.authenticated
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Next middleware
 */
function optionalApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  const expectedKey = process.env.API_KEY;

  req.authenticated = false;

  if (expectedKey && apiKey && apiKey === expectedKey) {
    req.authenticated = true;
  }

  next();
}

module.exports = {
  requireApiKey,
  optionalApiKey
};
