// backend/models/StudentSubscription.js
const mongoose = require("mongoose");

const studentSubscriptionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student", // ✅ عندك Student model موجود بالسيرفر
      required: true,
      index: true,
    },

    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentPlan",
      required: true,
    },

    // ✅ لقطة من الخطة وقت الاشتراك (عشان لو تغيرت الخطة لاحقاً ما تخرب الاشتراكات القديمة)
    planSnapshot: {
      name: String,
      price: Number,
      currency: String,
      maxTeachers: Number,
      teacherType: String,
      duration: Number,
      durationUnit: String,
      freeExtraTeachers: Number,
    },

    status: {
      type: String,
      enum: ["pending", "active", "canceled", "expired"],
      default: "pending",
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },

    startDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    endDate: {
      type: Date,
      required: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// ✅ فهرس مهم: اشتراك نشط واحد لكل طالب
studentSubscriptionSchema.index({ studentId: 1, status: 1, isActive: 1 });

module.exports = mongoose.model("StudentSubscription", studentSubscriptionSchema);
