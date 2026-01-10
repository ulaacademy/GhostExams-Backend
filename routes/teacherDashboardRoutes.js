// backend/routes/teacherDashboardRoutes.js

const express = require("express");
const router = express.Router();
const {
  getTeacherDashboardMetrics,
  getTeacherStudents,
} = require("../controllers/teacherDashboardController");
const { getTeacherExamsWithResults } = require("../controllers/teacherExamController");
const authMiddleware = require("../middleware/authMiddleware"); // ✅ تأكد من حماية المسار بالتوكن
const { getExamStudentsCount } = require("../controllers/teacherExamController");
const { getTeacherStudentsPerformance } = require("../controllers/teacherDashboardController");
const {
  getStudentReportForTeacher,
} = require("../controllers/teacherExamResultController");


router.get("/custom-exams/with-results", authMiddleware, getTeacherExamsWithResults);
// routes/teacherDashboardRoutes.js
router.post("/students", authMiddleware, getTeacherStudents); // ✅ POST بدل GET
router.get("/dashboard-metrics", authMiddleware, getTeacherDashboardMetrics);
router.get("/exams/:examId/students-count", authMiddleware, getExamStudentsCount);
router.get("/students-performance", authMiddleware, getTeacherStudentsPerformance);
router.get("/student-report/:teacherId/:studentId", authMiddleware, getStudentReportForTeacher);


module.exports = router;
