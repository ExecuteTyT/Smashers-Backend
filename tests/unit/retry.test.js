/**
 * Unit Tests for Retry Utility
 */

const { retryOperation, sleep, isRetryableError, withTimeout } = require('../../src/utils/retry');

describe('Retry Utility', () => {
  describe('retryOperation', () => {
    it('should return result on first successful attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await retryOperation(fn, { maxAttempts: 3, operationName: 'test' });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const result = await retryOperation(fn, {
        maxAttempts: 5,
        initialDelay: 10,
        operationName: 'test'
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max attempts', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('always fails'));

      await expect(
        retryOperation(fn, { maxAttempts: 3, initialDelay: 10, operationName: 'test' })
      ).rejects.toThrow('always fails');

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should not retry if shouldRetry returns false', async () => {
      const error = new Error('non-retryable');
      const fn = jest.fn().mockRejectedValue(error);

      await expect(
        retryOperation(fn, {
          maxAttempts: 5,
          shouldRetry: () => false,
          operationName: 'test'
        })
      ).rejects.toThrow('non-retryable');

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('sleep', () => {
    it('should wait for specified time', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow some tolerance
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('isRetryableError', () => {
    it('should return true for network errors', () => {
      const error = new Error('Connection failed');
      error.code = 'ECONNRESET';
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for timeout errors', () => {
      const error = new Error('Request timeout');
      error.code = 'ETIMEDOUT';
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 5xx HTTP errors', () => {
      const error = new Error('Server error');
      error.response = { status: 503 };
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for rate limiting (429)', () => {
      const error = new Error('Rate limited');
      error.response = { status: 429 };
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for 4xx errors', () => {
      const error = new Error('Not found');
      error.response = { status: 404 };
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for generic errors', () => {
      const error = new Error('Some error');
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('withTimeout', () => {
    it('should return result if completes in time', async () => {
      const fn = async () => {
        await sleep(10);
        return 'done';
      };

      const result = await withTimeout(fn, 100, 'test');
      expect(result).toBe('done');
    });

    it('should throw if times out', async () => {
      const fn = async () => {
        await sleep(200);
        return 'done';
      };

      await expect(withTimeout(fn, 50, 'test')).rejects.toThrow('test timed out after 50ms');
    });
  });
});
