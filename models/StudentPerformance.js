const mongoose = require("mongoose");

const studentPerformanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // 🔹 ربط الأداء بالطالب
    required: true,
  },
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exam", // 🔹 ربط الأداء بالامتحان
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
    default: function () {
      return (this.score / this.totalQuestions) * 100;
    },
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("StudentPerformance", studentPerformanceSchema);
