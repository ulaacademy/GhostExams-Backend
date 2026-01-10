const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  discount: { type: Number, required: true }, // يمكن أن يكون نسبة مئوية أو عدد أيام مجانية
  validUntil: { type: Date, required: true },
  isUsed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Coupon = mongoose.model("Coupon", couponSchema);
module.exports = Coupon;
