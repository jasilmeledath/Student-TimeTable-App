const geoip = require('geoip-lite');
const ActivityLog = require('../models/ActivityLog');

/**
 * Middleware to check if user is authenticated
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.checkAuth = (req, res, next) => {
  if (!req.session.user) {
    req.flash('error_msg', 'Please log in to access this resource');
    return res.redirect('/auth/login');
  }
  next();
};

/**
 * Middleware to prevent logged-in users from accessing auth pages
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.preventReLogin = (req, res, next) => {
  if (req.session.user) {
    return res.redirect(req.session.user.isAdmin ? '/admin/dashboard' : '/student/timetable');
  }
  next();
};

/**
 * Middleware to check if user needs to change default password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
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
 * Middleware to log user activity with location
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.logActivity = async (req, res, next) => {
  try {
    if (!req.session.user) return next();

    // Get IP address
    const ip = req.ip || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress || 
               req.connection.socket.remoteAddress;

    // Get location data
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

    // Determine action and entity type from request
    const action = req.method === 'GET' ? 'view' : 
                  req.method === 'POST' ? 'create' :
                  req.method === 'PUT' ? 'update' :
                  req.method === 'DELETE' ? 'delete' : 'view';

    // Log the activity
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
    next(); // Continue even if logging fails
  }
};

/**
 * Middleware to attach user data to response locals
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.attachUserData = (req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.isAuthenticated = !!req.session.user;
  res.locals.isAdmin = req.session.user?.isAdmin || false;
  next();
}; 