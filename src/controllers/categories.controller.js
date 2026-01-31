/**
 * Categories Controller
 *
 * Handles requests for categories data.
 */

const { prisma } = require('../config/database');
const { asyncHandler, ApiError, ErrorCodes } = require('../middleware/errorHandler');
const { ACTIVE } = require('../constants/sessionStatus');

/**
 * GET /api/categories
 * Get all categories
 */
const getCategories = asyncHandler(async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;

  const categories = await prisma.category.findMany({
    where: { isVisible: true },
    orderBy: { sortOrder: 'asc' },
    take: parseInt(limit, 10),
    skip: parseInt(offset, 10)
  });

  res.json({
    success: true,
    data: categories
  });
});

/**
 * GET /api/categories/all
 * Get all categories including hidden (for admin)
 */
const getAllCategories = asyncHandler(async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    take: parseInt(limit, 10),
    skip: parseInt(offset, 10)
  });

  res.json({
    success: true,
    data: categories
  });
});

/**
 * GET /api/categories/:id
 * Get single category by ID
 */
const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await prisma.category.findUnique({
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

  if (!category) {
    throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Category not found');
  }

  res.json({
    success: true,
    data: category
  });
});

module.exports = {
  getCategories,
  getAllCategories,
  getCategoryById
};
