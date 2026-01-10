const mongoose = require("mongoose");

const examResultSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam", // ✅ يربط النتيجة بالامتحان
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student", // ✅ تأكد أن الكيان المستخدم للطلاب هو "Student" وليس "User"
      required: true,
    },
    score: {
      type: Number,
      required: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    performancePercentage: {
      type: Number,
      default: 0, // ✅ تأكد من أن القيمة الافتراضية 0
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
); // ✅ يضيف `createdAt` و`updatedAt` تلقائيًا

// ✅ **حساب نسبة الأداء قبل حفظ البيانات في قاعدة البيانات**
examResultSchema.pre("save", function (next) {
  if (this.totalQuestions > 0) {
    this.performancePercentage = Math.round(
      (this.score / this.totalQuestions) * 100
    );
  } else {
    this.performancePercentage = 0; // ✅ تجنب القسمة على صفر
  }
  next();
});

module.exports = mongoose.model("ExamResult", examResultSchema);
