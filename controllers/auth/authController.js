/**
 * Authentication Controller
 * Handles user authentication, password management, and session control
 * @module controllers/auth/authController
 */

const bcrypt = require('bcryptjs');
const Student = require('../../models/Student');
const ActivityLog = require('../../models/ActivityLog');
const mailer = require('../../helpers/mailer');
const otpGenerator = require('../../helpers/otpGenerator');
const geoLocator = require('../../helpers/geoLocator');
const logger = require('../../helpers/logger');

/**
 * Authenticates a student and creates a session
 * @async
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing login credentials
 * @param {string} req.body.rollNumber - Student's roll number
 * @param {string} req.body.password - Student's password
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Redirects to appropriate page based on authentication result
 */
exports.login = async (req, res) => {
  try {
    const { rollNumber, password } = req.body;
    logger.info('Login attempt', { rollNumber });

    // Validate student credentials
    const student = await Student.findOne({ studentId: rollNumber.toUpperCase() });
    
    if (!student) {
      logger.warn('Login failed: Invalid roll number', { rollNumber });
      req.flash('error_msg', 'Invalid roll number or password');
      return res.redirect('/auth/login');
    }

    const isMatch = await student.comparePassword(password);
    if (!isMatch) {
      logger.warn('Login failed: Invalid password', { rollNumber });
      req.flash('error_msg', 'Invalid roll number or password');
      return res.redirect('/auth/login');
    }

    // Track login location for security
    const ip = req.ip || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress || 
               req.connection.socket.remoteAddress;
    const location = geoLocator.getLocationFromIP(ip);

    // Update student's login metadata
    await student.updateLoginInfo(location);

    // Record login activity
    await ActivityLog.logActivity({
      userId: student._id,
      userType: 'Student',
      action: 'login',
      entityType: 'System',
      location
    });

    // Initialize session with user data
    req.session.user = {
      _id: student._id.toString(),
      studentId: student.studentId,
      name: student.name,
      isFirstLogin: student.isFirstLogin,
      isAdmin: student.isAdmin || false
    };

    logger.info('Login successful', {
      rollNumber,
      studentId: student._id,
      ip,
      location,
      isFirstLogin: student.isFirstLogin,
      isAdmin: student.isAdmin
    });

    // Determine appropriate redirect based on user status
    let redirectUrl = '/student/timetable';
    
    if (student.isFirstLogin) {
      redirectUrl = '/auth/change-password';
      logger.info('Redirecting to password change (first login)', { rollNumber });
      req.flash('warning_msg', 'Please change your default password');
    } else if (student.isAdmin) {
      redirectUrl = '/admin/dashboard';
      logger.info('Redirecting to admin dashboard', { rollNumber });
    } else {
      logger.info('Redirecting to student timetable', { rollNumber });
    }

    return res.redirect(redirectUrl);
  } catch (error) {
    logger.error('Login error:', {
      error: error.message,
      stack: error.stack,
      rollNumber: req.body.rollNumber
    });
    req.flash('error_msg', 'An error occurred during login');
    return res.redirect('/auth/login');
  }
};

/**
 * Updates student's password and marks first login complete
 * @async
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing password data
 * @param {string} req.body.currentPassword - Student's current password
 * @param {string} req.body.newPassword - Student's new password
 * @param {string} req.body.confirmPassword - Confirmation of new password
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Redirects with success or error message
 */
exports.changePassword = async (req, res) => {
  try {
    // Verify session exists
    if (!req.session.user || !req.session.user._id) {
      logger.warn('Password change failed: No session user');
      req.flash('error_msg', 'Please log in to change your password');
      return res.redirect('/auth/login');
    }

    const userId = req.session.user._id;
    logger.info('Password change attempt', { userId });

    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate password confirmation
    if (newPassword !== confirmPassword) {
      logger.warn('Password change failed: Passwords do not match', { userId });
      req.flash('error_msg', 'New passwords do not match');
      return res.redirect('/auth/change-password');
    }

    // Verify student exists
    const student = await Student.findById(userId);
    if (!student) {
      logger.warn('Password change failed: Student not found', { userId });
      req.flash('error_msg', 'Student not found');
      return res.redirect('/auth/login');
    }

    // Verify current password
    const isMatch = await student.comparePassword(currentPassword);
    if (!isMatch) {
      logger.warn('Password change failed: Incorrect current password', { userId });
      req.flash('error_msg', 'Current password is incorrect');
      return res.redirect('/auth/change-password');
    }

    // Update password and first login status
    student.password = newPassword;
    student.isFirstLogin = false;
    await student.save();

    // Update session data
    req.session.user = {
      ...req.session.user,
      isFirstLogin: false,
    };

    // Record password change activity
    await ActivityLog.logActivity({
      userId: student._id,
      userType: 'Student',
      action: 'password_change',
      entityType: 'Student',
      entityId: student._id
    });

    logger.info('Password changed successfully', { userId });
    req.flash('success_msg', 'Password changed successfully');
    res.redirect('/student/timetable');
  } catch (error) {
    logger.error('Password change error:', {
      error: error.message,
      stack: error.stack,
      userId: req.session.user?._id
    });
    req.flash('error_msg', 'An error occurred while changing password');
    res.redirect('/auth/change-password');
  }
};

/**
 * Initiates password reset process by sending OTP
 * @async
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing student info
 * @param {string} req.body.rollNo - Student's roll number
 * @param {string} req.body.email - Student's email address
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Redirects with success or error message
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { rollNo, email } = req.body;

    // Verify student exists with provided credentials
    const student = await Student.findOne({ 
      rollNo: rollNo.toUpperCase(),
      email: email.toLowerCase()
    });

    if (!student) {
      req.flash('error_msg', 'No account found with that roll number and email');
      return res.redirect('/auth/forgot-password');
    }

    // Generate and store OTP
    const otp = otpGenerator.generateOTP();
    student.otpToken = await bcrypt.hash(otp, 10);
    student.otpExpires = otpGenerator.generateExpiryTime(10); // 10 minutes expiry
    await student.save();

    // Send OTP email
    await mailer.sendOTPEmail(student.email, otp);

    req.flash('success_msg', 'Password reset OTP has been sent to your email');
    res.redirect('/auth/reset-password');
  } catch (error) {
    console.error('Forgot password error:', error);
    req.flash('error_msg', 'An error occurred while processing your request');
    res.redirect('/auth/forgot-password');
  }
};

/**
 * Handles password reset with OTP
 * @async
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing reset data
 * @param {string} req.body.rollNo - Student's roll number
 * @param {string} req.body.otp - OTP for password reset
 * @param {string} req.body.newPassword - Student's new password
 * @param {string} req.body.confirmPassword - Confirmation of new password
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Redirects with success or error message
 */
exports.resetPassword = async (req, res) => {
  try {
    const { rollNo, otp, newPassword, confirmPassword } = req.body;

    // Validate password match
    if (newPassword !== confirmPassword) {
      req.flash('error_msg', 'New passwords do not match');
      return res.redirect('/auth/reset-password');
    }

    // Find student
    const student = await Student.findOne({
      rollNo: rollNo.toUpperCase(),
      otpExpires: { $gt: Date.now() }
    });

    if (!student) {
      req.flash('error_msg', 'Invalid or expired OTP');
      return res.redirect('/auth/reset-password');
    }

    // Verify OTP
    const isValidOTP = await bcrypt.compare(otp, student.otpToken);
    if (!isValidOTP) {
      req.flash('error_msg', 'Invalid OTP');
      return res.redirect('/auth/reset-password');
    }

    // Update password
    student.password = newPassword;
    student.otpToken = undefined;
    student.otpExpires = undefined;
    await student.save();

    // Log activity
    await ActivityLog.logActivity({
      userId: student._id,
      userType: 'Student',
      action: 'password_change',
      entityType: 'Student',
      entityId: student._id
    });

    req.flash('success_msg', 'Password has been reset successfully');
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Password reset error:', error);
    req.flash('error_msg', 'An error occurred while resetting password');
    res.redirect('/auth/reset-password');
  }
};

/**
 * Handles logout
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.logout = async (req, res) => {
  try {
    if (req.session.user) {
      // Log activity before destroying session
      await ActivityLog.logActivity({
        userId: req.session.user._id,
        userType: req.session.user.isAdmin ? 'Admin' : 'Student',
        action: 'logout',
        entityType: 'System'
      });
      
      logger.info('Logging out user', {
        userId: req.session.user._id,
        userType: req.session.user.isAdmin ? 'Admin' : 'Student'
      });
    }

    req.session.destroy((err) => {
      if (err) {
        logger.error('Session destruction error:', {
          error: err.message,
          stack: err.stack
        });
        req.flash('error_msg', 'An error occurred during logout');
      }
      res.redirect('/auth/login');
    });
  } catch (error) {
    logger.error('Logout error:', {
      error: error.message,
      stack: error.stack
    });
    req.flash('error_msg', 'An error occurred during logout');
    res.redirect('/auth/login');
  }
}; 