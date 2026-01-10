const mongoose = require("mongoose");

const teacherSubscriptionSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", required: true },
  startDate: { type: Date, required: true, default: Date.now },
  endDate: { type: Date, required: true },
  currentStudentCount: { type: Number, default: 0 }, // عدد الطلاب الحاليين
  isActive: { type: Boolean, default: true }, // هل الاشتراك نشط حاليًا
});

// ميدلوير لتحديث الحالة إذا انتهى الاشتراك
teacherSubscriptionSchema.pre("save", function (next) {
  if (this.endDate < new Date()) {
    this.isActive = false;
  }
  next();
});

const TeacherSubscription = mongoose.model("TeacherSubscription", teacherSubscriptionSchema);
module.exports = TeacherSubscription;