const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');

// إنشاء اشتراك جديد للمعلم
router.post('/', subscriptionController.createSubscription);

// الحصول على الاشتراك النشط للمعلم (يجب أن يكون قبل /teacher/:teacherId لتجنب الصراع)
router.get('/teacher/:teacherId/active', subscriptionController.getActiveSubscription);

// الحصول على جميع اشتراكات معلم محدد
router.get('/teacher/:teacherId', subscriptionController.getTeacherSubscription);

// الحصول على جميع الاشتراكات (مع فلاتر اختيارية)
router.get('/', subscriptionController.getAllSubscriptions);

// تفعيل الاشتراك (تغيير حالة الدفع إلى مدفوع)
router.post('/:subscriptionId/activate', subscriptionController.activateSubscription);

// إلغاء تفعيل الاشتراك مؤقتاً
router.post('/:subscriptionId/deactivate', subscriptionController.deactivateSubscription);

// إلغاء الاشتراك
router.post('/:subscriptionId/cancel', subscriptionController.cancelSubscription);

// تجديد الاشتراك
router.post('/:subscriptionId/renew', subscriptionController.renewSubscription);

// تغيير باقة الاشتراك
router.post('/:subscriptionId/change-plan', subscriptionController.changePlan);

// تحديث حالة الدفع
router.put('/:subscriptionId/payment-status', subscriptionController.updatePaymentStatus);

module.exports = router;