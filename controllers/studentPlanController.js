const StudentPlan = require('../models/StudentPlan');

// 1) إنشاء باقة طالب جديدة
exports.createStudentPlan = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      currency,
      maxTeachers,
      teacherType,
      duration,
      durationUnit,
      features,
      startDate,
      endDate,
      freeExtraTeachers,
      freeExtraStudents,
    } = req.body;

    // ✅ حقول مطلوبة للطالب
    if (!name || price === undefined || maxTeachers === undefined || !teacherType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message:
          'جميع الحقول المطلوبة يجب أن تكون مملوءة (name, price, maxTeachers, teacherType, startDate, endDate)',
      });
    }

    // التحقق من صحة التواريخ
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'تواريخ غير صالحة (startDate / endDate)',
      });
    }
    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'تاريخ البدء يجب أن يكون قبل تاريخ الانتهاء',
      });
    }

    // منع تكرار الاسم داخل StudentPlans
    const existing = await StudentPlan.findOne({ name: String(name).trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'يوجد باقة طالب بنفس الاسم بالفعل',
      });
    }

    const plan = new StudentPlan({
      name,
      description,
      price,
      currency: currency || 'JOD',
      maxTeachers,
      teacherType,
      duration: duration || 30,
      durationUnit: durationUnit || 'days',
      startDate,
      endDate,
      freeExtraTeachers: Number(freeExtraTeachers) || 0,
      freeExtraStudents: Number(freeExtraStudents) || 0,
      features: Array.isArray(features) ? features : (features || []),
    });

    await plan.save();

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء باقة الطالب بنجاح',
      data: plan,
    });
  } catch (error) {
    console.error('خطأ في إنشاء باقة الطالب:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في إنشاء باقة الطالب',
      error: error.message,
    });
  }
};

// 2) الحصول على جميع باقات الطلاب
exports.getAllStudentPlans = async (req, res) => {
  try {
    const { active } = req.query;

    const filter = {};
    if (active !== undefined) {
      filter.isActive = active === 'true';
    }

    const plans = await StudentPlan.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error('خطأ في الحصول على باقات الطلاب:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في الحصول على باقات الطلاب',
      error: error.message,
    });
  }
};

// 3) الحصول على باقة طالب واحدة
exports.getStudentPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await StudentPlan.findById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'باقة الطالب غير موجودة',
      });
    }

    return res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('خطأ في الحصول على باقة الطالب:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في الحصول على باقة الطالب',
      error: error.message,
    });
  }
};

// 4) تحديث باقة طالب
exports.updateStudentPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // إزالة الحقول التي لا يجب تحديثها
    delete updateData._id;
    delete updateData.createdAt;

    // تحديث updatedAt يدويًا (لأن findByIdAndUpdate لا يشغّل pre('save'))
    updateData.updatedAt = Date.now();

    // إذا تم تمرير freeExtraTeachers/freeExtraStudents كقيمة فارغة
    if (updateData.freeExtraTeachers === '' || updateData.freeExtraTeachers === null) {
      updateData.freeExtraTeachers = 0;
    }
    if (updateData.freeExtraStudents === '' || updateData.freeExtraStudents === null) {
      updateData.freeExtraStudents = 0;
    }

    const plan = await StudentPlan.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'باقة الطالب غير موجودة',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'تم تحديث باقة الطالب بنجاح',
      data: plan,
    });
  } catch (error) {
    console.error('خطأ في تحديث باقة الطالب:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في تحديث باقة الطالب',
      error: error.message,
    });
  }
};

// 5) حذف/تعطيل باقة طالب
exports.deleteStudentPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    if (permanent === 'true') {
      const plan = await StudentPlan.findByIdAndDelete(id);
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'باقة الطالب غير موجودة',
        });
      }
    } else {
      const plan = await StudentPlan.findByIdAndUpdate(
        id,
        { isActive: false, updatedAt: Date.now() },
        { new: true }
      );
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'باقة الطالب غير موجودة',
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: permanent === 'true' ? 'تم حذف باقة الطالب نهائياً' : 'تم تعطيل باقة الطالب',
    });
  } catch (error) {
    console.error('خطأ في حذف باقة الطالب:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في حذف باقة الطالب',
      error: error.message,
    });
  }
};

// 6) تفعيل/تعطيل باقة طالب
exports.toggleStudentPlanStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await StudentPlan.findById(id).select('isActive');
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'باقة الطالب غير موجودة',
      });
    }

    const updatedPlan = await StudentPlan.findByIdAndUpdate(
      id,
      { isActive: !plan.isActive, updatedAt: Date.now() },
      { new: true, runValidators: false }
    );

    return res.status(200).json({
      success: true,
      message: updatedPlan.isActive ? 'تم تفعيل باقة الطالب' : 'تم تعطيل باقة الطالب',
      data: { isActive: updatedPlan.isActive },
    });
  } catch (error) {
    console.error('خطأ في تغيير حالة باقة الطالب:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في تغيير حالة باقة الطالب',
      error: error.message,
    });
  }
};

// 7) الحصول على باقات الطلاب النشطة فقط
exports.getActiveStudentPlans = async (req, res) => {
  try {
    const plans = await StudentPlan.find({ isActive: true }).sort({ price: 1 });

    return res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error('خطأ في الحصول على باقات الطلاب النشطة:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في الحصول على باقات الطلاب النشطة',
      error: error.message,
    });
  }
};
