/**
 * Global Error Handler Middleware
 *
 * Catches all errors and returns consistent JSON responses.
 */

const logger = require('../config/logger');

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

/**
 * Error codes for common errors
 */
const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR'
};

/**
 * Not Found (404) handler
 */
function notFoundHandler(req, res, next) {
  const error = new ApiError(404, ErrorCodes.NOT_FOUND, `Route ${req.method} ${req.path} not found`);
  next(error);
}

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  // Log the error
  const logData = {
    method: req.method,
    path: req.path,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  };

  if (err.statusCode >= 500 || !err.isOperational) {
    logger.error('Server error', logData);
  } else {
    logger.warn('Client error', logData);
  }

  // Determine status code
  const statusCode = err.statusCode || 500;
  const code = err.code || ErrorCodes.INTERNAL_ERROR;

  // Build error response
  const response = {
    success: false,
    error: {
      code,
      message: err.message || 'An unexpected error occurred'
    }
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.error.stack = err.stack;
  }

  // Include validation details if available
  if (err.details) {
    response.error.details = err.details;
  }

  res.status(statusCode).json(response);
}

/**
 * Async handler wrapper to catch async errors
 * @param {Function} fn - Async route handler
 * @returns {Function} - Wrapped handler
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  ApiError,
  ErrorCodes,
  notFoundHandler,
  errorHandler,
  asyncHandler
};
