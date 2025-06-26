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

// Login routes
router.get('/login', preventReLogin, (req, res) => {
  res.render('auth/login', {
    title: 'Login',
    layout: 'layouts/auth',
    script: '' // Add empty script to prevent undefined error
  });
});

router.post('/login',
  preventReLogin,
  loginValidation,
  handleValidationErrors,
  authController.login
);

// Password change routes
router.get('/change-password', checkAuth, (req, res) => {
  res.render('auth/change-password', {
    title: 'Change Password',
    layout: 'layouts/auth',
    script: '', // Add empty script to prevent undefined error
    user: req.session.user
  });
});

router.post('/change-password',
  checkAuth,
  passwordChangeValidation,
  handleValidationErrors,
  authController.changePassword
);

// Forgot password routes
router.get('/forgot-password', preventReLogin, (req, res) => {
  res.render('auth/forgot-password', {
    title: 'Forgot Password',
    layout: 'layouts/auth',
    script: '' // Add empty script to prevent undefined error
  });
});

router.post('/forgot-password',
  preventReLogin,
  forgotPasswordValidation,
  handleValidationErrors,
  authController.forgotPassword
);

// Reset password routes
router.get('/reset-password', preventReLogin, (req, res) => {
  res.render('auth/reset-password', {
    title: 'Reset Password',
    layout: 'layouts/auth',
    script: '' // Add empty script to prevent undefined error
  });
});

router.post('/reset-password',
  preventReLogin,
  resetPasswordValidation,
  handleValidationErrors,
  authController.resetPassword
);

// Logout route
router.post('/logout', authController.logout);

module.exports = router; 