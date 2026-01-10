// backend/routes/customExamRoutes.js
const express = require("express");
const router = express.Router();

const TeacherCustomExam = require("../models/TeacherCustomExam");
const TeacherExamResult = require("../models/TeacherExamResult");

const {
  createCustomExam,
  getCustomExamById,
  updateCustomExam,
  setCustomExamActive,
  addQuestionToCustomExam,
  updateQuestionInCustomExam,
  deleteQuestionFromCustomExam,
  deleteCustomExam,
} = require("../controllers/customExamController");

// ✅ (1) جلب امتحانات معلم
router.get("/by-teacher/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    if (!teacherId)
      return res.status(400).json({ message: "❌ لم يتم إرسال teacherId" });

    const exams = await TeacherCustomExam.find({ teacherId });
    return res.status(200).json({ exams });
  } catch (error) {
    console.error("❌ خطأ في جلب امتحانات المعلم:", error);
    return res
      .status(500)
      .json({ message: "❌ فشل في جلب امتحانات المعلم", error });
  }
});

// ✅ (2) عدد مرات تقديم الامتحان
router.get("/:examId/students-count", async (req, res) => {
  try {
    const { examId } = req.params;
    const { userId } = req.query; // teacherId
    if (!userId) return res.status(400).json({ message: "❌ userId مفقود." });

    const count = await TeacherExamResult.countDocuments({
      examId,
      teacherId: userId,
    });

    return res.status(200).json({ count });
  } catch (error) {
    console.error("❌ فشل في جلب عدد الطلاب:", error);
    return res.status(500).json({ message: "❌ خطأ داخلي", error });
  }
});

// ✅ (3) تفعيل/إخفاء
router.patch("/:examId/active", setCustomExamActive);

// ✅ (4) تعديل بيانات الامتحان (هنا ينحل 404 تبع تعديل الاسم)
router.patch("/:examId", updateCustomExam);

// ✅ (5) إدارة الأسئلة
router.post("/:examId/questions", addQuestionToCustomExam);
router.patch("/:examId/questions/:questionId", updateQuestionInCustomExam);
router.delete("/:examId/questions/:questionId", deleteQuestionFromCustomExam);

// ✅ (6) حذف امتحان
router.delete("/:examId", deleteCustomExam);

// ✅ (7) جلب امتحان بالـ id (لازم يكون آخر شيء)
router.get("/:examId", getCustomExamById);

module.exports = router;
