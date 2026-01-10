const express = require("express");
const router = express.Router();
const {
  generateMinistryExam,
  getMinistryExam,
  submitStudentAnswer,
  submitExamResult, // ✅ أضف هذا السطر هنا
} = require("../controllers/ministryExamController"); // ✅ تأكد أن الاستيراد صحيح

// ✅ إضافة "/exams/" إلى المسارات لجعلها متناسقة مع باقي الأقسام
router.post("/generate-ministry-exam", generateMinistryExam);
router.get("/get-exam/:examId", getMinistryExam);
router.post("/submit", submitStudentAnswer);
router.post("/submit-exam", submitExamResult); // ✅ الآن سيتم التعرف عليه

module.exports = router;
