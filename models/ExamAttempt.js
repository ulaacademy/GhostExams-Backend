const mongoose = require("mongoose");

const examAttemptSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    teacherId: { type: mongoose.Schema.Types.ObjectId, index: true },

    currentQuestionIndex: { type: Number, default: 0 },

    answers: { type: Object, default: {} }, // { "0": "option text", ... }
    questionStatus: { type: Object, default: {} }, // { "0": "correct|wrong|timeout|skipped", ... }
    timeSpent: { type: Object, default: {} }, // { "0": 12, ... }

    score: { type: Number, default: null },
    isFinalized: { type: Boolean, default: false },

    updatedAtIso: { type: String },
    submittedAtIso: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ExamAttempt", examAttemptSchema);
