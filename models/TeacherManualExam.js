const mongoose = require("mongoose");

const teacherManualExamSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // لازم المعلم يكون محفوظ في users collection
    required: true,
  },
  title: { type: String, required: true },
  subject: { type: String, required: true },
  grade: { type: String, required: true },
  term: { type: String, required: true },
  duration: { type: Number, required: true }, // بالدقائق
  questions: [
    {
      questionText: String,
      options: [String],
      correctAnswer: String,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("TeacherManualExam", teacherManualExamSchema);
