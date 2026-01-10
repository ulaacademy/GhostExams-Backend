const mongoose = require("mongoose");

const simulationExamSchema = new mongoose.Schema({
  subject: { type: String, required: true }, // المادة الدراسية
  grade: { type: String, required: true }, // الصف الدراسي
  term: { type: String, required: true }, // الفصل الدراسي
  year: { type: Number, required: true }, // سنة الامتحان
  examType: {
    type: String,
    enum: ["نموذجي", "تكميلي", "دورة ثانية"],
    required: true,
  }, // نوع الامتحان الوزاري

  questions: [
    {
      questionText: { type: String, required: true }, // نص السؤال
      questionType: { type: String, required: true }, // نوع السؤال (اختيار من متعدد، صح/خطأ، مقالي...)
      options: [String], // الخيارات للأسئلة ذات الاختيارات المتعددة
      correctAnswer: { type: String, required: true }, // الإجابة الصحيحة
      explanation: { type: String }, // شرح الإجابة
      difficulty: {
        type: String,
        enum: ["سهل", "متوسط", "صعب"],
        default: "متوسط",
      }, // مستوى الصعوبة
      frequency: { type: Number, default: 1 }, // عدد مرات تكرار هذا السؤال
      topic: { type: String }, // الموضوع الذي ينتمي إليه السؤال
      createdAt: { type: Date, default: Date.now },
    },
  ],

  totalQuestions: { type: Number, default: 0 }, // عدد الأسئلة في الامتحان
  duration: { type: Number, required: true }, // مدة الامتحان بالدقائق
  passMark: { type: Number, default: 50 }, // الحد الأدنى للنجاح
  generatedByAI: { type: Boolean, default: false }, // يحدد ما إذا كان الامتحان مولد بالذكاء الاصطناعي

  createdAt: { type: Date, default: Date.now }, // تاريخ إنشاء الامتحان
  updatedAt: { type: Date, default: Date.now }, // تاريخ آخر تحديث
});

// تحديث عدد الأسئلة تلقائيًا قبل حفظ المستند
simulationExamSchema.pre("save", function (next) {
  this.totalQuestions = this.questions.length;
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("SimulationExam", simulationExamSchema);
