/**
 * Retry Utility
 *
 * Provides retry logic with exponential backoff for unreliable operations
 * like network requests, parsing, etc.
 */

const logger = require('../config/logger');

/**
 * Execute an async function with retry logic
 *
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Configuration options
 * @param {number} options.maxAttempts - Maximum number of attempts (default: 5)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 30000)
 * @param {number} options.factor - Exponential factor (default: 2)
 * @param {Function} options.shouldRetry - Function to determine if should retry on error
 * @param {string} options.operationName - Name for logging purposes
 * @returns {Promise<any>} - Result of the function
 */
async function retryOperation(fn, options = {}) {
  const {
    maxAttempts = 5,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    shouldRetry = () => true,
    operationName = 'operation'
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      if (attempt > 1) {
        logger.info(`${operationName} succeeded on attempt ${attempt}`);
      }
      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!shouldRetry(error)) {
        logger.error(`${operationName} failed with non-retryable error`, {
          error: error.message,
          attempt
        });
        throw error;
      }

      // Check if we've exhausted all attempts
      if (attempt === maxAttempts) {
        logger.error(`${operationName} failed after ${maxAttempts} attempts`, {
          error: error.message
        });
        throw error;
      }

      // Log the retry
      logger.warn(`${operationName} failed, retrying in ${delay}ms`, {
        attempt,
        maxAttempts,
        error: error.message
      });

      // Wait before retry
      await sleep(delay);

      // Calculate next delay with exponential backoff (with jitter)
      delay = Math.min(delay * factor + Math.random() * 100, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Default retry checker - retry on network and timeout errors
 * @param {Error} error - The error to check
 * @returns {boolean} - Whether to retry
 */
function isRetryableError(error) {
  const retryableCodes = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'EPIPE',
    'ENOTFOUND',
    'ENETUNREACH',
    'EAI_AGAIN'
  ];

  // Check error code
  if (error.code && retryableCodes.includes(error.code)) {
    return true;
  }

  // Check HTTP status codes (5xx errors are retryable)
  if (error.response && error.response.status >= 500) {
    return true;
  }

  // Check for rate limiting (429)
  if (error.response && error.response.status === 429) {
    return true;
  }

  // Check error message for timeout
  if (error.message && error.message.toLowerCase().includes('timeout')) {
    return true;
  }

  return false;
}

/**
 * Execute with timeout
 * @param {Function} fn - Async function to execute
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} operationName - Name for error message
 * @returns {Promise<any>}
 */
async function withTimeout(fn, timeoutMs, operationName = 'Operation') {
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    )
  ]);
}

module.exports = {
  retryOperation,
  sleep,
  isRetryableError,
  withTimeout
};
