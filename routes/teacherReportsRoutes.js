const express = require('express');
const router = express.Router();
const teacherReportsController = require('../controllers/teacherReportsController');
const authMiddleware = require('../middleware/authMiddleware');

// ✅ جلب جميع تقارير المعلم
router.get('/reports', authMiddleware, teacherReportsController.getTeacherReports);

// ✅ جلب تقرير تفصيلي لامتحان واحد
router.get('/reports/:examId', authMiddleware, teacherReportsController.getExamDetailedReport);

module.exports = router;

