/**
 * Admin Routes Module
 * Handles administrative functionality including dashboard access,
 * activity monitoring, and student management
 * @module routes/admin
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

// Controllers
const adminController = require('../controllers/admin/adminController');
const studentController = require('../controllers/admin/studentController');

// Middleware
const { isAdmin, isAuthenticated } = require('../middleware/authMiddleware');
const { validateAdmin } = require('../middleware/validations/adminValidation');

/**
 * Authentication Routes
 */
router.get('/login', adminController.getLoginPage);

router.post('/login', [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').trim().notEmpty().withMessage('Password is required'),
    validateAdmin
], adminController.login);

router.get('/logout', isAuthenticated, adminController.logout);

/**
 * Protected Admin Routes
 * All routes below this point require authentication
 */
router.use(isAuthenticated);
router.use(isAdmin);

/**
 * Admin Dashboard
 * GET /admin/dashboard - View administrative overview
 */
router.get('/dashboard', adminController.getDashboard);

/**
 * Student Management
 * GET /admin/students - View all students
 * GET /admin/students/add - Get form to add a new student
 * POST /admin/students/add - Add a new student
 * GET /admin/students/:id - View detailed student information
 * PUT /admin/students/:id - Update student information
 * DELETE /admin/students/:id - Delete a student
 * POST /admin/students/:id/block - Block a student
 * POST /admin/students/:id/unblock - Unblock a student
 */
router.get('/students', studentController.getAllStudents);
router.get('/students/add', studentController.getAddStudentForm);
router.post('/students/add', [
    body('rollNumber').trim().notEmpty().withMessage('Roll number is required'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Valid email is required'),
    validateAdmin
], studentController.addStudent);
router.get('/students/:id', studentController.getStudentDetails);
router.put('/students/:id', studentController.updateStudent);
router.delete('/students/:id', studentController.deleteStudent);
router.post('/students/:id/block', studentController.blockStudent);
router.post('/students/:id/unblock', studentController.unblockStudent);

/**
 * Activity Monitoring
 * GET /admin/activity-logs - View system activity logs
 * GET /admin/activity-logs/export - Export activity logs as CSV
 */
router.get('/activity-logs', adminController.getActivityLogs);
router.get('/activity-logs/export', adminController.exportActivityLogs);

/**
 * Tickets
 * GET /admin/tickets - View all tickets
 * GET /admin/tickets/:id - View details of a specific ticket
 * PUT /admin/tickets/:id - Update a ticket
 * POST /admin/tickets/:id/resolve - Resolve a ticket
 */
router.get('/tickets', adminController.getTickets);
router.get('/tickets/:id', adminController.getTicketDetails);
router.put('/tickets/:id', adminController.updateTicket);
router.post('/tickets/:id/resolve', adminController.resolveTicket);

/**
 * Feedback
 * GET /admin/feedback - View all feedback
 * POST /admin/feedback/:id/respond - Respond to a feedback
 */
router.get('/feedback', adminController.getFeedback);
router.post('/feedback/:id/respond', adminController.respondToFeedback);

/**
 * Settings
 * GET /admin/settings - View settings
 * POST /admin/settings - Update settings
 */
router.get('/settings', adminController.getSettings);
router.post('/settings', adminController.updateSettings);

module.exports = router; 