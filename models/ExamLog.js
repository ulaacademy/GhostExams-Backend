const mongoose = require("mongoose");

const examLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  subject: { type: String, required: true },
  date: { type: String, required: true }, // ✅ التاريخ بصيغة YYYY-MM-DD
  examCount: { type: Number, default: 0 }, // ✅ عدد الامتحانات التي قام بها الطالب اليوم
});

const ExamLog = mongoose.model("ExamLog", examLogSchema);
module.exports = ExamLog;
