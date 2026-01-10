const express = require("express");
const router = express.Router();
const shareController = require("../controllers/shareController");
const authMiddleware = require("../middleware/authMiddleware");

// ✅ إنشاء رابط مشاركة (يتطلب تسجيل الدخول)
router.post("/create", authMiddleware, shareController.createShare);

// ✅ الحصول على روابط المشاركة الخاصة بالمستخدم (يجب أن يأتي قبل /:token)
router.get("/my/shares", authMiddleware, shareController.getMyShares);

// ✅ التحقق من اشتراك الطالب مع المعلم (يتطلب تسجيل الدخول) - يجب أن يأتي قبل /:token
router.get("/:token/check-subscription", authMiddleware, shareController.checkSubscription);

// ✅ عرض المحتوى المشترك (عام - لا يتطلب تسجيل الدخول)
router.get("/:token", shareController.viewSharedContent);

// ✅ إلغاء رابط مشاركة
router.delete("/:token", authMiddleware, shareController.revokeShare);

module.exports = router;

