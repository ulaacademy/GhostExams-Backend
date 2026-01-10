// ✅ models/TeacherCustomExam.js
const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: String, required: true },
});

const teacherCustomExamSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  examName: { type: String, required: true },
  subject: { type: String, required: true },
  grade: { type: String, required: true },
  term: { type: String, required: true },
  duration: { type: Number, required: true },

  // ✅ جديد: إظهار/إخفاء الامتحان للطلاب
  isActive: { type: Boolean, default: true },

  questions: [questionSchema],

  createdAt: { type: Date, default: Date.now },

  // ✅ جديد: آخر تحديث
  updatedAt: { type: Date, default: Date.now },
});

// ✅ تحديث updatedAt تلقائيًا عند أي تعديل
teacherCustomExamSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("TeacherCustomExam", teacherCustomExamSchema);
