const express = require("express");
const router = express.Router();
const Teacher = require("../models/Teacher");
const teacherController = require("../controllers/teacherController.js"); // ✅ تأكد من الاستيراد الصحيح

// ✅ جلب بيانات المعلم ولوحة التحكم الخاصة به
router.get("/dashboard/:id", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ message: "المعلم غير موجود" });
    }

    res.json({
      message: `Dashboard for teacher ${teacher._id}`,
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
    console.error("Error fetching teacher dashboard:", error);
    res.status(500).json({ message: "خطأ في جلب بيانات المعلم", error });
  }
});

// ✅ تحليل ملفات الامتحانات
router.get("/analyze", teacherController.analyzeExamFile);
router.post("/analyze", teacherController.analyzeExamFile);
module.exports = router;
