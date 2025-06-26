/**
 * Authentication Middleware Module
 * Provides middleware functions for authentication, session management,
 * and user activity logging
 * @module middleware/authMiddleware
 */

const geoip = require('geoip-lite');
const ActivityLog = require('../models/ActivityLog');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Admin = require('../models/Admin');

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

/**
 * Verify JWT token and attach user to request
 */
exports.isAuthenticated = async (req, res, next) => {
    try {
        // Check for student token
        const studentToken = req.cookies.token;
        // Check for admin token
        const adminToken = req.cookies.adminToken;

        if (!studentToken && !adminToken) {
            return res.redirect('/auth/login');
        }

        try {
            if (adminToken) {
                // Verify admin token
                const decoded = jwt.verify(adminToken, process.env.JWT_SECRET);
                const admin = await Admin.findById(decoded.id)
                    .select('-password');

                if (!admin || admin.status !== 'active') {
                    res.clearCookie('adminToken');
                    return res.redirect('/admin/login');
                }

                req.admin = admin;
                req.userType = 'admin';
                return next();
            }

            if (studentToken) {
                // Verify student token
                const decoded = jwt.verify(studentToken, process.env.JWT_SECRET);
                const student = await Student.findById(decoded.id)
                    .select('-password');

                if (!student || student.status !== 'active') {
                    res.clearCookie('token');
                    return res.redirect('/auth/login');
                }

                req.student = student;
                req.userType = 'student';
                return next();
            }
        } catch (err) {
            // Clear cookies on token verification failure
            res.clearCookie('token');
            res.clearCookie('adminToken');
            return res.redirect('/auth/login');
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).render('errors/500');
    }
};

/**
 * Check if user is an admin
 */
exports.isAdmin = (req, res, next) => {
    if (req.userType !== 'admin') {
        return res.status(403).render('errors/403', {
            message: 'Access denied. Admin privileges required.'
        });
    }
    next();
};

/**
 * Check if user is a student
 */
exports.isStudent = (req, res, next) => {
    if (req.userType !== 'student') {
        return res.status(403).render('errors/403', {
            message: 'Access denied. Student privileges required.'
        });
    }
    next();
};

/**
 * Check specific admin permissions
 */
exports.hasPermission = (permission) => {
    return (req, res, next) => {
        if (req.userType !== 'admin' || !req.admin.permissions.includes(permission)) {
            return res.status(403).render('errors/403', {
                message: 'Access denied. Insufficient permissions.'
            });
        }
        next();
    };
};

/**
 * Redirect if authenticated
 */
exports.redirectIfAuthenticated = (req, res, next) => {
    const studentToken = req.cookies.token;
    const adminToken = req.cookies.adminToken;

    if (adminToken) {
        return res.redirect('/admin/dashboard');
    }

    if (studentToken) {
        return res.redirect('/student/timetable');
    }

    next();
}; 