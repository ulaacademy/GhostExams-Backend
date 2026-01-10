const mongoose = require("mongoose");
const { ObjectId } = require("mongoose").Types; // ✅ استيراد ObjectId لاستخدامه في البحث
const MinistryExam = require("../models/MinistryExam"); // 🔹 جدول الأسئلة المخزنة
const MinistryExamSession = require("../models/MinistryExamSession"); // 🔹 جدول جلسات الامتحان للطلاب
const ExamResult = require("../models/ExamResult");

// ✅ دالة لإنشاء امتحان وزاري عند الطلب وتخزينه في `MinistryExamSession`
const generateMinistryExam = async (req, res) => {
  try {
    console.log("📌 البيانات المستلمة لإنشاء الامتحان:", req.body);
    const { subject, grade, term, userId } = req.body;
    console.log("📌 البيانات المستلمة لإنشاء الامتحان:", {
      grade,
      term,
      subject,
      userId,
    });

    if (!subject || !grade || !term || !userId) {
      return res
        .status(400)
        .json({ message: "⚠️ جميع البيانات مطلوبة لإنشاء الامتحان!" });
    }

    // 🔹 البحث عن الأسئلة بناءً على المادة، الصف، والفصل
    let query = { subject, grade, term };
    const questions = await MinistryExam.find(query);

    if (questions.length === 0) {
      return res
        .status(404)
        .json({ message: "⚠️ لا توجد أسئلة متاحة لهذه المادة!" });
    }

    // 🔹 اختيار 10 أسئلة عشوائية
    const selectedQuestions = questions
      .sort(() => 0.5 - Math.random())
      .slice(0, 5)
      .map((q) => ({
        _id: q._id, // ✅ الاحتفاظ فقط بـ ID السؤال
        correct_answer: q.correct_answer, // ✅ جلب الإجابة الصحيحة فقط
      }));

    // 🔹 إنشاء جلسة امتحان جديدة
    const newExam = new MinistryExamSession({
      grade,
      term,
      subject,
      questions: selectedQuestions.map((q) => q._id), // ✅ تخزين الـ IDs فقط
      userId,
      examType: "ministry", // ✅ إضافة `examType` لضمان التمييز بين الامتحانات
    });

    await newExam.save();
    console.log(
      "✅ تم تخزين الامتحان بنجاح، ID:",
      newExam._id,
      "مع examType:",
      newExam.examType
    );

    res.status(200).json({ _id: newExam._id }); // ✅ إرجاع `_id` الصحيح للامتحان المخزن
  } catch (error) {
    console.error("❌ خطأ أثناء توليد الامتحان الوزاري:", error);
    res.status(500).json({ message: "❌ حدث خطأ أثناء توليد الامتحان." });
  }
};

// ✅ دالة لاسترجاع الامتحان الوزاري عند طلب عرضه للطالب
const getMinistryExam = async (req, res) => {
  try {
    const { examId } = req.params; // ✅ examId يأتي من الرابط
    console.log(
      `🔍 البحث عن الامتحان باستخدام _id: ${examId} و examType: "ministry"`
    );

    // ✅ البحث عن الامتحان باستخدام `_id` والتأكد من `examType: "ministry"`
    const exam = await MinistryExamSession.findById(examId).populate(
      "questions"
    );

    if (!exam) {
      return res.status(404).json({ message: "⚠️ الامتحان غير موجود!" });
    }

    console.log("✅ تم العثور على الامتحان:", exam);
    res.status(200).json({ exam });
  } catch (error) {
    console.error("❌ خطأ أثناء جلب الامتحان:", error);
    res.status(500).json({ message: "❌ حدث خطأ أثناء جلب الامتحان." });
  }
};

const correctAnswersMapping = {
  أ: ["أ", "ا", "A"],
  ا: ["أ", "ا", "A"],
  ب: ["ب", "B"],
  ج: ["ج", "C"],
  د: ["د", "D"],
  A: ["أ", "ا", "A"],
  B: ["ب", "B"],
  C: ["ج", "C"],
  D: ["د", "D"],
};

const submitStudentAnswer = async (req, res) => {
  try {
    const { examId, userId, questionId, selectedAnswer } = req.body;

    if (!examId || !userId || !questionId || !selectedAnswer) {
      return res.status(400).json({ message: "❌ جميع الحقول مطلوبة." });
    }

    console.log("📡 استقبال إجابة الطالب:", {
      examId,
      userId,
      questionId,
      selectedAnswer,
    });

    const question = await MinistryExam.findOne({ _id: questionId });

    if (!question) {
      return res.status(404).json({ message: "❌ السؤال غير موجود." });
    }

    const correctAnswer = question.correct_answer?.trim();

    console.log("🔍 الإجابة المختارة:", selectedAnswer);
    console.log("🔍 الإجابة الصحيحة الفعلية:", correctAnswer);
    console.log(
      "🔍 قائمة الإجابات المكافئة:",
      correctAnswersMapping[correctAnswer]
    );
    console.log(
      "🔍 هل الإجابة المختارة موجودة في القائمة؟",
      correctAnswersMapping[correctAnswer]?.includes(selectedAnswer)
    );

    const isCorrect =
      correctAnswersMapping[correctAnswer]?.includes(selectedAnswer);

    console.log("🔍 الإجابة الصحيحة:", correctAnswer);
    console.log("🔵 الإجابة المختارة:", selectedAnswer);
    console.log("✅ هل الإجابة صحيحة؟", isCorrect);

    let studentExam = await ExamResult.findOneAndUpdate(
      { userId, examId },
      { $push: { answers: { questionId, answer: selectedAnswer, isCorrect } } },
      { new: true, upsert: true }
    );

    console.log("📡 الإجابة المخزنة في قاعدة البيانات:", studentExam);

    res.status(200).json({
      message: "✅ تم تسجيل الإجابة.",
      correctAnswer,
      isCorrect,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء تسجيل الإجابة:", error);
    res.status(500).json({ message: "❌ فشل في تسجيل الإجابة", error });
  }
};

const submitExamResult = async (req, res) => {
  try {
    console.log("📡 استقبال بيانات الامتحان في السيرفر:", req.body);

    const { examId, userId, score, totalQuestions } = req.body;

    if (
      !examId ||
      !userId ||
      score === undefined ||
      totalQuestions === undefined
    ) {
      return res.status(400).json({ message: "❌ جميع الحقول مطلوبة." });
    }

    console.log("📡 استقبال نتيجة الامتحان الوزاري:", {
      examId,
      userId,
      score,
      totalQuestions,
    });

    // ✅ **حساب نسبة الأداء**
    const performancePercentage = Math.round((score / totalQuestions) * 100);

    // ✅ **تحديث أو إنشاء نتيجة الامتحان**
    let existingResult = await ExamResult.findOneAndUpdate(
      { examId, userId },
      { score, totalQuestions, performancePercentage, date: new Date() },
      { new: true, upsert: true }
    );

    console.log("✅ تم تسجيل نتيجة الامتحان:", existingResult);

    res.status(200).json({
      message: "✅ تم تسجيل نتيجة الامتحان بنجاح.",
      result: existingResult,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء تسجيل نتيجة الامتحان:", error);
    res.status(500).json({ message: "❌ فشل في تسجيل النتيجة.", error });
  }
};

module.exports = {
  generateMinistryExam,
  getMinistryExam,
  submitStudentAnswer,
  submitExamResult, // ✅ تأكد من تصدير الدالة الجديدة
};
