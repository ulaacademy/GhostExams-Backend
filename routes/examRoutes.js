const express = require("express");
const router = express.Router();
const path = require("path");
const authMiddleware = require("../middleware/authMiddleware");
const {
  checkUsageLimits,
  updateUsageCount,
} = require("../middleware/usageLimits");
console.log(
  "📂 تحميل `examController.js` من:",
  path.resolve(__dirname, "../controllers/examController")
);
const examController = require("../controllers/examController");
console.log("✅ examController:", examController);
const aiExamController = require("../controllers/aiExamController");
const aiController = require("../controllers/aiController");
const mixedExamController = require("../controllers/mixedExamController");
const ministryExamController = require("../controllers/ministryExamController");
const ministryExamRoutes = require("./ministryExamRoutes");
const ghostExamController = require("../controllers/ghostExamController");
const {
  createTeacherExam,
  getTeacherCustomExams,
  setTeacherCustomExamActive,
} = require("../controllers/teacherExamController");

// ✅ التأكد من أن جميع الدوال المطلوبة موجودة في examController
const requiredFunctions = [
  "createExam",
  "getAllExams",
  "getAIExams",
  "getTeacherExams",
  "getSchoolExams",
  "getBooksExams",
  "getExamById",
  "getExamQuestions", // ✅ تأكيد إضافة هذه الدالة
  "generateTeacherExam", // ✅ إضافة هنا
  "generateBooksExam", // ✅ إضافة هنا
  "generateSchoolExam", // ✅ إضافة هنا
  "addQuestionToExam",
  "deleteExam",
  "submitExam",
  "getUserExamResults",
  "getLatestExamResult",
  "generateMixedAIExam",
  "getMixedExams",
];

requiredFunctions.forEach((func) => {
  if (!examController[func]) {
    console.error(`❌ خطأ: الدالة ${func} غير معرفة في examController.js`);
  }
});

// ✅ التحقق من أن جميع الدوال المطلوبة موجودة في aiExamController
const aiRequiredFunctions = [
  "analyzeExams",
  "generateAIExam",
  "storeGeneratedExam",
  "getGeneratedQuestions",
];

aiRequiredFunctions.forEach((func) => {
  if (!aiExamController[func]) {
    console.error(`❌ خطأ: الدالة ${func} غير معرفة في aiExamController.js`);
  }
});

// ===================== 📝 مسارات إدارة الامتحانات =====================

// ✅ إنشاء امتحان جديد
router.post("/create", examController.createExam);

// ✅ جلب جميع الامتحانات
router.get("/", examController.getAllExams);

// ✅ جلب امتحانات الذكاء الاصطناعي المخزنة
router.get("/ai", examController.getAIExams);

// ✅ جلب امتحانات المعلمين
router.get("/teacher", examController.getTeacherExams);

// ✅ جلب الامتحانات المدرسية
router.get("/school", examController.getSchoolExams);

// ✅ جلب الامتحانات المدرسية
router.get("/books", examController.getBooksExams);

router.get("/mixed", mixedExamController.getMixedExams);

// ✅ جلب امتحانات Ghost Examinations
router.get("/ghost", ghostExamController.getGhostExams);

router.use("/exams/ministry", ministryExamRoutes);

// ✅ جلب امتحان Ghost عبر ID (يجب أن يكون قبل الـ routes العامة)
router.get("/get-exam/ghost/:examId", ghostExamController.getGhostExamById);

router.get("/get-exam/teacher/:examId", examController.getExamById);

router.get("/get-exam/school/:examId", examController.getExamById);

router.get("/get-exam/books/:examId", examController.getExamById);

router.get("/get-exam/mixed/:examId", mixedExamController.getMixedExamById);

// ✅ جلب امتحان وزاري عبر ID
router.get(
  "/get-exam/ministry/:examId",
  ministryExamController.getMinistryExam
);

// ✅ جلب امتحان عام عبر ID (يجب أن يكون آخر route)
router.get("/get-exam/:examId", examController.getExamById);

// ✅ جلب امتحان وزاري معين
router.get("/get-ministry-exam", ministryExamController.getMinistryExam);

// ✅ تسجيل نتيجة الامتحان
router.post("/submit", examController.submitExam);

//router.get("/latest-result/:userId", examController.getLatestExamResult);

// ✅ جلب نتائج الامتحانات للطالب
router.get("/results/:userId", examController.getUserExamResults);

// ✅ جلب نتيجة آخر امتحان للطالب
router.get("/latest-result/:userId", examController.getLatestExamResult);

// ✅ جلب امتحان محدد عبر الـ ID
router.get("/get-exam-by-id/:id", examController.getExamById);

// ✅ جلب امتحان عبر ID
router.get("/get-exam/:examId", examController.getExamQuestions);

// ✅ توليد امتحان معلمين جديد عند الطلب
router.post("/generate-teacher-exam", examController.generateTeacherExam);

// ✅ توليد امتحان معلمين جديد عند الطلب
router.post("/generate-school-exam", examController.generateSchoolExam);

// ✅ توليد امتحان معلمين جديد عند الطلب
router.post("/generate-books-exam", examController.generateBooksExam);

// ✅ إنشاء امتحان مختلط عند الطلب
router.post("/generate-mixed-exam", mixedExamController.generateMixedAIExam);

// ✅ إضافة سؤال إلى امتحان معين
router.post("/:examId/add-question", examController.addQuestionToExam);

console.log("📩 تم الوصول إلى الراوتر teacher-custom-exam");
// ✅ إضافة middleware للتحقق من حدود الامتحانات قبل إنشاء امتحان جديد
router.post(
  "/custom-exams/create",
  authMiddleware,
  checkUsageLimits("exam"),
  createTeacherExam,
  updateUsageCount("exam", true)
);
router.patch(
  "/custom-exams/:examId/active",
  authMiddleware,
  setTeacherCustomExamActive
);

router.get("/custom-exams/all", getTeacherCustomExams);

// ✅ حذف امتحان
router.delete("/:id", examController.deleteExam);

// ===================== 🤖 مسارات توليد الامتحانات الذكية =====================

router.post("/generate-explanation", aiController.generateExplanation);

// ✅ تحليل الامتحانات لاستخراج الأنماط
router.post("/ai/analyze-exams", aiExamController.analyzeExams);

// ✅ توليد امتحان ذكاء اصطناعي بناءً على أنماط البيانات
router.post("/ai/generate", aiExamController.generateAIExam);

// ✅ حفظ امتحان مولد إلى قاعدة البيانات
router.post("/ai/store", aiExamController.storeGeneratedExam);

// ✅ جلب الأسئلة التي تم توليدها بواسطة الذكاء الاصطناعي
router.get("/ai/questions", aiExamController.getGeneratedQuestions);

// ===================== 👻 مسارات Ghost Examinations (Admin Only) =====================

// ✅ إنشاء امتحان Ghost جديد (Admin only)
router.post(
  "/ghost/create",
  authMiddleware,
  ghostExamController.createGhostExam
);

// ✅ تحديث امتحان Ghost (Admin only)
router.put(
  "/ghost/:examId",
  authMiddleware,
  ghostExamController.updateGhostExam
);

// ✅ حذف امتحان Ghost (Admin only)
router.delete(
  "/ghost/:examId",
  authMiddleware,
  ghostExamController.deleteGhostExam
);

module.exports = router;
