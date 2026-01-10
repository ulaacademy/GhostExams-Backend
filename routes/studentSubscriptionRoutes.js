// backend/routes/studentSubscriptionRoutes.js
const express = require("express");
const router = express.Router();
const studentSubscriptionController = require("../controllers/studentSubscriptionController");

// إنشاء اشتراك جديد للطالب
router.post("/", studentSubscriptionController.createStudentSubscription);

// جلب الاشتراك النشط لطالب محدد
router.get(
  "/student/:studentId/active",
  studentSubscriptionController.getActiveStudentSubscription
);

// جلب كل اشتراكات الطالب
router.get(
  "/student/:studentId",
  studentSubscriptionController.getStudentSubscriptions
);

// تفعيل الاشتراك (دفع)
router.post(
  "/:subscriptionId/activate",
  studentSubscriptionController.activateStudentSubscription
);

// إلغاء تفعيل/إلغاء الاشتراك
router.post(
  "/:subscriptionId/deactivate",
  studentSubscriptionController.deactivateStudentSubscription
);

// تجديد الاشتراك
router.post(
  "/:subscriptionId/renew",
  studentSubscriptionController.renewStudentSubscription
);

// تغيير الخطة
router.post(
  "/:subscriptionId/change-plan",
  studentSubscriptionController.changeStudentPlan
);

// تحديث حالة الدفع
router.put(
  "/:subscriptionId/payment-status",
  studentSubscriptionController.updateStudentPaymentStatus
);

// ✅ جلب كل اشتراكات الطلاب (للأدمن داشبورد)
router.get("/", studentSubscriptionController.getAllStudentSubscriptions);

const authMiddleware = require("../middleware/authMiddleware"); // ✅ إذا اسم الميدلوير عندك مختلف عدّله

router.get(
  "/me",
  authMiddleware,
  studentSubscriptionController.getMySubscriptionStatus
);

module.exports = router;
