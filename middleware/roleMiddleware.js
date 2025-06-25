/**
 * Role-based access control middleware
 * @param {string} role - Required role ('admin' or 'student')
 * @returns {Function} Middleware function
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
 * Middleware to ensure user can only access their own resources
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
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
 * Middleware to validate entity ownership for CRUD operations
 * @param {Object} model - Mongoose model to check against
 * @returns {Function} Middleware function
 */
exports.validateEntityOwnership = (model) => {
  return async (req, res, next) => {
    try {
      const entityId = req.params.id || req.body.id;
      if (!entityId) return next();

      const entity = await model.findById(entityId);
      if (!entity) {
        req.flash('error_msg', 'Resource not found');
        return res.redirect('back');
      }

      if (!req.session.user?.isAdmin && 
          entity.studentId && 
          entity.studentId.toString() !== req.session.user._id.toString()) {
        req.flash('error_msg', 'Access denied. You can only modify your own resources.');
        return res.redirect('back');
      }

      req.entity = entity;
      next();
    } catch (error) {
      console.error('Entity ownership validation error:', error);
      req.flash('error_msg', 'An error occurred while validating resource access');
      res.redirect('back');
    }
  };
}; 