const { body, validationResult } = require('express-validator');

/**
 * Login validation rules
 */
const loginValidation = [
  body('rollNumber')
    .trim()
    .notEmpty()
    .withMessage('Roll number is required')
    .toUpperCase(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Password change validation rules
 */
const passwordChangeValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    })
];

/**
 * Forgot password validation rules
 */
const forgotPasswordValidation = [
  body('rollNo')
    .trim()
    .notEmpty()
    .withMessage('Roll number is required')
    .toUpperCase(),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail()
];

/**
 * Reset password validation rules
 */
const resetPasswordValidation = [
  body('rollNo')
    .trim()
    .notEmpty()
    .withMessage('Roll number is required')
    .toUpperCase(),
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    })
];

/**
 * Validation error handler middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    // Fix for deprecated res.location('back')
    const referrer = req.get('Referrer') || '/';
    return res.redirect(referrer);
  }
  next();
};

module.exports = {
  loginValidation,
  passwordChangeValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  handleValidationErrors
}; 