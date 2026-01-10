const StudentAnswer = require("../models/StudentAnswer");
const Question = require("../models/Question");
const mongoose = require("mongoose");
const { ObjectId } = require("mongoose").Types; // ✅ استيراد ObjectId لاستخدامه في البحث
const Exam = require("../models/Exam"); // ✅ أضف هذا السطر

// ✅ دالة لتنظيف الإجابة الصحيحة وإزالة أي عبارات غير ضرورية
const cleanCorrectAnswer = (text) =>
  text.replace(/^الإجابة الصحيحة هي:\s*/, "").trim();

// ✅ دالة لتوحيد النصوص عند المقارنة (إزالة المسافات وتحويلها إلى lowercase)
const normalizeText = (text) =>
  text
    ?.trim()
    .toLowerCase()
    .replace(/\s+/g, " ") // إزالة المسافات الزائدة داخل النص
    .replace(/[.,!?،؛ـ]$/, "") // 🔥 إزالة النقطة أو أي علامات زائدة في النهاية
    .replace(/^الإجابة الصحيحة هي:\s*/, "") // 🔥 إزالة النص الزائد من بداية الإجابة الصحيحة
    .normalize("NFD") // إزالة التشكيل والأحرف غير المرئية
    .replace(/[\u064B-\u065F]/g, ""); // إزالة الحركات والتشكيل في العربية

// ✅ تسجيل إجابة الطالب ومعالجة الإجابة الصحيحة
exports.submitAnswer = async (req, res) => {
  try {
    const { userId, examId, questionId, selectedAnswer } = req.body;
    console.log("📡 استدعاء `submitAnswer` في answersController.js...");
    console.log("🆔 examId:", examId);
    console.log("👤 userId:", userId);
    console.log("❓ questionId:", questionId);
    console.log("🔵 الإجابة المختارة:", selectedAnswer);

    // ✅ **التحقق من صحة المدخلات**
    if (!examId || !userId || !questionId || !selectedAnswer) {
      return res.status(400).json({ error: "❌ جميع الحقول مطلوبة!" });
    }

    console.log(`📌 إجابة الطالب:`, {
      userId,
      examId,
      questionId,
      selectedAnswer,
    });

    // ✅ **البحث عن الامتحان لجلب عدد الأسئلة**
    const exam = await Exam.findById(examId).select("questions").lean();
    if (!exam) {
      return res.status(404).json({ error: "❌ الامتحان غير موجود!" });
    }
    const totalQuestions = exam.questions.length; // ✅ حساب عدد الأسئلة

    // ✅ **البحث عن السؤال في قاعدة البيانات**
    const question = await Question.findById({ _id: questionId });

    console.log("📌 السؤال المسترجع من قاعدة البيانات:", question);

    console.log("📡 البيانات المسترجعة من MongoDB:", question);
    console.log(
      "🔍 هل `correctAnswer` موجود؟",
      question?.correctAnswer ? "✅ نعم" : "❌ لا"
    );
    console.log(
      "🔍 هل `correct_answer` موجود؟",
      question?.correct_answer ? "✅ نعم" : "❌ لا"
    );

    if (!question || !question.correctAnswer) {
      console.error("❌ لم يتم العثور على الإجابة الصحيحة في قاعدة البيانات!");
      return res
        .status(500)
        .json({ error: "❌ لم يتم العثور على الإجابة الصحيحة!" });
    }

    // ✅ **تنظيف الإجابة الصحيحة المحفوظة**
    let storedCorrectAnswer = cleanCorrectAnswer(question.correctAnswer.trim());

    // ✅ **التحقق من صحة الإجابة**
    let cleanedSelectedAnswer = normalizeText(selectedAnswer);
    let cleanedCorrectAnswer = normalizeText(storedCorrectAnswer);

    console.log("🔍 مقارنة الإجابات بعد التنظيف:");
    console.log("✅ الإجابة المختارة بعد التنظيف:", cleanedSelectedAnswer);
    console.log("✅ الإجابة الصحيحة بعد التنظيف:", cleanedCorrectAnswer);

    let isCorrect = cleanedSelectedAnswer === cleanedCorrectAnswer;

    console.log(
      "🔵 الإجابة المختارة (بعد التنظيف):",
      normalizeText(selectedAnswer)
    );
    console.log(
      "✅ الإجابة الصحيحة المخزنة (بعد التنظيف):",
      normalizeText(storedCorrectAnswer)
    );
    console.log("🔍 هل الإجابة صحيحة؟", isCorrect);

    // ✅ **احتساب الدرجة (score)**
    const score = isCorrect ? 1 : 0; // ✅ يتم إعطاء درجة واحدة لكل إجابة صحيحة

    // ✅ **حفظ إجابة الطالب في قاعدة البيانات**
    console.log("📡 حفظ الإجابة في قاعدة البيانات...");
    console.log("📌 بيانات الإجابة:", {
      userId,
      examId,
      questionId,
      selectedAnswer,
      isCorrect,
      score,
      totalQuestions,
      correctAnswer: question.correctAnswer,

      explanation: question.explanation || "✔️ إجابة صحيحة!",
    });

    try {
      const studentAnswer = new StudentAnswer({
        userId,
        examId,
        questionId,
        selectedAnswer,
        isCorrect,
        correctAnswer: question.correctAnswer, // ✅ إضافة الإجابة الصحيحة عند حفظ إجابة الطالب
        score, // ✅ إضافة الدرجة
        totalQuestions, // ✅ إضافة عدد الأسئلة
        explanation: question.explanation || "✔️ إجابة صحيحة!",
      });

      await studentAnswer.save();
      console.log("✅ تم تسجيل إجابة الطالب بنجاح!");

      return {
        correct: isCorrect,
        correctAnswer: storedCorrectAnswer, // ✅ تم تنظيف الإجابة الصحيحة
        explanation: question.explanation || "✔️ إجابة صحيحة!",
      };
    } catch (error) {
      console.error("❌ خطأ أثناء تسجيل الإجابة:", error);
      return res.status(500).json({ error: "❌ حدث خطأ أثناء تسجيل الإجابة." });
    }
  } catch (error) {
    console.error("❌ خطأ في submitAnswer:", error);
    return res.status(500).json({ error: "❌ حدث خطأ أثناء إرسال الإجابة." });
  }
};
