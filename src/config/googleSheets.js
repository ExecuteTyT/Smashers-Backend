/**
 * Google Sheets API Configuration
 *
 * Initializes the Google Sheets client using Service Account credentials.
 * Sheets integration is optional - if credentials are not provided,
 * operations will be skipped.
 */

const { google } = require('googleapis');
const logger = require('./logger');

let sheetsClient = null;
let isEnabled = false;

// Sheet names configuration
const SHEET_NAMES = {
  CATEGORIES: 'Categories',
  MEMBERSHIPS: 'Memberships',
  SESSIONS: 'Sessions',
  LOCATIONS: 'Locations'
};

// Initialize Google Sheets client
const initGoogleSheets = async () => {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!email || !privateKey || !sheetId) {
    logger.warn('Google Sheets credentials not configured - sync disabled');
    return null;
  }

  try {
    // Create auth client using Service Account
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: email,
        // Private key comes with escaped \n, need to unescape
        private_key: privateKey.replace(/\\n/g, '\n')
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const authClient = await auth.getClient();
    sheetsClient = google.sheets({ version: 'v4', auth: authClient });
    isEnabled = true;

    logger.info('Google Sheets client initialized');
    return sheetsClient;
  } catch (error) {
    logger.error('Failed to initialize Google Sheets client', { error: error.message });
    return null;
  }
};

// Get sheets client
const getSheetsClient = () => sheetsClient;

// Check if Google Sheets is enabled
const isSheetsEnabled = () => isEnabled;

// Get spreadsheet ID
const getSpreadsheetId = () => process.env.GOOGLE_SHEET_ID;

// Test connection by reading spreadsheet metadata
const testSheetsConnection = async () => {
  if (!sheetsClient) {
    await initGoogleSheets();
  }

  if (!sheetsClient) {
    return { connected: false, reason: 'Client not initialized' };
  }

  try {
    const response = await sheetsClient.spreadsheets.get({
      spreadsheetId: getSpreadsheetId()
    });

    const title = response.data.properties.title;
    const sheets = response.data.sheets.map((s) => s.properties.title);

    logger.info('Google Sheets connection verified', { title, sheets });
    return { connected: true, title, sheets };
  } catch (error) {
    logger.error('Google Sheets connection test failed', { error: error.message });
    return { connected: false, reason: error.message };
  }
};

module.exports = {
  initGoogleSheets,
  getSheetsClient,
  isSheetsEnabled,
  getSpreadsheetId,
  testSheetsConnection,
  SHEET_NAMES
};
