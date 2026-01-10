const mongoose = require("mongoose");

/**
 * 🔹 **مخطط تخزين الامتحانات المولدة بالذكاء الاصطناعي**
 */
const aiGeneratedExamSchema = new mongoose.Schema({
    grade: { type: String, required: true },  // الصف الدراسي
    term: { type: String, required: true },   // الفصل الدراسي
    subject: { type: String, required: true }, // المادة الدراسية
    questions: [
        {
            questionText: { type: String, required: true },  // نص السؤال
            options: { type: [String], required: true },     // الخيارات المتاحة
            correctAnswer: { type: String, required: true }, // الإجابة الصحيحة
            questionType: { type: String, enum: ["mcq", "true-false", "short-answer"], required: true }, // نوع السؤال
            difficulty: { type: String, enum: ["سهل", "متوسط", "صعب"], default: "متوسط" }, // مستوى الصعوبة
            createdAt: { type: Date, default: Date.now },  // وقت إنشاء السؤال
        }
    ],
    createdAt: { type: Date, default: Date.now } // وقت إنشاء الامتحان
});

/**
 * 🔥 **إنشاء النموذج بناءً على المخطط أعلاه**
 */
module.exports = mongoose.model("AiGeneratedExam", aiGeneratedExamSchema);
