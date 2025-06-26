/**
 * Student Routes Module
 * Handles student-specific functionality including timetable
 * and course information access
 * @module routes/student
 */

const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const { getStudentTimetable, getStudentCourses } = require('../controllers/student/timetableController');

/**
 * Student Route Configuration
 * All routes require authentication and student role
 * 
 * GET /student/timetable - View personal class schedule
 * GET /student/courses - View enrolled courses list
 */
router.get('/timetable', checkAuth, checkRole('student'), getStudentTimetable);
router.get('/courses', checkAuth, checkRole('student'), getStudentCourses);

module.exports = router; 
 