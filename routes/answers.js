const express = require("express");
const router = express.Router();
const { submitAnswer } = require("../controllers/answersController"); // ✅ استيراد دالة معالجة الإجابات
const { getAIExplanation } = require("../controllers/aiController"); // ✅ استيراد دالة الذكاء الاصطناعي

// ✅ Middleware لضمان استقبال البيانات بصيغة JSON
router.use(express.json());

// ✅ مسار إرسال إجابة الطالب
router.post("/submit", submitAnswer);

// ✅ مسار منفصل لجلب تفسير الذكاء الاصطناعي عند الحاجة
router.post("/ai-explanation", async (req, res) => {
  try {
    const { questionText, correctAnswer } = req.body;

    if (!questionText) {
      return res.status(400).json({ error: "❌ السؤال مطلوب!" });
    }

    const aiResponse = await getAIExplanation({ questionText, correctAnswer });
    res.json(aiResponse);
  } catch (error) {
    console.error("❌ خطأ في `/ai-explanation`:", error);
    res.status(500).json({ error: "❌ فشل في جلب تفسير الذكاء الاصطناعي." });
  }
});

module.exports = router;
