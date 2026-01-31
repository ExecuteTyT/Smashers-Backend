/**
 * Test Setup Helpers
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/smashers_test';
process.env.API_KEY = 'test_api_key';

// Disable logging in tests
process.env.LOG_LEVEL = 'error';

// Mock external services
jest.mock('../../src/config/telegram', () => ({
  initTelegramBot: jest.fn(),
  getBot: jest.fn(() => null),
  isTelegramEnabled: jest.fn(() => false),
  getManagerChatId: jest.fn(() => null),
  getAdminChatId: jest.fn(() => null),
  testBotConnection: jest.fn(() => Promise.resolve({ connected: false }))
}));

jest.mock('../../src/config/googleSheets', () => ({
  initGoogleSheets: jest.fn(() => Promise.resolve(null)),
  getSheetsClient: jest.fn(() => null),
  isSheetsEnabled: jest.fn(() => false),
  getSpreadsheetId: jest.fn(() => null),
  testSheetsConnection: jest.fn(() => Promise.resolve({ connected: false })),
  SHEET_NAMES: {
    CATEGORIES: 'Categories',
    MEMBERSHIPS: 'Memberships',
    SESSIONS: 'Sessions',
    LOCATIONS: 'Locations'
  }
}));
