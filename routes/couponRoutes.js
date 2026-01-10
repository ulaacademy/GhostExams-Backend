const express = require("express");
const router = express.Router();
const couponController = require("../controllers/couponController");

// ✅ إنشاء كوبون جديد (للمشرفين فقط)
router.post("/create", couponController.createCoupon);

// ✅ التحقق من صلاحية الكوبون
router.post("/validate", couponController.validateCoupon);

// ✅ استخدام الكوبون (تحديث حالته)
router.post("/use", couponController.useCoupon);

// ✅ جلب جميع الكوبونات (للمشرفين فقط)
router.get("/all", couponController.getAllCoupons);

// ✅ حذف كوبون معين
router.delete("/delete/:id", couponController.deleteCoupon);

module.exports = router;
