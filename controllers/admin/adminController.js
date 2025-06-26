const Admin = require('../../models/Admin');
const Student = require('../../models/Student');
const ActivityLog = require('../../models/ActivityLog');
const geoLocator = require('../../helpers/geoLocator');
const dateFormatter = require('../../helpers/dateFormatter');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

/**
 * Admin Authentication Controllers
 */
exports.getLoginPage = (req, res) => {
    res.render('auth/admin-login', {
        layout: 'auth',
        title: 'Admin Login'
    });
};

exports.login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;

        // Find admin by username
        const admin = await Admin.findOne({ username });
        
        if (!admin) {
            return res.status(401).json({
                error: 'Invalid credentials'
            });
        }

        // Check if account is locked
        if (admin.isLocked) {
            return res.status(423).json({
                error: 'Account is temporarily locked. Please try again later.'
            });
        }

        // Check password
        const isMatch = await admin.comparePassword(password);
        
        if (!isMatch) {
            await admin.incrementLoginAttempts();
            
            return res.status(401).json({
                error: 'Invalid credentials'
            });
        }

        // Reset login attempts on successful login
        await admin.resetLoginAttempts();

        // Update last login
        admin.lastLogin = new Date();
        await admin.save();

        // Create JWT token
        const token = jwt.sign(
            { 
                id: admin._id,
                role: admin.role,
                permissions: admin.permissions
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Log activity
        await ActivityLog.logActivity({
            userId: admin._id,
            userType: 'Admin',
            action: 'login',
            entityType: 'System',
            details: {
                browser: req.headers['user-agent']
            }
        });

        // Set cookie
        res.cookie('adminToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        res.json({ success: true });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

exports.logout = async (req, res) => {
    try {
        // Log activity
        await ActivityLog.logActivity({
            userId: req.admin.id,
            userType: 'Admin',
            action: 'logout',
            entityType: 'System'
        });

        res.clearCookie('adminToken');
        res.redirect('/admin/login');
    } catch (error) {
        console.error('Admin logout error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

/**
 * Dashboard Controllers
 */
exports.getDashboard = async (req, res) => {
    try {
        // Fetch dashboard data
        const [
            totalStudents,
            activeSessions,
            pendingTickets,
            recentActivities,
            recentTickets
        ] = await Promise.all([
            Student.countDocuments(),
            ActivityLog.countDocuments({
                action: 'login',
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }),
            // Add your Ticket model query here
            ActivityLog.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('userId'),
            // Add your Ticket model query here for recent tickets
        ]);

        res.render('admin/dashboard', {
            layout: 'admin',
            title: 'Admin Dashboard',
            totalStudents,
            activeSessions,
            pendingTickets: pendingTickets || 0,
            recentActivities: recentActivities.map(activity => ({
                icon: getActivityIcon(activity.action),
                description: formatActivityDescription(activity),
                timestamp: activity.createdAt,
                type: activity.action
            })),
            recentTickets: recentTickets || []
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).render('errors/500');
    }
};

/**
 * Helper Functions
 */
function getActivityIcon(action) {
    const icons = {
        login: 'fa-sign-in-alt',
        logout: 'fa-sign-out-alt',
        create: 'fa-plus',
        update: 'fa-edit',
        delete: 'fa-trash',
        view: 'fa-eye'
    };
    return icons[action] || 'fa-circle';
}

function formatActivityDescription(activity) {
    const actions = {
        login: 'logged in',
        logout: 'logged out',
        create: 'created',
        update: 'updated',
        delete: 'deleted',
        view: 'viewed'
    };

    const action = actions[activity.action];
    const userType = activity.userType.toLowerCase();
    const entityType = activity.entityType.toLowerCase();

    return `${activity.userId.name} ${action} ${entityType}`;
}

/**
 * Get activity logs with filters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getActivityLogs = async (req, res) => {
  try {
    const { 
      rollNo,
      action,
      entityType,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    // Build query
    const query = {};
    
    if (rollNo) {
      const student = await Student.findOne({ rollNo: rollNo.toUpperCase() });
      if (student) {
        query.userId = student._id;
      }
    }
    
    if (action) {
      query.action = action;
    }
    
    if (entityType) {
      query.entityType = entityType;
    }
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get total count for pagination
    const total = await ActivityLog.countDocuments(query);
    
    // Get logs with pagination
    const logs = await ActivityLog.find(query)
      .populate('userId', 'rollNo name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Format logs for display
    const formattedLogs = logs.map(log => ({
      ...log.toObject(),
      timeAgo: dateFormatter.getRelativeTime(log.createdAt),
      location: log.location ? geoLocator.formatLocation(log.location) : 'Unknown'
    }));

    // If it's an AJAX request, send JSON
    if (req.xhr) {
      return res.json({
        logs: formattedLogs,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      });
    }

    // Otherwise render the full page
    res.render('admin/activity-logs', {
      title: 'Activity Logs',
      logs: formattedLogs,
      filters: {
        rollNo,
        action,
        entityType,
        startDate,
        endDate
      },
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Activity logs error:', error);
    if (req.xhr) {
      return res.status(500).json({ error: 'Error loading activity logs' });
    }
    req.flash('error_msg', 'Error loading activity logs');
    res.redirect('/admin/dashboard');
  }
};

/**
 * Get student details with activity summary
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getStudentDetails = async (req, res) => {
  try {
    const { rollNo } = req.params;

    // Get student details
    const student = await Student.findOne({ rollNo: rollNo.toUpperCase() })
      .select('-password -otpToken -otpExpires');

    if (!student) {
      if (req.xhr) {
        return res.status(404).json({ error: 'Student not found' });
      }
      req.flash('error_msg', 'Student not found');
      return res.redirect('/admin/dashboard');
    }

    // Get activity summary
    const activitySummary = await ActivityLog.getUserActivitySummary(student._id);

    // Get recent activities
    const recentActivities = await ActivityLog.find({ userId: student._id })
      .sort({ createdAt: -1 })
      .limit(10);

    const studentDetails = {
      ...student.toObject(),
      lastLoginFormatted: student.lastLoginTime ? 
        dateFormatter.getRelativeTime(student.lastLoginTime) : 'Never',
      location: student.lastLocation ? 
        geoLocator.formatLocation(student.lastLocation) : 'Unknown',
      coordinates: student.lastLocation ? 
        geoLocator.getCoordinates(student.lastLocation) : null,
      activitySummary,
      recentActivities: recentActivities.map(activity => ({
        ...activity.toObject(),
        timeAgo: dateFormatter.getRelativeTime(activity.createdAt)
      }))
    };

    if (req.xhr) {
      return res.json(studentDetails);
    }

    res.render('admin/student-details', {
      title: `Student Details - ${student.name}`,
      student: studentDetails
    });
  } catch (error) {
    console.error('Student details error:', error);
    if (req.xhr) {
      return res.status(500).json({ error: 'Error loading student details' });
    }
    req.flash('error_msg', 'Error loading student details');
    res.redirect('/admin/dashboard');
  }
}; 