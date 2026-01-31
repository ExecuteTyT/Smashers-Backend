/**
 * Helper Utilities
 *
 * Common helper functions used throughout the application.
 */

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Format datetime for display
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted datetime string
 */
function formatDateTime(date) {
  const d = new Date(date);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Parse Russian date string to Date object
 * Handles formats like "29.01.2024 18:00"
 * @param {string} dateStr - Russian date string
 * @returns {Date|null} - Parsed Date or null if invalid
 */
function parseRussianDate(dateStr) {
  if (!dateStr) return null;

  // Try format: "DD.MM.YYYY HH:mm"
  const match = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/);
  if (match) {
    const [, day, month, year, hour, minute] = match;
    return new Date(year, month - 1, day, hour, minute);
  }

  // Try format: "DD.MM.YYYY"
  const dateOnly = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (dateOnly) {
    const [, day, month, year] = dateOnly;
    return new Date(year, month - 1, day);
  }

  // Fallback to native parsing
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Parse price from string (removes currency symbols, spaces)
 * @param {string} priceStr - Price string like "3 500 ₽"
 * @returns {number} - Price as integer
 */
function parsePrice(priceStr) {
  if (!priceStr) return 0;
  // Remove everything except digits
  const digits = priceStr.replace(/[^\d]/g, '');
  return parseInt(digits, 10) || 0;
}

/**
 * Parse integer from string with fallback
 * @param {string} str - String to parse
 * @param {number} fallback - Fallback value if parsing fails
 * @returns {number}
 */
function parseIntSafe(str, fallback = 0) {
  const parsed = parseInt(str, 10);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Extract ID from Django admin URL
 * @param {string} url - URL like "/admin/core/category/1/change/"
 * @returns {number|null} - Extracted ID or null
 */
function extractIdFromUrl(url) {
  if (!url) return null;
  const match = url.match(/\/(\d+)\/(change\/)?$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Parse boolean from Django admin icon
 * @param {string} imgSrc - Image src or alt text
 * @returns {boolean}
 */
function parseDjangoBoolean(imgSrc) {
  if (!imgSrc) return false;
  // Django uses "True" or "False" in alt text, or icon-yes/icon-no in src
  return imgSrc.includes('True') || imgSrc.includes('icon-yes') || imgSrc.includes('yes');
}

/**
 * Sanitize string (trim whitespace, normalize)
 * @param {string} str - String to sanitize
 * @returns {string}
 */
function sanitizeString(str) {
  if (!str) return '';
  return str.trim().replace(/\s+/g, ' ');
}

/**
 * Chunk array into smaller arrays
 * @param {Array} array - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array[]} - Array of chunks
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Deep compare two objects
 * @param {Object} obj1 - First object
 * @param {Object} obj2 - Second object
 * @returns {boolean} - Whether objects are equal
 */
function deepEqual(obj1, obj2) {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

/**
 * Get start and end of a day
 * @param {Date} date - The date
 * @returns {Object} - { start: Date, end: Date }
 */
function getDayBounds(date) {
  const d = new Date(date);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return { start, end };
}

/**
 * Validate phone number (Russian format)
 * @param {string} phone - Phone number
 * @returns {boolean}
 */
function isValidPhone(phone) {
  if (!phone) return false;
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  // Russian phone numbers have 10-11 digits
  return digits.length >= 10 && digits.length <= 11;
}

/**
 * Normalize phone number to standard format
 * @param {string} phone - Phone number
 * @returns {string} - Normalized phone like "+7 (999) 123-45-67"
 */
function normalizePhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');

  // Handle 10 or 11 digit Russian numbers
  let normalized = digits;
  if (digits.length === 10) {
    normalized = '7' + digits;
  } else if (digits.length === 11 && digits[0] === '8') {
    normalized = '7' + digits.slice(1);
  }

  if (normalized.length !== 11) return phone; // Return original if can't normalize

  return `+${normalized[0]} (${normalized.slice(1, 4)}) ${normalized.slice(4, 7)}-${normalized.slice(7, 9)}-${normalized.slice(9)}`;
}

/**
 * Format date for Django admin filter (DD.MM.YYYY)
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date string like "31.01.2026"
 */
function formatDateForDjango(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

module.exports = {
  formatDate,
  formatDateTime,
  parseRussianDate,
  parsePrice,
  parseIntSafe,
  extractIdFromUrl,
  parseDjangoBoolean,
  sanitizeString,
  chunkArray,
  deepEqual,
  getDayBounds,
  isValidPhone,
  normalizePhone,
  formatDateForDjango
};
