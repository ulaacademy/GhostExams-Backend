const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');

// Dashboard overview statistics
router.get('/overview', analyticsController.getDashboardOverview);

// Revenue analytics
router.get('/revenue', analyticsController.getRevenueAnalytics);

// Subscription analytics
router.get('/subscriptions', analyticsController.getSubscriptionAnalytics);

// Exam analytics
router.get('/exams', analyticsController.getExamAnalytics);

// User analytics (teachers & students)
router.get('/users', analyticsController.getUserAnalytics);

// Plan analytics
router.get('/plans', analyticsController.getPlanAnalytics);

// Recent activities
router.get('/activities', analyticsController.getRecentActivities);

module.exports = router;

