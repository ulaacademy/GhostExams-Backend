const mongoose = require("mongoose");

const examPatternSchema = new mongoose.Schema({
  subject: { type: String, required: true }, // المادة الدراسية
  grade: { type: String, required: true }, // الصف الدراسي
  term: { type: String, required: true }, // الفصل الدراسي
  language: {
    type: String,
    enum: ["عربي", "إنجليزي", "مختلط"],
    default: "عربي",
  }, // لغة السؤال

  patterns: [
    {
      questionType: { type: String, required: true, default: "mcq" }, // ✅ إضافة نوع افتراضي للسؤال
      difficulty: {
        type: String,
        enum: ["سهل", "متوسط", "صعب"],
        default: "متوسط",
      }, // مستوى الصعوبة
      tags: [{ type: String }], // وسوم مثل "الجبر"، "الهندسة"
      structure: { type: String, default: "" }, // نمط السؤال أو هيكلية صياغته
      frequency: { type: Number, default: 1 }, // عدد مرات تكرار النمط في الامتحانات السابقة
      source: {
        type: String,
        enum: ["books", "teacher", "school", "ai", "simulation"], // ✅ تحديث القيم لتتوافق مع قاعدة البيانات
        required: true,
      }, // مصدر السؤال
      exampleQuestion: { type: String }, // مثال على السؤال بنفس النمط
      lastUsed: { type: Date, default: Date.now }, // آخر مرة تم استخدام النمط فيها
      createdAt: { type: Date, default: Date.now },
    },
  ],

  aiGeneratedQuestions: [
    {
      questionText: { type: String, required: true }, // نص السؤال
      questionType: { type: String, required: true, default: "mcq" }, // ✅ إضافة نوع افتراضي للسؤال
      options: [{ type: String }], // الخيارات المتاحة
      correctAnswer: { type: String, required: true }, // الإجابة الصحيحة
      explanation: { type: String }, // شرح للإجابة (إن وجد)
      difficulty: {
        type: String,
        enum: ["سهل", "متوسط", "صعب"],
        default: "متوسط",
      },
      generatedFrom: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "source", // ✅ دعم تعدد المصادر (أسئلة المعلمين + الكتب)
      }, // مصدر السؤال الأصلي
      analysisScore: { type: Number, default: 0 }, // تقييم مدى قوة السؤال بناءً على التحليل
      createdAt: { type: Date, default: Date.now },
    },
  ],

  ministryExamPatterns: [
    {
      year: { type: Number, required: true }, // سنة الامتحان الوزاري
      examType: {
        type: String,
        enum: ["نموذجي", "تكميلي", "دورة ثانية"],
        required: true,
      }, // نوع الامتحان
      questionType: { type: String, required: true, default: "mcq" }, // ✅ إضافة نوع افتراضي للسؤال
      difficulty: {
        type: String,
        enum: ["سهل", "متوسط", "صعب"],
        default: "متوسط",
      }, // مستوى الصعوبة
      repetitionCount: { type: Number, default: 0 }, // عدد مرات تكرار هذا السؤال أو شبيهه
      topic: { type: String }, // الموضوع الذي ينتمي إليه السؤال
      frequency: { type: Number, default: 1 }, // مدى تكرار الأسئلة من نفس النوع
      sourceExam: { type: String, required: false }, // ✅ السماح بأن يكون `null`
      createdAt: { type: Date, default: Date.now },
    },
  ],
});

module.exports = mongoose.model("ExamPattern", examPatternSchema);
