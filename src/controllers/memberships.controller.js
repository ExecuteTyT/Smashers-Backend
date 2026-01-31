/**
 * Memberships Controller
 *
 * Handles requests for memberships (абонементы) data.
 */

const { prisma } = require('../config/database');
const { asyncHandler, ApiError, ErrorCodes } = require('../middleware/errorHandler');

/**
 * GET /api/memberships
 * Get all visible memberships
 */
const getMemberships = asyncHandler(async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;

  const memberships = await prisma.membership.findMany({
    where: { isVisible: true },
    orderBy: { price: 'asc' },
    take: parseInt(limit, 10),
    skip: parseInt(offset, 10)
  });

  res.json({
    success: true,
    data: memberships
  });
});

/**
 * GET /api/memberships/all
 * Get all memberships including hidden (for admin)
 */
const getAllMemberships = asyncHandler(async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;

  const memberships = await prisma.membership.findMany({
    orderBy: { price: 'asc' },
    take: parseInt(limit, 10),
    skip: parseInt(offset, 10)
  });

  res.json({
    success: true,
    data: memberships
  });
});

/**
 * GET /api/memberships/:id
 * Get single membership by ID
 */
const getMembershipById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const membership = await prisma.membership.findUnique({
    where: { id: parseInt(id, 10) }
  });

  if (!membership) {
    throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Membership not found');
  }

  res.json({
    success: true,
    data: membership
  });
});

/**
 * GET /api/memberships/by-type/:type
 * Get memberships by type
 */
const getMembershipsByType = asyncHandler(async (req, res) => {
  const { type } = req.params;

  const memberships = await prisma.membership.findMany({
    where: {
      isVisible: true,
      type: {
        contains: type,
        mode: 'insensitive'
      }
    },
    orderBy: { price: 'asc' }
  });

  res.json({
    success: true,
    data: memberships
  });
});

module.exports = {
  getMemberships,
  getAllMemberships,
  getMembershipById,
  getMembershipsByType
};
