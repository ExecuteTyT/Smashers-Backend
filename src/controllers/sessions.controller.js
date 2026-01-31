/**
 * Sessions Controller
 *
 * Handles requests for training sessions data.
 */

const { prisma } = require('../config/database');
const { asyncHandler, ApiError, ErrorCodes } = require('../middleware/errorHandler');
const { getDayBounds } = require('../utils/helpers');
const { ACTIVE } = require('../constants/sessionStatus');

/**
 * GET /api/sessions
 * Get sessions with optional filtering
 */
const getSessions = asyncHandler(async (req, res) => {
  const {
    date,
    date_from,
    date_to,
    category_id,
    location_id,
    available_only,
    limit = 100,
    offset = 0
  } = req.query;

  // Build where clause
  const where = {
    status: ACTIVE
  };
  
  // Date filters
  const includePast = req.query.include_past === 'true' || req.query.include_past === true;
  
  if (date) {
    // Specific date filter
    const { start, end } = getDayBounds(new Date(date));
    where.datetime = { gte: start, lte: end };
  } else if (date_from || date_to) {
    // Date range filter
    where.datetime = {};
    if (date_from) {
      where.datetime.gte = new Date(date_from);
    }
    if (date_to) {
      where.datetime.lte = new Date(date_to);
    }
    // If only date_to is specified and include_past is false, ensure we don't show past
    if (!date_from && !includePast) {
      where.datetime.gte = new Date();
    }
  } else if (!includePast) {
    // By default, only show future sessions
    where.datetime = { gte: new Date() };
  }

  // Category filter
  if (category_id) {
    where.categoryId = parseInt(category_id, 10);
  }

  // Location filter
  if (location_id) {
    where.locationId = parseInt(location_id, 10);
  }

  // Available spots filter
  if (available_only === true || available_only === 'true') {
    where.availableSpots = { gt: 0 };
  }

  const sessions = await prisma.session.findMany({
    where,
    include: {
      category: true,
      location: true
    },
    orderBy: { datetime: 'asc' },
    take: parseInt(limit, 10),
    skip: parseInt(offset, 10)
  });

  // Get total count for pagination
  const total = await prisma.session.count({ where });

  res.json({
    success: true,
    data: sessions,
    pagination: {
      total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    }
  });
});

/**
 * GET /api/sessions/all
 * Get all sessions including inactive (for admin)
 */
const getAllSessions = asyncHandler(async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;

  const sessions = await prisma.session.findMany({
    include: {
      category: true,
      location: true
    },
    orderBy: { datetime: 'desc' },
    take: parseInt(limit, 10),
    skip: parseInt(offset, 10)
  });

  const total = await prisma.session.count();

  res.json({
    success: true,
    data: sessions,
    pagination: {
      total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    }
  });
});

/**
 * GET /api/sessions/:id
 * Get single session by ID
 */
const getSessionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await prisma.session.findUnique({
    where: { id: parseInt(id, 10) },
    include: {
      category: true,
      location: true
    }
  });

  if (!session) {
    throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Session not found');
  }

  res.json({
    success: true,
    data: session
  });
});

/**
 * GET /api/sessions/upcoming
 * Get upcoming sessions (today and future)
 */
const getUpcomingSessions = asyncHandler(async (req, res) => {
  const { limit = 50, category_id, location_id } = req.query;

  const where = {
    status: ACTIVE,
    datetime: { gte: new Date() },
    availableSpots: { gt: 0 }
  };

  if (category_id) {
    where.categoryId = parseInt(category_id, 10);
  }

  if (location_id) {
    where.locationId = parseInt(location_id, 10);
  }

  const sessions = await prisma.session.findMany({
    where,
    include: {
      category: true,
      location: true
    },
    orderBy: { datetime: 'asc' },
    take: parseInt(limit, 10)
  });

  res.json({
    success: true,
    data: sessions
  });
});

/**
 * GET /api/sessions/by-date/:date
 * Get sessions for specific date (YYYY-MM-DD)
 */
const getSessionsByDate = asyncHandler(async (req, res) => {
  const { date } = req.params;

  const { start, end } = getDayBounds(new Date(date));

  const sessions = await prisma.session.findMany({
    where: {
      status: ACTIVE,
      datetime: { gte: start, lte: end }
    },
    include: {
      category: true,
      location: true
    },
    orderBy: { datetime: 'asc' }
  });

  res.json({
    success: true,
    data: sessions
  });
});

module.exports = {
  getSessions,
  getAllSessions,
  getSessionById,
  getUpcomingSessions,
  getSessionsByDate
};
