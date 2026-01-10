const express = require("express");
const router = express.Router();
const Books = require("../models/Books");
const booksController = require("../controllers/booksController.js"); // ✅ تأكد من الاستيراد الصحيح

// ✅ جلب بيانات المدرسة ولوحة التحكم الخاصة به
router.get("/dashboard/:id", async (req, res) => {
  try {
    const books = await Books.findById(req.params.id);
    if (!books) {
      return res.status(404).json({ message: "المعلم غير موجود" });
    }

    res.json({
      message: `Dashboard for books ${books._id}`,
      data: {
        createdExams: [
          { id: 1, title: "اختبار الرياضيات الوحدة الأولى", students: 25 },
          { id: 2, title: "اختبار الإنجليزي القراءة", students: 15 },
        ],
        feedback: [
          "طلابك حققوا أداءً جيدًا في الوحدة الأولى.",
          "هناك حاجة لتحسين فهم الطلاب لقواعد اللغة الإنجليزية.",
        ],
      },
    });
  } catch (error) {
    console.error("Error fetching books dashboard:", error);
    res.status(500).json({ message: "خطأ في جلب بيانات المدرسة", error });
  }
});

// ✅ تحليل ملفات الامتحانات
router.get("/analyze", booksController.analyzeExamFile);
router.post("/analyze", booksController.analyzeExamFile);
module.exports = router;
