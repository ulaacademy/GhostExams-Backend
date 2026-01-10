const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');

// إنشاء باقة جديدة
router.post('/', planController.createPlan);

// الحصول على جميع الباقات
router.get('/', planController.getAllPlans);

// الحصول على الباقات النشطة فقط
router.get('/active', planController.getActivePlans);

// الحصول على باقة واحدة
router.get('/:id', planController.getPlanById);

// تحديث باقة
router.put('/:id', planController.updatePlan);

// حذف/تعطيل باقة
router.delete('/:id', planController.deletePlan);

// تفعيل/تعطيل باقة
router.post('/:id/toggle', planController.togglePlanStatus);

module.exports = router;
