/**
 * Role-Based Access Control (RBAC) Middleware Module
 * Provides middleware functions for role-based authorization and
 * resource ownership validation
 * @module middleware/roleMiddleware
 */

/**
 * Creates middleware for role-based access control
 * Verifies user has required role permissions
 * Redirects unauthorized access attempts to appropriate pages
 * 
 * @param {string} role - Required role ('admin' or 'student')
 * @returns {Function} Middleware function that checks role authorization
 * @throws {Error} If role validation fails
 */
exports.checkRole = (role) => {
  return (req, res, next) => {
    const user = req.session.user;
    if (!user) {
      req.flash('error_msg', 'Please log in to access this resource.');
      return res.redirect('/auth/login');
    }

    if (role === 'admin' && !user.isAdmin) {
      req.flash('error_msg', 'Access denied. Admin privileges required.');
      return res.redirect('/student/timetable');
    }

    if (role === 'student' && user.isAdmin) {
      req.flash('error_msg', 'Access denied. Student account required.');
      return res.redirect('/admin/dashboard');
    }

    next();
  };
};

/**
 * Validates user's ownership of requested resources
 * Ensures users can only access their own data
 * Allows admin users to bypass ownership check
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
exports.checkResourceOwnership = (req, res, next) => {
  const resourceId = req.params.studentId || req.body.studentId;
  
  if (!req.session.user?.isAdmin && 
      resourceId && 
      resourceId !== req.session.user._id.toString()) {
    req.flash('error_msg', 'Access denied. You can only access your own resources.');
    return res.redirect('/student/timetable');
  }
  next();
};

/**
 * Creates middleware for database entity ownership validation
 * Verifies user has permission to perform CRUD operations on entities
 * Attaches validated entity to request object for downstream use
 * 
 * @param {Object} model - Mongoose model to validate against
 * @returns {Function} Middleware function that validates entity ownership
 * @throws {Error} If entity lookup or validation fails
 */
exports.validateEntityOwnership = (model) => {
  return async (req, res, next) => {
    try {
      const entityId = req.params.id || req.body.id;
      if (!entityId) return next();

      // Retrieve and validate entity exists
      const entity = await model.findById(entityId);
      if (!entity) {
        req.flash('error_msg', 'Resource not found');
        return res.redirect('back');
      }

      // Check ownership unless user is admin
      if (!req.session.user?.isAdmin && 
          entity.studentId && 
          entity.studentId.toString() !== req.session.user._id.toString()) {
        req.flash('error_msg', 'Access denied. You can only modify your own resources.');
        return res.redirect('back');
      }

      // Attach validated entity to request
      req.entity = entity;
      next();
    } catch (error) {
      console.error('Entity ownership validation error:', error);
      req.flash('error_msg', 'An error occurred while validating resource access');
      res.redirect('back');
    }
  };
}; 