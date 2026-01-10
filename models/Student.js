const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, default: null },
  password: { type: String, required: true },
  grade: { type: Number, required: false },
  role: { type: String, default: "student" },
  isBanned: { type: Boolean, default: false },

  // ✅ اشتراكات متعددة مع معلمين مختلفين
  subscriptions: [
    {
      teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Teacher",
        required: true,
      },
      plan: {
        type: String,
        enum: ["free", "basic", "premium"],
        default: "basic",
      },
      isActive: { type: Boolean, default: true },
      activeUntil: {
        type: Date,
        default: () => new Date("2025-07-15"),
      },
      paymentMethod: {
        type: String,
        default: "manual",
      },
    },
  ],

  examsTaken: [{ type: mongoose.Schema.Types.ObjectId, ref: "Exam" }],
  performance: {
    weakSubjects: [{ type: String }],
    strongSubjects: [{ type: String }],
  },
  language: { type: String, default: "العربية" },
  darkMode: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const Student = mongoose.model("Student", studentSchema);
module.exports = Student;
