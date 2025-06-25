const ActivityLog = require('../../models/ActivityLog');
const dateFormatter = require('../../helpers/dateFormatter');
const Student = require('../../models/Student');
const logger = require('../../helpers/logger');
const timetableHelper = require('../../helpers/timetableHelper');


/**
 * Get timetable view
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getStudentTimetable = async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.user.studentId });
    
    if (!student) {
      req.flash('error_msg', 'Student not found');
      return res.redirect('/auth/login');
    }

    // Get current day and navigation days
    const currentDay = timetableHelper.getCurrentWorkingDay(req.query.day);
    const nextDay = timetableHelper.getNextDay(currentDay);
    const previousDay = timetableHelper.getPreviousDay(currentDay);

    // Get schedule for the day
    const daySchedule = timetableHelper.transformCoursesToSchedule(student.courses, currentDay);
    const fullSchedule = timetableHelper.createFullSchedule(daySchedule);

    res.render('student/timetable', {
      title: 'My Timetable',
      currentDay,
      nextDay,
      previousDay,
      schedule: fullSchedule,
      student: {
        name: student.name,
        studentId: student.studentId,
        department: student.department,
        program: student.program,
        batch: student.batch
      }
    });

  } catch (error) {
    logger.error('Error in getStudentTimetable:', error);
    req.flash('error_msg', 'Error loading timetable');
    res.redirect('/auth/login');
  }
};

/**
 * Get student courses
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getStudentCourses = async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.user.studentId });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const courses = student.courses.map(course => ({
      courseCode: course.courseCode,
      courseName: course.courseName,
      faculty: course.faculty,
      venue: course.venue,
      schedule: Object.entries(course.schedule).reduce((acc, [day, periods]) => {
        acc[day] = periods;
        return acc;
      }, {})
    }));

    res.json({
      success: true,
      data: courses
    });

  } catch (error) {
    logger.error('Error in getStudentCourses:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get subjects
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSubjects = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const subjects = student.courses.map(course => ({
      courseCode: course.courseCode,
      courseName: course.courseName,
      faculty: course.faculty,
      venue: course.venue
    }));

    res.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Add new period
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.addPeriod = async (req, res) => {
  try {
    const {
      subjectId,
      facultyId,
      venueId,
      day,
      startTime,
      endTime
    } = req.body;

    // Create new period
    const period = await Period.create({
      studentId: req.session.user._id,
      subjectId,
      facultyId,
      venueId,
      day,
      startTime,
      endTime
    });

    // Log activity
    await ActivityLog.logActivity({
      userId: req.session.user._id,
      userType: 'Student',
      action: 'create',
      entityType: 'Period',
      entityId: period._id,
      details: {
        subject: subjectId,
        day,
        time: `${startTime}-${endTime}`
      }
    });

    req.flash('success_msg', 'Period added successfully');
    res.redirect('/student/timetable');
  } catch (error) {
    console.error('Add period error:', error);
    req.flash('error_msg', error.message || 'Error adding period');
    res.redirect('/student/timetable');
  }
};

/**
 * Update existing period
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updatePeriod = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      subjectId,
      facultyId,
      venueId,
      day,
      startTime,
      endTime
    } = req.body;

    // Find and update period
    const period = await Period.findOneAndUpdate(
      {
        _id: id,
        studentId: req.session.user._id
      },
      {
        subjectId,
        facultyId,
        venueId,
        day,
        startTime,
        endTime
      },
      { new: true, runValidators: true }
    );

    if (!period) {
      req.flash('error_msg', 'Period not found');
      return res.redirect('/student/timetable');
    }

    // Log activity
    await ActivityLog.logActivity({
      userId: req.session.user._id,
      userType: 'Student',
      action: 'update',
      entityType: 'Period',
      entityId: period._id,
      details: {
        subject: subjectId,
        day,
        time: `${startTime}-${endTime}`
      }
    });

    req.flash('success_msg', 'Period updated successfully');
    res.redirect('/student/timetable');
  } catch (error) {
    console.error('Update period error:', error);
    req.flash('error_msg', error.message || 'Error updating period');
    res.redirect('/student/timetable');
  }
};

/**
 * Delete period
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deletePeriod = async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete period
    const period = await Period.findOneAndDelete({
      _id: id,
      studentId: req.session.user._id
    });

    if (!period) {
      return res.status(404).json({ error: 'Period not found' });
    }

    // Log activity
    await ActivityLog.logActivity({
      userId: req.session.user._id,
      userType: 'Student',
      action: 'delete',
      entityType: 'Period',
      entityId: period._id,
      details: {
        subject: period.subjectId,
        day: period.day,
        time: `${period.startTime}-${period.endTime}`
      }
    });

    res.json({ message: 'Period deleted successfully' });
  } catch (error) {
    console.error('Delete period error:', error);
    res.status(500).json({ error: 'Error deleting period' });
  }
};

/**
 * Get period details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getPeriodDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Find period with populated references
    const period = await Period.findOne({
      _id: id,
      studentId: req.session.user._id
    })
    .populate('subjectId', 'name color')
    .populate('facultyId', 'name email department')
    .populate('venueId', 'building roomNumber capacity');

    if (!period) {
      return res.status(404).json({ error: 'Period not found' });
    }

    // Format period details
    const periodDetails = {
      id: period._id,
      subject: {
        id: period.subjectId._id,
        name: period.subjectId.name,
        color: period.subjectId.color
      },
      faculty: {
        id: period.facultyId._id,
        name: period.facultyId.name,
        email: period.facultyId.email,
        department: period.facultyId.department
      },
      venue: {
        id: period.venueId._id,
        name: `${period.venueId.building} - ${period.venueId.roomNumber}`,
        capacity: period.venueId.capacity
      },
      day: period.day,
      startTime: period.startTime,
      endTime: period.endTime,
      duration: dateFormatter.formatDuration(period.startTime, period.endTime)
    };

    res.json(periodDetails);
  } catch (error) {
    console.error('Get period details error:', error);
    res.status(500).json({ error: 'Error fetching period details' });
  }
}; 