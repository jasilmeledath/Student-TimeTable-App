/**
 * Authentication Routes Module
 * Handles all authentication-related routes including login, logout,
 * password management, and account recovery
 * @module routes/auth
 */

const express = require('express');
const router = express.Router();
const logger = require('../helpers/logger');

const authController = require('../controllers/auth/authController');
const { preventReLogin, checkAuth } = require('../middleware/authMiddleware');
const {
  loginValidation,
  passwordChangeValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  handleValidationErrors
} = require('../middleware/validations/authValidation');

/**
 * Authentication Routes Configuration
 */

/**
 * Login Routes
 * GET  /auth/login - Displays login form
 * POST /auth/login - Processes login attempt
 */
router.get('/login', preventReLogin, (req, res) => {
  res.render('auth/login', {
    title: 'Login',
    layout: 'layouts/auth',
    script: null // Prevents undefined script error in template
  });
});

router.post('/login',
  preventReLogin,
  loginValidation,
  handleValidationErrors,
  authController.login
);

/**
 * Password Change Routes
 * GET  /auth/change-password - Displays password change form
 * POST /auth/change-password - Processes password change request
 * Requires authentication
 */
router.get('/change-password', checkAuth, (req, res) => {
  res.render('auth/change-password', {
    title: 'Change Password',
    layout: 'layouts/auth',
    script: null, // Prevents undefined script error in template
    user: req.session.user
  });
});

router.post('/change-password',
  checkAuth,
  passwordChangeValidation,
  handleValidationErrors,
  authController.changePassword
);

/**
 * Password Recovery Routes
 * GET  /auth/forgot-password - Displays password recovery form
 * POST /auth/forgot-password - Initiates password recovery process
 * Prevents authenticated users from accessing
 */
router.get('/forgot-password', preventReLogin, (req, res) => {
  res.render('auth/forgot-password', {
    title: 'Forgot Password',
    layout: 'layouts/auth',
    script: null // Prevents undefined script error in template
  });
});

router.post('/forgot-password',
  preventReLogin,
  forgotPasswordValidation,
  handleValidationErrors,
  authController.forgotPassword
);

/**
 * Password Reset Routes
 * GET  /auth/reset-password - Displays password reset form
 * POST /auth/reset-password - Processes password reset request
 * Prevents authenticated users from accessing
 */
router.get('/reset-password', preventReLogin, (req, res) => {
  res.render('auth/reset-password', {
    title: 'Reset Password',
    layout: 'layouts/auth',
    script: null // Prevents undefined script error in template
  });
});

router.post('/reset-password',
  preventReLogin,
  resetPasswordValidation,
  handleValidationErrors,
  authController.resetPassword
);

/**
 * Logout Route
 * POST /auth/logout - Ends user session and redirects to login
 */
router.post('/logout', authController.logout);

module.exports = router; 