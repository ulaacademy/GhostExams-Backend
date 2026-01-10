const mongoose = require("mongoose");

const examSchema = new mongoose.Schema({
  title: { type: String, required: true }, // ✅ عنوان الامتحان
  subject: { type: String, required: true }, // ✅ المادة الدراسية
  grade: { type: Number, required: true }, // ✅ الصف الدراسي كرقم
  term: { type: String, required: false }, // ✅ الفصل الدراسي (مثل: الفصل الأول، الفصل الثاني)
  examType: {
    type: String,
    enum: ["school", "teacher", "ai", "official", "AI", "books", "mixed", "ministry", "ghost"], // ✅ أنواع الامتحانات
    required: true,
  },
  source: {
    type: String,
    enum: ["manual", "OCR", "PDF", "Word", "Excel", "AI", "mixed", "ministry"], // ✅ مصادر الامتحان
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher",
    required: false,
  }, // ✅ منشئ الامتحان (اختياري)
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }], // ✅ الأسئلة كـ ObjectId[]
  fileUrl: { type: String, required: false }, // ✅ رابط الملف الأصلي المخزن في AWS S3
  isProcessed: { type: Boolean, default: false }, // ✅ حالة تحليل الامتحان
  duration: { type: Number, required: false }, // ✅ مدة الامتحان بالدقائق
  maxScore: { type: Number, required: false }, // ✅ الحد الأقصى للعلامات
  createdAt: { type: Date, default: Date.now }, // ✅ تاريخ الإنشاء
});

// ✅ التأكد من صحة الـ ObjectId المخزن في questions
examSchema.pre("save", function (next) {
  if (Array.isArray(this.questions) && this.questions.length > 0) {
    this.questions = this.questions.map((q) => new mongoose.Types.ObjectId(q));
  }
  next();
});

const Exam = mongoose.model("Exam", examSchema);
module.exports = Exam;
