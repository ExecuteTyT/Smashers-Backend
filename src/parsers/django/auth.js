/**
 * Django Admin Authentication
 *
 * Uses Puppeteer to authenticate with Django admin panel
 * and obtain session cookies for subsequent requests.
 */

const puppeteer = require('puppeteer');
const logger = require('../../config/logger');
const { retryOperation } = require('../../utils/retry');

// Browser instance (reused across requests)
let browser = null;
let page = null;
let cookies = null;
let lastAuthTime = null;

// Session timeout (re-auth after 30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

/**
 * Get base URL for Django admin
 * @returns {string}
 */
function getDjangoUrl() {
  return process.env.DJANGO_URL || 'https://smashers.bookbot.olegb.dev';
}

/**
 * Launch browser if not already running
 * @returns {Promise<Browser>}
 */
async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    logger.logParser('Launching browser');
    
    // Use system Chromium if available, otherwise use Puppeteer's Chrome
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || 
      (require('fs').existsSync('/usr/bin/chromium-browser') ? '/usr/bin/chromium-browser' : 
       require('fs').existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
    
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    };
    
    if (executablePath) {
      launchOptions.executablePath = executablePath;
      logger.logParser(`Using system browser: ${executablePath}`);
    }
    
    browser = await puppeteer.launch(launchOptions);
  }
  return browser;
}

/**
 * Get authenticated page
 * @returns {Promise<Page>}
 */
async function getPage() {
  const browserInstance = await getBrowser();

  if (!page || page.isClosed()) {
    page = await browserInstance.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
  }

  return page;
}

/**
 * Check if current session is still valid
 * @returns {boolean}
 */
function isSessionValid() {
  if (!cookies || !lastAuthTime) return false;
  return Date.now() - lastAuthTime < SESSION_TIMEOUT;
}

/**
 * Perform login to Django admin
 * @returns {Promise<Array>} - Session cookies
 */
async function login() {
  const username = process.env.DJANGO_USERNAME;
  const password = process.env.DJANGO_PASSWORD;

  if (!username || !password) {
    throw new Error('Django credentials not configured (DJANGO_USERNAME, DJANGO_PASSWORD)');
  }

  logger.logParser('Authenticating with Django admin');

  const pageInstance = await getPage();
  const baseUrl = getDjangoUrl();
  // If baseUrl already ends with /admin, use it directly, otherwise add /admin
  const loginUrl = baseUrl.endsWith('/admin') 
    ? `${baseUrl}/login/` 
    : `${baseUrl}/admin/login/`;

  try {
    // Navigate to login page
    await pageInstance.goto(loginUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Check if already logged in (redirected to admin dashboard)
    const currentUrl = pageInstance.url();
    if (currentUrl.includes('/admin/') && !currentUrl.includes('/login')) {
      logger.logParser('Already logged in');
      cookies = await pageInstance.cookies();
      lastAuthTime = Date.now();
      return cookies;
    }

    // Wait for login form - try multiple selectors
    try {
      await pageInstance.waitForSelector('input[name="username"]', { timeout: 10000 });
    } catch (e) {
      // Try alternative selectors
      const hasForm = await pageInstance.evaluate(() => {
        return !!(
          document.querySelector('input[name="username"]') ||
          document.querySelector('input[type="text"]') ||
          document.querySelector('form')
        );
      });
      if (!hasForm) {
        throw new Error('Login form not found on page');
      }
    }

    // Fill in credentials
    await pageInstance.type('input[name="username"]', username, { delay: 50 });
    await pageInstance.type('input[name="password"]', password, { delay: 50 });

    // Submit form
    await Promise.all([
      pageInstance.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
      pageInstance.click('input[type="submit"]')
    ]);

    // Check if login was successful
    const loginResultUrl = pageInstance.url();
    if (loginResultUrl.includes('/login/') || loginResultUrl.includes('error')) {
      // Check for error message
      const errorElement = await pageInstance.$('.errornote');
      const errorText = errorElement
        ? await pageInstance.evaluate((el) => el.textContent, errorElement)
        : 'Unknown error';
      throw new Error(`Login failed: ${errorText}`);
    }

    // Get cookies
    cookies = await pageInstance.cookies();
    lastAuthTime = Date.now();

    logger.logParser('Authentication successful', {
      cookieCount: cookies.length
    });

    return cookies;
  } catch (error) {
    logger.error('Django login failed', { error: error.message });
    throw error;
  }
}

/**
 * Get authenticated cookies (login if needed)
 * @returns {Promise<Array>} - Session cookies
 */
async function getAuthCookies() {
  if (isSessionValid()) {
    return cookies;
  }

  return retryOperation(login, {
    maxAttempts: parseInt(process.env.PARSE_RETRY_ATTEMPTS, 10) || 5,
    operationName: 'Django login'
  });
}

/**
 * Navigate to a Django admin page with authentication
 * @param {string} path - Path relative to admin (e.g., "/core/category/")
 * @returns {Promise<Page>} - Authenticated page at the URL
 */
async function navigateToAdminPage(path) {
  const authCookies = await getAuthCookies();
  const pageInstance = await getPage();
  const baseUrl = getDjangoUrl();
  // DJANGO_URL already includes /admin, so just append the path
  const fullUrl = `${baseUrl}${path}`;

  // Set cookies before navigation
  await pageInstance.setCookie(...authCookies);

  // Navigate to page
  await pageInstance.goto(fullUrl, {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  // Check if redirected to login (session expired)
  if (pageInstance.url().includes('/login/')) {
    logger.logParser('Session expired, re-authenticating');
    cookies = null;
    lastAuthTime = null;
    await login();
    await pageInstance.setCookie(...cookies);
    await pageInstance.goto(fullUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
  }

  return pageInstance;
}

/**
 * Get page HTML content
 * @param {string} path - Admin path
 * @returns {Promise<string>} - HTML content
 */
async function getPageHtml(path) {
  const pageInstance = await navigateToAdminPage(path);
  return pageInstance.content();
}

/**
 * Close browser and clean up
 */
async function closeBrowser() {
  if (page && !page.isClosed()) {
    await page.close();
    page = null;
  }
  if (browser) {
    await browser.close();
    browser = null;
  }
  cookies = null;
  lastAuthTime = null;
  logger.logParser('Browser closed');
}

/**
 * Check if Django admin is accessible
 * @returns {Promise<Object>} - { accessible: boolean, reason?: string }
 */
async function testDjangoConnection() {
  try {
    const pageInstance = await getPage();
    const baseUrl = getDjangoUrl();

    const response = await pageInstance.goto(`${baseUrl}/admin/`, {
      waitUntil: 'networkidle2',
      timeout: 15000
    });

    if (response && response.ok()) {
      return { accessible: true };
    }
    return { accessible: false, reason: `HTTP ${response?.status()}` };
  } catch (error) {
    return { accessible: false, reason: error.message };
  }
}

module.exports = {
  getDjangoUrl,
  getAuthCookies,
  navigateToAdminPage,
  getPageHtml,
  closeBrowser,
  testDjangoConnection,
  getPage
};
