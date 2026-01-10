const mongoose = require("mongoose");

const questionBankSchema = new mongoose.Schema({
  subject: { type: String, required: true }, // المادة
  grade: { type: String, required: true }, // الصف الدراسي
  term: { type: String, required: true }, // الفصل الدراسي

  language: {
    type: String,
    enum: ["en", "fr", "ar"],
    default: "ar",
  }, // لغة السؤال (عربي، إنجليزي، فرنسي)

  questionText: { type: String, required: true }, // نص السؤال
  questionType: {
    type: String,
    enum: ["mcq", "true-false", "short-answer"],
    required: true,
  }, // نوع السؤال (اختيار من متعدد، صح/خطأ، إجابة قصيرة)

  options: [String], // الاختيارات المتاحة للأسئلة ذات الاختيارات
  correctAnswer: { type: String, required: true }, // الإجابة الصحيحة
  explanation: { type: String }, // الشرح الخاص بالإجابة

  difficulty: { type: String, enum: ["سهل", "متوسط", "صعب"], default: "متوسط" }, // مستوى الصعوبة
  importance: { type: Number, default: 0 }, // أهمية السؤال بناءً على التكرار في الامتحانات السابقة

  source: {
    type: String,
    enum: ["كتاب", "مدرس", "مدرسة", "ذكاء اصطناعي", "امتحان وزاري"],
    required: true,
  }, // مصدر السؤال

  generatedByAI: { type: Boolean, default: false }, // إذا كان السؤال مولد بواسطة الذكاء الاصطناعي
  generatedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ExamPattern",
    required: false,
  }, // ارتباط بالسؤال الأصلي في حال كان مولد من AI

  tags: [String], // وسوم إضافية مثل: "الجبر"، "الهندسة"، "الإحصاء"، "القواعد"
  usedInExams: { type: Number, default: 0 }, // عدد الامتحانات التي استخدمت هذا السؤال

  createdAt: { type: Date, default: Date.now }, // تاريخ الإنشاء
  lastUsedAt: { type: Date, default: Date.now }, // آخر مرة تم فيها استخدام السؤال
});

module.exports = mongoose.model("QuestionBank", questionBankSchema);
