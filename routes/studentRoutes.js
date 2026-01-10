const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const authMiddleware = require("../middleware/authMiddleware");

// ✅ Debug: Log available controller functions
console.log("📋 Student Controller functions:", Object.keys(studentController));

// ✅ لوحة تحكم الطالب
router.get("/dashboard/:id", studentController.getStudentDashboard);

// ✅ جلب امتحانات المعلم الافتراضي
router.get(
  "/ghost-teacher-exams",
  authMiddleware,
  studentController.getGhostTeacherExams
);

// ✅ جلب المعلمين المشترك معهم الطالب
router.get(
  "/subscribed-teachers",
  authMiddleware,
  studentController.getSubscribedTeachers
);

// ✅ جلب جميع امتحانات المعلمين المشترك معهم الطالب (بما في ذلك Ghost)
// ⚠️ يجب أن يكون قبل المسار المعامل /teacher/:teacherId/exams
router.get(
  "/subscribed-teachers-exams",
  authMiddleware,
  studentController.getStudentSubscribedTeachersExams
);

// ✅ جلب امتحانات معلم معين
router.get(
  "/teacher/:teacherId/exams",
  authMiddleware,
  studentController.getTeacherExamsByStudent
);

module.exports = router;
