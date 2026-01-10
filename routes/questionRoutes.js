const express = require("express");
const router = express.Router();
const questionController = require("../controllers/questionController");
const { likeQuestion } = require("../controllers/questionController"); // تأكد من استيراد الـ Controller
const authMiddleware = require("../middleware/authMiddleware");
const { checkUsageLimits, updateUsageCount } = require("../middleware/usageLimits");

const {
  getTeacherQuestionsByFilters,
} = require("../controllers/questionController");
const { fetchAIAnswer } = require("../services/aiService");

const {
  getSchoolQuestionsByFilters,
} = require("../controllers/questionController");

const {
  getBooksQuestionsByFilters,
} = require("../controllers/questionController");

// ✅ جلب جميع الأسئلة الخاصة بامتحانات المعلمين فقط
router.get("/get-teacher-questions", questionController.getTeacherQuestions);

// ✅ جلب جميع الأسئلة الخاصة بامتحانات بالمدرسة فقط
router.get("/get-school-questions", questionController.getSchoolQuestions);

// ✅ جلب جميع الأسئلة الخاصة بامتحانات بالمدرسة فقط
router.get("/get-books-questions", questionController.getBooksQuestions);


// ✅ جلب جميع الأسئلة
router.get("/get-all", questionController.getAllQuestions);

// ✅ جلب أسئلة المعلمين بناءً على الصف، الفصل، والمادة
router.get(
  "/get-teacher-questions-by-filters",
  questionController.getTeacherQuestionsByFilters
);

// ✅ جلب أسئلة المعلمين بناءً على الصف، الفصل، والمادة
router.get(
  "/get-school-questions-by-filters",
  questionController.getSchoolQuestionsByFilters
);

// ✅ جلب أسئلة المعلمين بناءً على الصف، الفصل، والمادة
router.get(
  "/get-books-questions-by-filters",
  questionController.getBooksQuestionsByFilters
);

router.get("/get-exam-questions", questionController.getExamQuestions);

// ✅ جلب سؤال معين عبر الـ ID
router.get("/:id", questionController.getQuestionById);

// ✅ إنشاء سؤال جديد مع التحقق من حدود الاشتراك
router.post("/create", 
  authMiddleware, 
  checkUsageLimits('question'), 
  questionController.createQuestion,
  updateUsageCount('question', true)
);

// ✅ إضافة مسار لحذف جميع الأسئلة
router.delete("/delete-all", questionController.deleteAllQuestions);

// ✅ حذف سؤال معين
router.delete("/:id", questionController.deleteQuestion);

// ✅ تسجيل الإعجاب بالسؤال
router.post("/like", likeQuestion);

// ✅ إضافة المسار لاستدعاء الذكاء الاصطناعي
router.post("/ai/answer", async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ message: "❌ السؤال مطلوب." });
    }

    console.log(`📡 طلب الحصول على إجابة من الذكاء الاصطناعي: ${question}`);
    const aiResponse = await fetchAIAnswer(question);
    res.status(200).json({ correctAnswer: aiResponse.correctAnswer });
  } catch (error) {
    console.error("❌ خطأ في استدعاء الذكاء الاصطناعي:", error);
    res.status(500).json({ message: "❌ حدث خطأ أثناء جلب الإجابة.", error });
  }
});

module.exports = router;
