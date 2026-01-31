/**
 * Locations Controller
 *
 * Handles requests for locations data.
 */

const { prisma } = require('../config/database');
const { asyncHandler, ApiError, ErrorCodes } = require('../middleware/errorHandler');
const { ACTIVE } = require('../constants/sessionStatus');

/**
 * GET /api/locations
 * Get all visible locations for booking screen
 */
const getLocations = asyncHandler(async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;

  const locations = await prisma.location.findMany({
    where: {
      showLocation: true,
      showOnBookingScreen: true
    },
    orderBy: { sortOrder: 'asc' },
    take: parseInt(limit, 10),
    skip: parseInt(offset, 10)
  });

  res.json({
    success: true,
    data: locations
  });
});

/**
 * GET /api/locations/all
 * Get all locations including hidden (for admin)
 */
const getAllLocations = asyncHandler(async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;

  const locations = await prisma.location.findMany({
    orderBy: { sortOrder: 'asc' },
    take: parseInt(limit, 10),
    skip: parseInt(offset, 10)
  });

  res.json({
    success: true,
    data: locations
  });
});

/**
 * GET /api/locations/:id
 * Get single location by ID
 */
const getLocationById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const location = await prisma.location.findUnique({
    where: { id: parseInt(id, 10) },
    include: {
      sessions: {
        where: {
          status: ACTIVE,
          datetime: { gte: new Date() }
        },
        orderBy: { datetime: 'asc' },
        take: 10
      }
    }
  });

  if (!location) {
    throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Location not found');
  }

  res.json({
    success: true,
    data: location
  });
});

/**
 * GET /api/locations/:id/sessions
 * Get sessions for a specific location
 */
const getLocationSessions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit = 50, date_from, date_to } = req.query;

  const where = {
    locationId: parseInt(id, 10),
    status: ACTIVE
  };

  if (date_from || date_to) {
    where.datetime = {};
    if (date_from) where.datetime.gte = new Date(date_from);
    if (date_to) where.datetime.lte = new Date(date_to);
  } else {
    where.datetime = { gte: new Date() };
  }

  const sessions = await prisma.session.findMany({
    where,
    include: {
      category: true
    },
    orderBy: { datetime: 'asc' },
    take: parseInt(limit, 10)
  });

  res.json({
    success: true,
    data: sessions
  });
});

module.exports = {
  getLocations,
  getAllLocations,
  getLocationById,
  getLocationSessions
};
