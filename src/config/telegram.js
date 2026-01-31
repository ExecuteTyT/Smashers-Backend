/**
 * Telegram Bot Configuration
 *
 * Initializes the Telegram bot client for sending notifications.
 * Bot is optional - if credentials are not provided, notifications
 * will be logged but not sent.
 */

const TelegramBot = require('node-telegram-bot-api');
const logger = require('./logger');

let bot = null;
let isEnabled = false;

// Initialize bot if credentials are available
const initTelegramBot = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    logger.warn('Telegram bot token not configured - notifications disabled');
    return null;
  }

  try {
    // Create bot without polling (we only send messages, not receive)
    bot = new TelegramBot(token, { polling: false });
    isEnabled = true;
    logger.info('Telegram bot initialized');
    return bot;
  } catch (error) {
    logger.error('Failed to initialize Telegram bot', { error: error.message });
    return null;
  }
};

// Get bot instance
const getBot = () => {
  if (!bot && process.env.TELEGRAM_BOT_TOKEN) {
    return initTelegramBot();
  }
  return bot;
};

// Check if Telegram is enabled
const isTelegramEnabled = () => isEnabled;

// Get manager chat ID
const getManagerChatId = () => process.env.TELEGRAM_MANAGER_CHAT_ID;

// Get admin chat ID (falls back to manager if not set)
const getAdminChatId = () =>
  process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_MANAGER_CHAT_ID;

// Test bot connection
const testBotConnection = async () => {
  const telegramBot = getBot();
  if (!telegramBot) {
    return { connected: false, reason: 'Bot not initialized' };
  }

  try {
    const me = await telegramBot.getMe();
    logger.logTelegram('Bot connection verified', { username: me.username });
    return { connected: true, username: me.username };
  } catch (error) {
    logger.error('Telegram bot connection test failed', { error: error.message });
    return { connected: false, reason: error.message };
  }
};

module.exports = {
  initTelegramBot,
  getBot,
  isTelegramEnabled,
  getManagerChatId,
  getAdminChatId,
  testBotConnection
};
