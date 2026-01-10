const express = require("express");
const router = express.Router();
const simulationExamController = require("../controllers/simulationExamController");

// ✅ التأكد من أن جميع الدوال موجودة قبل استخدامها لمنع الأخطاء
const requiredFunctions = [
  "analyzeMinistryExams",
  "generateSimulationExam",
  "getMinistryExam",
  "predictFutureMinistryExam",
];

requiredFunctions.forEach((func) => {
  if (!simulationExamController[func]) {
    console.error(
      `❌ خطأ: الدالة ${func} غير معرفة في simulationExamController.js`
    );
  }
});

// 🛠️ ضبط المسارات وضمان وجود جميع الدوال
router.post("/analyze", simulationExamController.analyzeMinistryExams); // تحليل الامتحانات الوزارية
router.get("/generate", simulationExamController.generateSimulationExam); // توليد امتحان وزاري محاكي
router.get("/exam", simulationExamController.getMinistryExam); // جلب امتحان وزاري سابق
router.get("/predict", simulationExamController.predictFutureMinistryExam); // توقع الامتحانات الوزارية القادمة

module.exports = router;
