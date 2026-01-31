/**
 * Request Validation Middleware
 *
 * Uses Joi schemas to validate request data.
 */

const Joi = require('joi');
const { ApiError, ErrorCodes } = require('./errorHandler');

/**
 * Create validation middleware from Joi schema
 * @param {Object} schema - Joi schema for body, query, params
 * @returns {Function} - Express middleware
 */
function validate(schema) {
  return (req, res, next) => {
    const { body, query, params } = schema;
    const errors = [];

    // Validate body
    if (body && req.body) {
      const { error, value } = body.validate(req.body, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map((d) => ({ field: d.path.join('.'), message: d.message })));
      } else {
        req.body = value;
      }
    }

    // Validate query
    if (query && req.query) {
      const { error, value } = query.validate(req.query, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map((d) => ({ field: d.path.join('.'), message: d.message })));
      } else {
        req.query = value;
      }
    }

    // Validate params
    if (params && req.params) {
      const { error, value } = params.validate(req.params, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map((d) => ({ field: d.path.join('.'), message: d.message })));
      } else {
        req.params = value;
      }
    }

    if (errors.length > 0) {
      const apiError = new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Validation failed');
      apiError.details = errors;
      return next(apiError);
    }

    next();
  };
}

// ============================================
// Validation Schemas
// ============================================

/**
 * Booking request schema
 */
const bookingSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Имя должно содержать минимум 2 символа',
      'string.max': 'Имя должно содержать максимум 100 символов',
      'any.required': 'Имя обязательно'
    }),
    phone: Joi.string()
      .pattern(/^[\d\s\+\-\(\)]{10,20}$/)
      .required()
      .messages({
        'string.pattern.base': 'Некорректный формат телефона',
        'any.required': 'Телефон обязателен'
      }),
    sessionId: Joi.number().integer().positive().optional().messages({
      'number.base': 'ID тренировки должен быть числом',
      'number.positive': 'ID тренировки должен быть положительным'
    }),
    membershipId: Joi.number().integer().positive().optional().messages({
      'number.base': 'ID абонемента должен быть числом',
      'number.positive': 'ID абонемента должен быть положительным'
    }),
    message: Joi.string().max(1000).optional().allow('').messages({
      'string.max': 'Сообщение должно содержать максимум 1000 символов'
    }),
    source: Joi.string()
      .valid('session_booking', 'membership_purchase', 'contact_form')
      .default('contact_form')
  })
};

/**
 * Sessions query schema
 */
const sessionsQuerySchema = {
  query: Joi.object({
    date: Joi.date().iso().optional(),
    date_from: Joi.date().iso().optional(),
    date_to: Joi.date().iso().optional(),
    category_id: Joi.number().integer().positive().optional(),
    location_id: Joi.number().integer().positive().optional(),
    available_only: Joi.boolean().optional(),
    include_past: Joi.boolean().optional(),
    limit: Joi.number().integer().min(1).max(1000).default(100),
    offset: Joi.number().integer().min(0).default(0)
  })
};

/**
 * ID parameter schema
 */
const idParamSchema = {
  params: Joi.object({
    id: Joi.number().integer().positive().required()
  })
};

/**
 * Pagination query schema
 */
const paginationSchema = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(1000).default(100),
    offset: Joi.number().integer().min(0).default(0)
  })
};

module.exports = {
  validate,
  bookingSchema,
  sessionsQuerySchema,
  idParamSchema,
  paginationSchema
};
