const mongoose = require("mongoose");

// ✅ تعريف Schema للأسئلة
const questionSchema = new mongoose.Schema({
  exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: false }, // ✅ الامتحان المرتبط به السؤال (اختياري)

  // ✅ تحديد المصدر (من أين جاء السؤال وكيف تم إنشاؤه؟)
  source: {
    type: String,
    enum: [
      "manual",
      "OCR",
      "PDF",
      "Word",
      "Excel",
      "AI", // ✅ كيف تم استخراج السؤال
      "teacher",
      "school",
      "ai",
      "books",
      "simulation",
      "books", // ✅ من أي مكان أتى السؤال (البوكيت)
    ],
    required: true,
  },

  questionText: { type: String, required: true }, // ✅ نص السؤال
  options: [{ type: String, required: false }], // ✅ قائمة الخيارات (ليست مطلوبة لكل الأسئلة)
  correctAnswer: {
    type: String,
    required: function () {
      return (
        (this.source === "teacher" || this.source === "school") &&
        this.options?.length > 0
      );
    },
  },
  explanation: { type: String }, // ✅ شرح الإجابة الصحيحة
  difficultyLevel: {
    type: String,
    enum: ["سهل", "متوسط", "صعب"],
    default: "متوسط",
  }, // ✅ مستوى الصعوبة
  paragraph: { type: String, required: false }, // ✅ الفقرة المرتبطة بالسؤال (في حال كان سؤالًا نصيًا طويلًا)
  tags: [{ type: String }], // ✅ وسوم لتحليل البيانات المستقبلية
  isValidated: { type: Boolean, default: false }, // ✅ حالة التحقق من السؤال قبل نشره
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher",
    required: false,
  }, // ✅ من أضاف السؤال (اختياري)
  score: { type: Number, default: 1 }, // ✅ درجة السؤال
  createdAt: { type: Date, default: Date.now }, // ✅ تاريخ إضافة السؤال

  // ✅ الحقول الجديدة لدعم توليد الامتحانات العشوائية:
  subject: { type: String, required: false }, // ✅ المادة الدراسية (مثل: رياضيات، فيزياء)
  grade: { type: String, required: false }, // ✅ الصف الدراسي (مثل: "الصف التاسع"، "الصف العاشر")
  term: { type: String, required: false }, // ✅ الفصل الدراسي
  unit: { type: String, required: false }, // ✅ اسم الوحدة الدراسية (مثل: "الوحدة الأولى")
});

// ✅ تصدير الـ Model
const Question = mongoose.model("Question", questionSchema);
module.exports = Question;
