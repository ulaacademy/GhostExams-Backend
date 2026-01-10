const mongoose = require("mongoose");

const teacherStudentSubscriptionSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true }, // ✅ مهم يكون Student وليس User
  type: { type: String, enum: ["free", "basic", "premium"], default: "free" }, // ✅ أضف أنواع الاشتراكات
  paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" }, // ✅ يوضح هل تم الدفع
  paymentMethod: { type: String, enum: ["none", "card", "cash", "coupon"], default: "none" }, // ✅ طريقة الدفع
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  notes: { type: String }, // ✅ حقل إضافي اختياري لأي ملاحظات خاصة بالاشتراك
});

module.exports = mongoose.model("TeacherStudentSubscription", teacherStudentSubscriptionSchema);
