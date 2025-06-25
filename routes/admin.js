const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin/adminController');
const { checkRole } = require('../middleware/roleMiddleware');
const { activityLogValidation } = require('../middleware/validations/adminValidation');

// Apply admin role check middleware to all routes
router.use(checkRole('admin'));

// Dashboard route
router.get('/dashboard', adminController.getDashboard);

// Activity logs routes
router.get('/activity-logs', activityLogValidation, adminController.getActivityLogs);

// Student details route
router.get('/students/:rollNo', adminController.getStudentDetails);

module.exports = router; 