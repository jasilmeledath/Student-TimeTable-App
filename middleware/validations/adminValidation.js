const { query } = require('express-validator');

/**
 * Activity log query validation rules
 */
const activityLogValidation = [
  query('rollNo')
    .optional()
    .trim()
    .toUpperCase(),
  query('action')
    .optional()
    .trim()
    .isIn(['create', 'update', 'delete', 'login', 'logout', 'password_change', 'view'])
    .withMessage('Invalid action type'),
  query('entityType')
    .optional()
    .trim()
    .isIn(['Student', 'System'])
    .withMessage('Invalid entity type'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

module.exports = {
  activityLogValidation
}; 