/**
 * Admin Routes Module
 * Handles administrative functionality including dashboard access,
 * activity monitoring, and student management
 * @module routes/admin
 */

const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin/adminController');
const { checkRole } = require('../middleware/roleMiddleware');
const { activityLogValidation } = require('../middleware/validations/adminValidation');

/**
 * Admin Route Configuration
 * All routes require admin role authorization
 */
router.use(checkRole('admin'));

/**
 * Admin Dashboard
 * GET /admin/dashboard - View administrative overview
 */
router.get('/dashboard', adminController.getDashboard);

/**
 * Activity Monitoring
 * GET /admin/activity-logs - View system activity logs
 * Includes request validation middleware
 */
router.get('/activity-logs', activityLogValidation, adminController.getActivityLogs);

/**
 * Student Management
 * GET /admin/students/:rollNo - View detailed student information
 * Supports lookup by student roll number
 */
router.get('/students/:rollNo', adminController.getStudentDetails);

module.exports = router; 