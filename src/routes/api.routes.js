/**
 * API Routes
 *
 * Defines all API endpoints.
 */

const express = require('express');
const router = express.Router();

// Controllers
const categoriesController = require('../controllers/categories.controller');
const membershipsController = require('../controllers/memberships.controller');
const sessionsController = require('../controllers/sessions.controller');
const locationsController = require('../controllers/locations.controller');
const bookingController = require('../controllers/booking.controller');
const healthController = require('../controllers/health.controller');

// Middleware
const { requireApiKey } = require('../middleware/auth');
const { validate, bookingSchema, sessionsQuerySchema, idParamSchema, paginationSchema } = require('../middleware/validator');
const { createStrictRateLimiter } = require('../middleware/rateLimiter');

// Services (for trigger endpoints)
const parserService = require('../services/parser.service');
const syncService = require('../services/sync.service');
const { asyncHandler } = require('../middleware/errorHandler');

// ============================================
// Health & Status Routes
// ============================================

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Basic health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/health', healthController.healthCheck);

/**
 * @swagger
 * /api/health/detailed:
 *   get:
 *     summary: Detailed health check with all services
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed health status
 */
router.get('/health/detailed', healthController.detailedHealthCheck);

/**
 * @swagger
 * /api/sync-status:
 *   get:
 *     summary: Get sync status and history
 *     tags: [Health]
 */
router.get('/sync-status', healthController.getSyncStatus);

/**
 * @swagger
 * /api/stats:
 *   get:
 *     summary: Get database statistics
 *     tags: [Health]
 */
router.get('/stats', healthController.getStats);

// ============================================
// Categories Routes
// ============================================

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all visible categories
 *     tags: [Categories]
 */
router.get('/categories', validate(paginationSchema), categoriesController.getCategories);

/**
 * @swagger
 * /api/categories/all:
 *   get:
 *     summary: Get all categories including hidden (admin)
 *     tags: [Categories]
 *     security:
 *       - ApiKeyAuth: []
 */
router.get('/categories/all', requireApiKey, validate(paginationSchema), categoriesController.getAllCategories);

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 */
router.get('/categories/:id', validate(idParamSchema), categoriesController.getCategoryById);

// ============================================
// Memberships Routes
// ============================================

/**
 * @swagger
 * /api/memberships:
 *   get:
 *     summary: Get all visible memberships
 *     tags: [Memberships]
 */
router.get('/memberships', validate(paginationSchema), membershipsController.getMemberships);

/**
 * @swagger
 * /api/memberships/all:
 *   get:
 *     summary: Get all memberships including hidden (admin)
 *     tags: [Memberships]
 *     security:
 *       - ApiKeyAuth: []
 */
router.get('/memberships/all', requireApiKey, validate(paginationSchema), membershipsController.getAllMemberships);

/**
 * @swagger
 * /api/memberships/{id}:
 *   get:
 *     summary: Get membership by ID
 *     tags: [Memberships]
 */
router.get('/memberships/:id', validate(idParamSchema), membershipsController.getMembershipById);

/**
 * @swagger
 * /api/memberships/by-type/{type}:
 *   get:
 *     summary: Get memberships by type
 *     tags: [Memberships]
 */
router.get('/memberships/by-type/:type', membershipsController.getMembershipsByType);

// ============================================
// Sessions Routes
// ============================================

/**
 * @swagger
 * /api/sessions:
 *   get:
 *     summary: Get sessions with filtering
 *     tags: [Sessions]
 *     parameters:
 *       - name: date
 *         in: query
 *         description: Filter by specific date (YYYY-MM-DD)
 *       - name: date_from
 *         in: query
 *         description: Filter from date
 *       - name: date_to
 *         in: query
 *         description: Filter to date
 *       - name: category_id
 *         in: query
 *         description: Filter by category ID
 *       - name: location_id
 *         in: query
 *         description: Filter by location ID
 *       - name: available_only
 *         in: query
 *         description: Only show sessions with available spots
 */
router.get('/sessions', validate(sessionsQuerySchema), sessionsController.getSessions);

/**
 * @swagger
 * /api/sessions/all:
 *   get:
 *     summary: Get all sessions including inactive (admin)
 *     tags: [Sessions]
 *     security:
 *       - ApiKeyAuth: []
 */
router.get('/sessions/all', requireApiKey, validate(paginationSchema), sessionsController.getAllSessions);

/**
 * @swagger
 * /api/sessions/upcoming:
 *   get:
 *     summary: Get upcoming sessions
 *     tags: [Sessions]
 */
router.get('/sessions/upcoming', sessionsController.getUpcomingSessions);

/**
 * @swagger
 * /api/sessions/by-date/{date}:
 *   get:
 *     summary: Get sessions for specific date
 *     tags: [Sessions]
 */
router.get('/sessions/by-date/:date', sessionsController.getSessionsByDate);

/**
 * @swagger
 * /api/sessions/{id}:
 *   get:
 *     summary: Get session by ID
 *     tags: [Sessions]
 */
router.get('/sessions/:id', validate(idParamSchema), sessionsController.getSessionById);

// ============================================
// Locations Routes
// ============================================

/**
 * @swagger
 * /api/locations:
 *   get:
 *     summary: Get all visible locations
 *     tags: [Locations]
 */
router.get('/locations', validate(paginationSchema), locationsController.getLocations);

/**
 * @swagger
 * /api/locations/all:
 *   get:
 *     summary: Get all locations including hidden (admin)
 *     tags: [Locations]
 *     security:
 *       - ApiKeyAuth: []
 */
router.get('/locations/all', requireApiKey, validate(paginationSchema), locationsController.getAllLocations);

/**
 * @swagger
 * /api/locations/{id}:
 *   get:
 *     summary: Get location by ID
 *     tags: [Locations]
 */
router.get('/locations/:id', validate(idParamSchema), locationsController.getLocationById);

/**
 * @swagger
 * /api/locations/{id}/sessions:
 *   get:
 *     summary: Get sessions for a location
 *     tags: [Locations]
 */
router.get('/locations/:id/sessions', validate(idParamSchema), locationsController.getLocationSessions);

// ============================================
// Booking Routes
// ============================================

/**
 * @swagger
 * /api/booking:
 *   post:
 *     summary: Create a booking request
 *     tags: [Booking]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               sessionId:
 *                 type: integer
 *               membershipId:
 *                 type: integer
 *               message:
 *                 type: string
 *               source:
 *                 type: string
 *                 enum: [session_booking, membership_purchase, contact_form]
 */
router.post('/booking', createStrictRateLimiter(), validate(bookingSchema), bookingController.createBooking);

/**
 * @swagger
 * /api/booking:
 *   get:
 *     summary: Get all booking requests (admin)
 *     tags: [Booking]
 *     security:
 *       - ApiKeyAuth: []
 */
router.get('/booking', requireApiKey, validate(paginationSchema), bookingController.getBookings);

/**
 * @swagger
 * /api/booking/{id}:
 *   get:
 *     summary: Get booking by ID (admin)
 *     tags: [Booking]
 *     security:
 *       - ApiKeyAuth: []
 */
router.get('/booking/:id', requireApiKey, validate(idParamSchema), bookingController.getBookingById);

/**
 * @swagger
 * /api/booking/{id}/resend:
 *   post:
 *     summary: Resend Telegram notification (admin)
 *     tags: [Booking]
 *     security:
 *       - ApiKeyAuth: []
 */
router.post('/booking/:id/resend', requireApiKey, validate(idParamSchema), bookingController.resendNotification);

// ============================================
// Admin/Trigger Routes (protected)
// ============================================

/**
 * @swagger
 * /api/trigger-parse:
 *   post:
 *     summary: Manually trigger parser
 *     tags: [Admin]
 *     security:
 *       - ApiKeyAuth: []
 */
router.post(
  '/trigger-parse',
  requireApiKey,
  asyncHandler(async (req, res) => {
    const result = await parserService.runFullParse();
    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * @swagger
 * /api/trigger-sync:
 *   post:
 *     summary: Manually trigger sync from Sheets to DB
 *     tags: [Admin]
 *     security:
 *       - ApiKeyAuth: []
 */
router.post(
  '/trigger-sync',
  requireApiKey,
  asyncHandler(async (req, res) => {
    const result = await syncService.syncAll();
    res.json({
      success: true,
      data: result
    });
  })
);

module.exports = router;
