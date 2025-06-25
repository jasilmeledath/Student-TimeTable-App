const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const { getStudentTimetable, getStudentCourses } = require('../controllers/student/timetableController');

// Timetable routes
router.get('/timetable', checkAuth, checkRole('student'), getStudentTimetable);
router.get('/courses', checkAuth, checkRole('student'), getStudentCourses);

module.exports = router; 
 