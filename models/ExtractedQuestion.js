const mongoose = require("mongoose");

const extractedQuestionSchema = new mongoose.Schema({
    questionText: { type: String, required: true },       // ✅ نص السؤال
    options: [{ type: String }],                          // ✅ خيارات الإجابة (إذا كانت متوفرة)
    correctAnswer: { type: String },                      // ✅ الإجابة الصحيحة (إن وجدت)
    explanation: { type: String },                        // ✅ شرح للإجابة (اختياري)
    subject: { type: String, required: true },            // ✅ المادة الدراسية
    grade: { type: Number, required: true },              // ✅ الصف الدراسي
    unit: { type: Number, required: true },               // ✅ رقم الوحدة
    difficultyLevel: { type: String, enum: ["سهل", "متوسط", "صعب"], default: "متوسط" }, // ✅ مستوى الصعوبة
    sourceFile: { type: String },                         // ✅ اسم الملف الذي تم استخراج السؤال منه
    createdAt: { type: Date, default: Date.now },         // ✅ تاريخ إنشاء السؤال
    isReviewed: { type: Boolean, default: false }         // ✅ حالة مراجعة السؤال (لمراجعة الجودة)
});

const ExtractedQuestion = mongoose.model("ExtractedQuestion", extractedQuestionSchema);
module.exports = ExtractedQuestion;
