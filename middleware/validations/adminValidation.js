const { query, validationResult } = require('express-validator');
const { body } = require('express-validator');

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

/**
 * Validate admin request data
 */
exports.validateAdmin = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        req.flash('error_msg', errors.array()[0].msg);
        return res.redirect('back');
    }
    next();
};

/**
 * Validate student management data
 */
exports.validateStudentData = [
    body('rollNumber')
        .trim()
        .notEmpty().withMessage('Roll number is required')
        .matches(/^[A-Z0-9]+$/).withMessage('Roll number must contain only uppercase letters and numbers'),
    
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please enter a valid email')
        .normalizeEmail(),
    
    body('phone')
        .optional({ checkFalsy: true })
        .trim()
        .matches(/^\+?[\d\s-]+$/).withMessage('Please enter a valid phone number'),
    
    body('department')
        .trim()
        .notEmpty().withMessage('Department is required'),
    
    body('semester')
        .trim()
        .notEmpty().withMessage('Semester is required')
        .isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8'),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            if (req.xhr) {
                return res.status(400).json({ errors: errors.array() });
            }
            
            req.flash('error_msg', errors.array()[0].msg);
            return res.redirect('back');
        }
        next();
    }
];

/**
 * Validate activity log filters
 */
exports.validateActivityLogFilters = [
    query('startDate')
        .optional()
        .isISO8601().withMessage('Invalid start date format'),
    
    query('endDate')
        .optional()
        .isISO8601().withMessage('Invalid end date format'),
    
    query('userType')
        .optional()
        .isIn(['student', 'admin']).withMessage('Invalid user type'),
    
    query('action')
        .optional()
        .isIn(['login', 'logout', 'create', 'update', 'delete', 'view'])
        .withMessage('Invalid action type'),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

/**
 * Validate ticket management data
 */
exports.validateTicketUpdate = [
    body('status')
        .optional()
        .isIn(['open', 'in_progress', 'resolved', 'closed'])
        .withMessage('Invalid ticket status'),
    
    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'urgent'])
        .withMessage('Invalid priority level'),
    
    body('assignedTo')
        .optional()
        .isMongoId()
        .withMessage('Invalid admin ID'),
    
    body('response')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Response cannot be empty')
        .isLength({ max: 1000 })
        .withMessage('Response cannot exceed 1000 characters'),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

module.exports = {
  activityLogValidation,
  validateAdmin,
  validateStudentData,
  validateActivityLogFilters,
  validateTicketUpdate
}; 