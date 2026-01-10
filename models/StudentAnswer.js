const mongoose = require("mongoose");

const StudentAnswerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // ربط الإجابة بالمستخدم (طالب أو معلم)
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    }, // ربط الإجابة بالامتحان
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    }, // ربط الإجابة بالسؤال
    selectedAnswer: { type: String, required: true }, // الإجابة المختارة
    isCorrect: { type: Boolean, required: true }, // هل الإجابة صحيحة؟
    correctAnswer: { type: String }, // الإجابة الصحيحة
    explanation: { type: String }, // الشرح المستخرج من الذكاء الاصطناعي
    score: { type: Number, required: true, default: 0 }, // ✅ إضافة حقل `score`
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudentAnswer", StudentAnswerSchema);
