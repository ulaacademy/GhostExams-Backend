const express = require("express");
const router = express.Router();
const examGenerationController = require("../controllers/examGenerationController");
const aiExamController = require("../controllers/aiExamController");

// ✅ التأكد من أن جميع الدوال موجودة قبل استخدامها لمنع الأخطاء
const requiredFunctions = [
  "generateAIExam",
  "generateMixedExam",
  "storeGeneratedExam",
  "getGeneratedQuestions",
  "analyzeExams",
  "getAllExams",
  "deleteExam",
  "getExamById", // ✅ التأكد من أن `getExamById` معرف
  "getStudentSimulations",
  "getAllSchoolExams",
  "getAllTeacherExams",
  "getAllBooksExams",
];

requiredFunctions.forEach((func) => {
  if (!examGenerationController[func]) {
    console.error(
      `❌ خطأ: الدالة ${func} غير معرفة في examGenerationController.js`
    );
  }
});

// ✅ تسجيل الطلبات عند استقبالها لمعرفة أيها يصل وأيها لا يصل
router.use((req, res, next) => {
  console.log(`📡 استقبل السيرفر طلب: ${req.method} ${req.originalUrl}`);
  next();
});

// ✅ توليد امتحان ذكاء اصطناعي بناءً على تحليل الكتب والمناهج
router.post("/generate-ai", examGenerationController.generateAIExam);

// ✅ توليد امتحان ممزوج (40% كتب، 30% معلمين، 30% ذكاء اصطناعي)
router.post("/generate-mixed", examGenerationController.generateMixedExam);

// ✅ حفظ الامتحان الذي تم توليده تلقائيًا في قاعدة البيانات
router.post("/store", examGenerationController.storeGeneratedExam);

// ✅ جلب الأسئلة التي تم توليدها من الذكاء الاصطناعي
router.get("/questions", examGenerationController.getGeneratedQuestions);

// ✅ تحليل الامتحانات لاستخراج الأنماط المتكررة
router.post("/analyze", examGenerationController.analyzeExams);

// ✅ جلب جميع الامتحانات المخزنة في قاعدة البيانات
router.get("/all-exams", examGenerationController.getAllExams);

// ✅ جلب جميع امتحانات المدارس
router.get("/get-all-exams/school", examGenerationController.getAllSchoolExams);

// ✅ جلب جميع امتحانات المدارس
router.get("/get-all-exams/books", examGenerationController.getAllBooksExams);

// ✅ جلب جميع امتحانات المعلمين
router.get(
  "/get-all-exams/teacher",
  examGenerationController.getAllTeacherExams
);

// ✅ حذف امتحان معين من قاعدة البيانات عبر الـ ID
router.delete("/delete/:id", examGenerationController.deleteExam);

// ✅ استرجاع جميع الامتحانات (مسار بديل)
router.get("/get-all-exams", (req, res) =>
  res.redirect("/api/exam-generation/all-exams")
);

// ✅ استرجاع بيانات محاكاة الطالب ✅ ✅ ✅ (تم التأكد من عدم وجود خطأ هنا)
router.get(
  "/get-student-simulations",
  examGenerationController.getStudentSimulations
);

// ✅ استرجاع امتحان معين عبر الـ ID
router.get("/get-exam/:id", examGenerationController.getExamById);

// ✅ إضافة المسارات الخاصة بامتحانات الذكاء الاصطناعي
router.post("/generate-ai-exam", aiExamController.generateAIExam); // توليد امتحان ذكاء اصطناعي
//router.post("/generate-mixed-exam", aiExamController.generateMixedAIExam); // توليد امتحان ممزوج من عدة مصادر
router.get("/generated-exams", aiExamController.getGeneratedExams); // جلب الامتحانات المولدة من قاعدة البيانات
router.post("/store-ai-exam", aiExamController.storeGeneratedExam); // تخزين امتحان الذكاء الاصطناعي

module.exports = router;
