const Student = require('../../models/Student');
const ActivityLog = require('../../models/ActivityLog');
const geoLocator = require('../../helpers/geoLocator');
const dateFormatter = require('../../helpers/dateFormatter');

/**
 * Render admin dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getDashboard = async (req, res) => {
  try {
    // Get all students with their last login info
    const students = await Student.find()
      .select('rollNo name email lastLoginTime lastLocation')
      .sort({ lastLoginTime: -1 });

    // Get activity counts for each student
    const activitySummaries = await Promise.all(
      students.map(async (student) => {
        const summary = await ActivityLog.getUserActivitySummary(student._id);
        return {
          ...student.toObject(),
          lastLoginFormatted: student.lastLoginTime ? 
            dateFormatter.getRelativeTime(student.lastLoginTime) : 'Never',
          location: student.lastLocation ? 
            geoLocator.formatLocation(student.lastLocation) : 'Unknown',
          activitySummary: summary
        };
      })
    );

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      students: activitySummaries
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    req.flash('error_msg', 'Error loading dashboard data');
    res.redirect('/');
  }
};

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