const express = require("express");
const router = express.Router();
const School = require("../models/School");
const schoolController = require("../controllers/schoolController.js"); // ✅ تأكد من الاستيراد الصحيح

// ✅ جلب بيانات المدرسة ولوحة التحكم الخاصة به
router.get("/dashboard/:id", async (req, res) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) {
      return res.status(404).json({ message: "المعلم غير موجود" });
    }

    res.json({
      message: `Dashboard for school ${school._id}`,
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
    console.error("Error fetching school dashboard:", error);
    res.status(500).json({ message: "خطأ في جلب بيانات المدرسة", error });
  }
});

// ✅ تحليل ملفات الامتحانات
router.get("/analyze", schoolController.analyzeExamFile);
router.post("/analyze", schoolController.analyzeExamFile);
module.exports = router;
