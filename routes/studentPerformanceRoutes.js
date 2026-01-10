const express = require("express");
const router = express.Router();
const studentPerformanceController = require("../controllers/studentPerformanceController");

// ✅ التأكد من أن جميع الدوال موجودة قبل استخدامها لمنع الأخطاء
const requiredFunctions = [
  "recordExamResult",
  "getStudentPerformance",
  "compareWithClassmates",
  "suggestRetest",
];

requiredFunctions.forEach((func) => {
  if (!studentPerformanceController[func]) {
    console.error(
      `❌ خطأ: الدالة ${func} غير معرفة في studentPerformanceController.js`
    );
  }
});

router.get(
  "/get-student-performance",
  studentPerformanceController.getStudentPerformance
);

// ✅ تسجيل نتيجة امتحان الطالب
router.post(
  "/record-exam-result",
  studentPerformanceController.recordExamResult
);

// ✅ مقارنة الأداء مع زملاء الصف
router.get(
  "/compare-with-classmates",
  studentPerformanceController.compareWithClassmates
);

// ✅ اقتراح إعادة اختبار للأسئلة غير الصحيحة
router.get("/suggest-retest", studentPerformanceController.suggestRetest);

module.exports = router;
