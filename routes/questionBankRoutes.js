const express = require("express");
const router = express.Router();
const questionBankController = require("../controllers/questionBankController");

// ✅ التأكد من أن جميع الدوال موجودة قبل استخدامها لمنع الأخطاء
const requiredFunctions = [
  "addQuestion",
  "updateQuestion",
  "deleteQuestion",
  "listQuestions",
  "searchQuestions",
  "analyzeQuestionPatterns",
  "updateQuestionPattern",
];

requiredFunctions.forEach((func) => {
  if (!questionBankController[func]) {
    console.error(
      `❌ خطأ: الدالة ${func} غير معرفة في questionBankController.js`
    );
  }
});

// 🛠️ ضبط المسارات وضمان وجود جميع الدوال
router.post("/add", questionBankController.addQuestion); // إضافة سؤال جديد
router.put("/update/:id", questionBankController.updateQuestion); // تحديث سؤال
router.delete("/delete/:id", questionBankController.deleteQuestion); // حذف سؤال
router.get("/list", questionBankController.listQuestions); // استرجاع قائمة الأسئلة مع الفلترة
router.get("/search", questionBankController.searchQuestions); // البحث عن الأسئلة باستخدام الكلمات المفتاحية
router.get("/analyze-patterns", questionBankController.analyzeQuestionPatterns); // تحليل أنماط الأسئلة
router.post(
  "/update-pattern/:id",
  questionBankController.updateQuestionPattern
); // تحديث بيانات السؤال في `ExamPattern.js`

module.exports = router;
