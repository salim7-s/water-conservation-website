import { body, validationResult } from 'express-validator';

/**
 * Validation result handler middleware
 */
export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

/**
 * User registration validation rules
 */
export const validateRegister = [
  body('firstname').trim().notEmpty().withMessage('First name is required'),
  body('lastname').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors,
];

/**
 * User login validation rules
 */
export const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

/**
 * Alert creation validation rules
 */
export const validateAlert = [
  body('alert_type').trim().notEmpty().withMessage('Alert type is required'),
  body('user_id').isInt().withMessage('Valid user ID is required'),
  handleValidationErrors,
];

/**
 * Water usage validation rules
 */
export const validateWaterUsage = [
  body('user_id').isInt().withMessage('Valid user ID is required'),
  body('source_id').isInt().withMessage('Valid source ID is required'),
  body('quantity_used').isFloat({ min: 0 }).withMessage('Quantity must be a positive number'),
  body('date').isISO8601().withMessage('Valid date is required'),
  handleValidationErrors,
];


