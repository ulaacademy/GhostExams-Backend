const mongoose = require("mongoose");

const teacherExamResultSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TeacherCustomExam",
    required: true,
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher",
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
  timeSpent: {
    type: String,
    default: "غير محدد",
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("TeacherExamResult", teacherExamResultSchema);
