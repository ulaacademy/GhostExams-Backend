const mongoose = require("mongoose");

const ministryExamSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  examType: { type: String, default: "ministry" }, // ✅ إضافة `examType` كقيمة افتراضية

  questions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MinistryExam",
    },
  ],
  score: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ✅ تعديل الموديل ليستخدم _id الافتراضي كمعرف أساسي
const MinistryExamSession = mongoose.model(
  "MinistryExamSession",
  ministryExamSessionSchema
);

module.exports = MinistryExamSession;
