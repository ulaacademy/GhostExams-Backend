const express = require("express");
const router = express.Router();
const aiExamController = require("../controllers/aiExamController");

// ✅ التأكد من أن جميع الدوال موجودة قبل استخدامها لمنع الأخطاء
const requiredFunctions = [
  "analyzeExams",
  "generateAIExam",
  "storeGeneratedExam",
  "getGeneratedExams",
];

let missingFunctions = [];

requiredFunctions.forEach((func) => {
  if (!aiExamController[func]) {
    missingFunctions.push(func);
  }
});

// ✅ طباعة تحذير في حالة وجود دوال غير معرفة
if (missingFunctions.length > 0) {
  console.error(
    `❌ [AI Exam Routes] الدوال التالية غير معرفة في aiExamController.js: ${missingFunctions.join(
      ", "
    )}`
  );
} else {
  console.log("✅ [AI Exam Routes] جميع الدوال متوفرة وجاهزة للاستخدام.");
}

// 🛠️ ضبط المسارات وضمان وجود جميع الدوال
router.post("/analyze", aiExamController.analyzeExams); // 🔍 تحليل الامتحانات واستخراج الأنماط المتكررة
router.post("/generate-ai", aiExamController.generateAIExam); // 🤖 توليد امتحان ذكاء اصطناعي
router.post("/store-exam", aiExamController.storeGeneratedExam); // 📥 تخزين امتحان تم توليده
router.get("/exams", aiExamController.getGeneratedExams); // 📥 جلب الامتحانات المولدة

module.exports = router;
