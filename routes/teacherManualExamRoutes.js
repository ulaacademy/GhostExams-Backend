const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { checkUsageLimits, updateUsageCount } = require("../middleware/usageLimits");

const {
  createTeacherManualExam,
  getTeacherManualExams,
} = require("../controllers/teacherManualExamController");

// ✅ إضافة middleware للتحقق من حدود الامتحانات قبل إنشاء امتحان يدوي
router.post("/create", 
  authMiddleware, 
  checkUsageLimits('exam'), 
  createTeacherManualExam,
  updateUsageCount('exam', true)
);
router.get("/list", getTeacherManualExams);

module.exports = router;
