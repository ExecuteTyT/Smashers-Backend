/**
 * Unit Tests for Helper Functions
 */

const {
  formatDate,
  formatDateTime,
  parseRussianDate,
  parsePrice,
  parseIntSafe,
  extractIdFromUrl,
  parseDjangoBoolean,
  sanitizeString,
  chunkArray,
  isValidPhone,
  normalizePhone
} = require('../../src/utils/helpers');

describe('Helper Functions', () => {
  describe('parseRussianDate', () => {
    it('should parse DD.MM.YYYY HH:mm format', () => {
      const result = parseRussianDate('29.01.2024 18:00');
      expect(result).toBeInstanceOf(Date);
      expect(result.getDate()).toBe(29);
      expect(result.getMonth()).toBe(0); // January is 0
      expect(result.getFullYear()).toBe(2024);
      expect(result.getHours()).toBe(18);
      expect(result.getMinutes()).toBe(0);
    });

    it('should parse DD.MM.YYYY format', () => {
      const result = parseRussianDate('15.06.2024');
      expect(result).toBeInstanceOf(Date);
      expect(result.getDate()).toBe(15);
      expect(result.getMonth()).toBe(5); // June is 5
      expect(result.getFullYear()).toBe(2024);
    });

    it('should return null for invalid date', () => {
      expect(parseRussianDate('')).toBeNull();
      expect(parseRussianDate(null)).toBeNull();
      expect(parseRussianDate('invalid')).toBeNull();
    });
  });

  describe('parsePrice', () => {
    it('should parse price with currency symbol', () => {
      expect(parsePrice('3 500 ₽')).toBe(3500);
      expect(parsePrice('1,000₽')).toBe(1000);
      expect(parsePrice('500 руб.')).toBe(500);
    });

    it('should parse plain numbers', () => {
      expect(parsePrice('1000')).toBe(1000);
      expect(parsePrice('0')).toBe(0);
    });

    it('should return 0 for invalid input', () => {
      expect(parsePrice('')).toBe(0);
      expect(parsePrice(null)).toBe(0);
      expect(parsePrice('бесплатно')).toBe(0);
    });
  });

  describe('parseIntSafe', () => {
    it('should parse valid integers', () => {
      expect(parseIntSafe('42')).toBe(42);
      expect(parseIntSafe('0')).toBe(0);
      expect(parseIntSafe('-5')).toBe(-5);
    });

    it('should return fallback for invalid input', () => {
      expect(parseIntSafe('', 10)).toBe(10);
      expect(parseIntSafe('abc', 5)).toBe(5);
      expect(parseIntSafe(null, 0)).toBe(0);
    });
  });

  describe('extractIdFromUrl', () => {
    it('should extract ID from Django admin URL', () => {
      expect(extractIdFromUrl('/admin/core/category/1/change/')).toBe(1);
      expect(extractIdFromUrl('/admin/core/session/123/change/')).toBe(123);
      expect(extractIdFromUrl('/admin/core/location/42/')).toBe(42);
    });

    it('should return null for invalid URL', () => {
      expect(extractIdFromUrl('')).toBeNull();
      expect(extractIdFromUrl(null)).toBeNull();
      expect(extractIdFromUrl('/admin/')).toBeNull();
    });
  });

  describe('parseDjangoBoolean', () => {
    it('should return true for positive indicators', () => {
      expect(parseDjangoBoolean('True')).toBe(true);
      expect(parseDjangoBoolean('/static/admin/img/icon-yes.svg')).toBe(true);
      expect(parseDjangoBoolean('yes')).toBe(true);
    });

    it('should return false for negative indicators', () => {
      expect(parseDjangoBoolean('False')).toBe(false);
      expect(parseDjangoBoolean('/static/admin/img/icon-no.svg')).toBe(false);
      expect(parseDjangoBoolean('')).toBe(false);
      expect(parseDjangoBoolean(null)).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should normalize multiple spaces', () => {
      expect(sanitizeString('hello    world')).toBe('hello world');
    });

    it('should handle empty input', () => {
      expect(sanitizeString('')).toBe('');
      expect(sanitizeString(null)).toBe('');
    });
  });

  describe('chunkArray', () => {
    it('should split array into chunks', () => {
      const result = chunkArray([1, 2, 3, 4, 5], 2);
      expect(result).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should handle empty array', () => {
      expect(chunkArray([], 2)).toEqual([]);
    });

    it('should handle chunk size larger than array', () => {
      expect(chunkArray([1, 2], 5)).toEqual([[1, 2]]);
    });
  });

  describe('isValidPhone', () => {
    it('should validate Russian phone numbers', () => {
      expect(isValidPhone('+7 999 123 45 67')).toBe(true);
      expect(isValidPhone('89991234567')).toBe(true);
      expect(isValidPhone('9991234567')).toBe(true);
    });

    it('should reject invalid phones', () => {
      expect(isValidPhone('')).toBe(false);
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone(null)).toBe(false);
    });
  });

  describe('normalizePhone', () => {
    it('should normalize 10-digit numbers', () => {
      expect(normalizePhone('9991234567')).toBe('+7 (999) 123-45-67');
    });

    it('should normalize 11-digit numbers starting with 8', () => {
      expect(normalizePhone('89991234567')).toBe('+7 (999) 123-45-67');
    });

    it('should normalize numbers with +7', () => {
      expect(normalizePhone('+79991234567')).toBe('+7 (999) 123-45-67');
    });

    it('should return original for invalid format', () => {
      expect(normalizePhone('123')).toBe('123');
    });
  });
});
