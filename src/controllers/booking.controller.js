/**
 * Booking Controller
 *
 * Handles booking requests from the website.
 */

const { prisma } = require('../config/database');
const { asyncHandler, ApiError, ErrorCodes } = require('../middleware/errorHandler');
const telegramService = require('../services/telegram.service');
const logger = require('../config/logger');

/**
 * POST /api/booking
 * Create a new booking request
 */
const createBooking = asyncHandler(async (req, res) => {
  const { name, phone, sessionId, membershipId, message, source = 'contact_form' } = req.body;

  // Validate that at least name and phone are provided
  if (!name || !phone) {
    throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Name and phone are required');
  }

  // Fetch related data for notification
  let session = null;
  let membership = null;
  let location = null;

  if (sessionId) {
    session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { location: true, category: true }
    });

    if (!session) {
      throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Session not found');
    }

    location = session.location;
  }

  if (membershipId) {
    membership = await prisma.membership.findUnique({
      where: { id: membershipId }
    });

    if (!membership) {
      throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Membership not found');
    }
  }

  // Create booking request
  const booking = await prisma.bookingRequest.create({
    data: {
      name,
      phone,
      sessionId: sessionId || null,
      membershipId: membershipId || null,
      message: message || null,
      source,
      sentToTelegram: false
    }
  });

  logger.logApi('Booking created', {
    id: booking.id,
    source,
    sessionId,
    membershipId
  });

  // Send Telegram notification
  let telegramSent = false;
  try {
    telegramSent = await telegramService.sendBookingNotification(booking, {
      session,
      membership,
      location
    });

    // Update booking record
    if (telegramSent) {
      await prisma.bookingRequest.update({
        where: { id: booking.id },
        data: { sentToTelegram: true }
      });
    }
  } catch (error) {
    logger.error('Failed to send Telegram notification', { error: error.message });
  }

  res.status(201).json({
    success: true,
    data: {
      id: booking.id,
      message: 'Заявка успешно отправлена',
      notificationSent: telegramSent
    }
  });
});

/**
 * GET /api/booking
 * Get all booking requests (admin only)
 */
const getBookings = asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0, source } = req.query;

  const where = {};
  if (source) {
    where.source = source;
  }

  const bookings = await prisma.bookingRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit, 10),
    skip: parseInt(offset, 10)
  });

  const total = await prisma.bookingRequest.count({ where });

  res.json({
    success: true,
    data: bookings,
    pagination: {
      total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    }
  });
});

/**
 * GET /api/booking/:id
 * Get single booking by ID (admin only)
 */
const getBookingById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const booking = await prisma.bookingRequest.findUnique({
    where: { id: parseInt(id, 10) }
  });

  if (!booking) {
    throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Booking not found');
  }

  res.json({
    success: true,
    data: booking
  });
});

/**
 * POST /api/booking/:id/resend
 * Resend Telegram notification for a booking
 */
const resendNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const booking = await prisma.bookingRequest.findUnique({
    where: { id: parseInt(id, 10) }
  });

  if (!booking) {
    throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Booking not found');
  }

  // Fetch related data
  let session = null;
  let membership = null;
  let location = null;

  if (booking.sessionId) {
    session = await prisma.session.findUnique({
      where: { id: booking.sessionId },
      include: { location: true }
    });
    location = session?.location;
  }

  if (booking.membershipId) {
    membership = await prisma.membership.findUnique({
      where: { id: booking.membershipId }
    });
  }

  const sent = await telegramService.sendBookingNotification(booking, {
    session,
    membership,
    location
  });

  if (sent) {
    await prisma.bookingRequest.update({
      where: { id: booking.id },
      data: { sentToTelegram: true }
    });
  }

  res.json({
    success: true,
    data: {
      sent,
      message: sent ? 'Notification sent successfully' : 'Failed to send notification'
    }
  });
});

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  resendNotification
};
