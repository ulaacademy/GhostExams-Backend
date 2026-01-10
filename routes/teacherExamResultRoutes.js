const express = require("express");
const router = express.Router();
const { submitTeacherExamResult } = require("../controllers/teacherExamResultController");
const { getStudentReportForTeacher } = require("../controllers/teacherExamResultController");

// 🔥 راوتر تسجيل نتيجة امتحان المعلم
router.post("/submit", submitTeacherExamResult);
router.get("/:teacherId/:studentId", getStudentReportForTeacher);

module.exports = router;
