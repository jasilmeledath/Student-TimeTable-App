/**
 * Authentication Middleware Module
 * Provides middleware functions for authentication, session management,
 * and user activity logging
 * @module middleware/authMiddleware
 */

const geoip = require('geoip-lite');
const ActivityLog = require('../models/ActivityLog');

/**
 * Verifies user authentication status
 * Redirects to login page if user is not authenticated
 * Sets user data on request object if authenticated
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
exports.checkAuth = (req, res, next) => {
  if (!req.session.user) {
    req.flash('error_msg', 'Please log in to access this resource');
    return res.redirect('/auth/login');
  }
  // Set req.user from session data
  req.user = req.session.user;
  next();
};

/**
 * Prevents authenticated users from accessing login-related pages
 * Redirects to appropriate dashboard based on user role
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
exports.preventReLogin = (req, res, next) => {
  if (req.session.user) {
    return res.redirect(req.session.user.isAdmin ? '/admin/dashboard' : '/student/timetable');
  }
  next();
};

/**
 * Enforces password change for first-time logins
 * Redirects to password change page if user hasn't changed default password
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
exports.checkPasswordChange = (req, res, next) => {
  if (req.session.user && req.session.user.isFirstLogin && 
      !req.path.includes('/change-password')) {
    req.flash('warning_msg', 'Please change your default password');
    return res.redirect('/auth/change-password');
  }
  next();
};

/**
 * Logs user activity with geolocation data
 * Tracks user actions and locations for security monitoring
 * Continues execution even if logging fails
 * 
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
exports.logActivity = async (req, res, next) => {
  try {
    if (!req.session.user) return next();

    // Extract client IP address from request
    const ip = req.ip || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress || 
               req.connection.socket.remoteAddress;

    // Resolve geolocation data from IP
    const geo = geoip.lookup(ip);
    const location = {
      ip,
      ...(geo ? {
        city: geo.city,
        country: geo.country,
        coordinates: {
          latitude: geo.ll[0],
          longitude: geo.ll[1]
        }
      } : {})
    };

    // Map HTTP methods to activity types
    const action = req.method === 'GET' ? 'view' : 
                  req.method === 'POST' ? 'create' :
                  req.method === 'PUT' ? 'update' :
                  req.method === 'DELETE' ? 'delete' : 'view';

    // Record activity in database
    await ActivityLog.logActivity({
      userId: req.session.user._id,
      userType: req.session.user.isAdmin ? 'Admin' : 'Student',
      action,
      entityType: req.baseUrl.split('/')[1] || 'System',
      location
    });

    next();
  } catch (error) {
    console.error('Activity logging error:', error);
    next(); // Proceed with request even if logging fails
  }
};

/**
 * Exposes user data to view templates
 * Makes authentication status and user role available in views
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
exports.attachUserData = (req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.isAuthenticated = !!req.session.user;
  res.locals.isAdmin = req.session.user?.isAdmin || false;
  next();
}; 