/**
 * Telegram Service
 *
 * Handles sending notifications to Telegram:
 * - Booking notifications to manager
 * - System alerts to admin
 */

const logger = require('../config/logger');
const {
  getBot,
  isTelegramEnabled,
  getManagerChatId,
  getAdminChatId
} = require('../config/telegram');
const { formatDateTime, normalizePhone } = require('../utils/helpers');

/**
 * Send a message to a Telegram chat
 * @param {string} chatId - Telegram chat ID
 * @param {string} text - Message text (supports Markdown)
 * @param {Object} options - Additional options
 * @returns {Promise<boolean>} - Success status
 */
async function sendMessage(chatId, text, options = {}) {
  if (!isTelegramEnabled()) {
    logger.logTelegram('Telegram not configured, message logged only', { chatId, text });
    return false;
  }

  if (!chatId) {
    logger.warn('No chat ID provided for Telegram message');
    return false;
  }

  const bot = getBot();
  if (!bot) {
    logger.warn('Telegram bot not available');
    return false;
  }

  try {
    await bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      ...options
    });

    logger.logTelegram('Message sent', { chatId });
    return true;
  } catch (error) {
    logger.error('Failed to send Telegram message', {
      chatId,
      error: error.message
    });
    return false;
  }
}

/**
 * Format booking notification for session
 * @param {Object} booking - Booking request data
 * @param {Object} session - Session data (optional)
 * @param {Object} location - Location data (optional)
 * @returns {string} - Formatted message
 */
function formatSessionBooking(booking, session = null, location = null) {
  let message = `🏸 *НОВАЯ ЗАПИСЬ НА ТРЕНИРОВКУ*\n\n`;
  message += `👤 *Имя:* ${booking.name}\n`;
  message += `📞 *Телефон:* ${normalizePhone(booking.phone)}\n`;

  if (session) {
    message += `\n📅 *Тренировка:*\n`;
    message += `• Дата: ${formatDateTime(session.datetime)}\n`;
    message += `• Название: ${session.name}\n`;
    if (location) {
      message += `• Локация: ${location.name}\n`;
    }
    message += `• Свободно мест: ${session.availableSpots} из ${session.maxSpots}\n`;
  }

  if (booking.message) {
    message += `\n💬 *Сообщение:* ${booking.message}\n`;
  }

  message += `\n⏰ *Время заявки:* ${formatDateTime(booking.createdAt || new Date())}`;

  return message;
}

/**
 * Format booking notification for membership purchase
 * @param {Object} booking - Booking request data
 * @param {Object} membership - Membership data (optional)
 * @returns {string} - Formatted message
 */
function formatMembershipPurchase(booking, membership = null) {
  let message = `💳 *ЗАПРОС НА ПОКУПКУ АБОНЕМЕНТА*\n\n`;
  message += `👤 *Имя:* ${booking.name}\n`;
  message += `📞 *Телефон:* ${normalizePhone(booking.phone)}\n`;

  if (membership) {
    message += `\n🎫 *Абонемент:*\n`;
    message += `• Название: ${membership.name}\n`;
    message += `• Тип: ${membership.type}\n`;
    message += `• Цена: ${membership.price} ₽\n`;
    message += `• Тренировок: ${membership.sessionCount}\n`;
  }

  if (booking.message) {
    message += `\n💬 *Сообщение:* ${booking.message}\n`;
  }

  message += `\n⏰ *Время заявки:* ${formatDateTime(booking.createdAt || new Date())}`;

  return message;
}

/**
 * Format contact form submission
 * @param {Object} booking - Contact form data
 * @returns {string} - Formatted message
 */
function formatContactForm(booking) {
  let message = `📩 *НОВОЕ СООБЩЕНИЕ С САЙТА*\n\n`;
  message += `👤 *Имя:* ${booking.name}\n`;
  message += `📞 *Телефон:* ${normalizePhone(booking.phone)}\n`;

  if (booking.message) {
    message += `\n💬 *Сообщение:*\n${booking.message}\n`;
  }

  message += `\n⏰ *Время:* ${formatDateTime(booking.createdAt || new Date())}`;

  return message;
}

/**
 * Send booking notification to manager
 * @param {Object} booking - Booking request
 * @param {Object} additionalData - Session/membership/location data
 * @returns {Promise<boolean>}
 */
async function sendBookingNotification(booking, additionalData = {}) {
  const { session, membership, location } = additionalData;
  let message;

  switch (booking.source) {
    case 'session_booking':
      message = formatSessionBooking(booking, session, location);
      break;
    case 'membership_purchase':
      message = formatMembershipPurchase(booking, membership);
      break;
    case 'contact_form':
    default:
      message = formatContactForm(booking);
      break;
  }

  const chatId = getManagerChatId();
  return sendMessage(chatId, message);
}

/**
 * Send system alert to admin
 * @param {string} alertMessage - Alert message
 * @returns {Promise<boolean>}
 */
async function sendSystemAlert(alertMessage) {
  const message = `⚠️ *СИСТЕМНОЕ УВЕДОМЛЕНИЕ*\n\n${alertMessage}\n\n⏰ ${formatDateTime(new Date())}`;
  const chatId = getAdminChatId();
  return sendMessage(chatId, message);
}

/**
 * Send success notification
 * @param {string} action - What succeeded
 * @param {Object} details - Additional details
 * @returns {Promise<boolean>}
 */
async function sendSuccessNotification(action, details = {}) {
  let message = `✅ *${action}*\n`;

  if (Object.keys(details).length > 0) {
    message += '\n';
    for (const [key, value] of Object.entries(details)) {
      message += `• ${key}: ${value}\n`;
    }
  }

  message += `\n⏰ ${formatDateTime(new Date())}`;

  const chatId = getAdminChatId();
  return sendMessage(chatId, message);
}

module.exports = {
  sendMessage,
  sendBookingNotification,
  sendSystemAlert,
  sendSuccessNotification,
  formatSessionBooking,
  formatMembershipPurchase,
  formatContactForm
};
