const express = require('express');
const router = express.Router();
const studentPlanController = require('../controllers/studentPlanController');

// إنشاء باقة طالب جديدة
router.post('/', studentPlanController.createStudentPlan);

// الحصول على جميع باقات الطلاب
router.get('/', studentPlanController.getAllStudentPlans);

// الحصول على باقات الطلاب النشطة فقط
router.get('/active', studentPlanController.getActiveStudentPlans);

// الحصول على باقة طالب واحدة
router.get('/:id', studentPlanController.getStudentPlanById);

// تحديث باقة طالب
router.put('/:id', studentPlanController.updateStudentPlan);

// حذف/تعطيل باقة طالب
router.delete('/:id', studentPlanController.deleteStudentPlan);

// تفعيل/تعطيل باقة طالب
router.post('/:id/toggle', studentPlanController.toggleStudentPlanStatus);

module.exports = router;
