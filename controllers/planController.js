const Plan = require('../models/Plan');

// 1. إنشاء باقة جديدة
exports.createPlan = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      currency,
      maxStudents,
      maxExams,
      maxQuestions,
      duration,
      durationUnit,
      features,
      startDate,
      endDate
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!name || !price || !maxStudents || !maxExams || !maxQuestions || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول المطلوبة يجب أن تكون مملوءة (name, price, maxStudents, maxExams, maxQuestions, startDate, endDate)'
      });
    }

    // التحقق من صحة التواريخ
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'تاريخ البدء يجب أن يكون قبل تاريخ الانتهاء'
      });
    }

    // التحقق من عدم وجود باقة بنفس الاسم
    const existingPlan = await Plan.findOne({ name });
    if (existingPlan) {
      return res.status(400).json({
        success: false,
        message: 'يوجد باقة بنفس الاسم بالفعل'
      });
    }

    const plan = new Plan({
      name,
      description,
      price,
      currency: currency || 'JOD',
      maxStudents,
      maxExams,
      maxQuestions,
      duration: duration || 30,
      durationUnit: durationUnit || 'days',
      startDate,
      endDate,
      features: features || []
    });

    await plan.save();

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الباقة بنجاح',
      data: plan
    });
  } catch (error) {
    console.error('خطأ في إنشاء الباقة:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في إنشاء الباقة',
      error: error.message
    });
  }
};

// 2. الحصول على جميع الباقات
exports.getAllPlans = async (req, res) => {
  try {
    const { active } = req.query;
    
    let filter = {};
    if (active !== undefined) {
      filter.isActive = active === 'true';
    }

    const plans = await Plan.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('خطأ في الحصول على الباقات:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الحصول على الباقات',
      error: error.message
    });
  }
};

// 3. الحصول على باقة واحدة
exports.getPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'الباقة غير موجودة'
      });
    }

    res.status(200).json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('خطأ في الحصول على الباقة:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الحصول على الباقة',
      error: error.message
    });
  }
};

// 4. تحديث باقة
exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // إزالة الحقول التي لا يجب تحديثها
    delete updateData._id;
    delete updateData.createdAt;

    const plan = await Plan.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'الباقة غير موجودة'
      });
    }

    res.status(200).json({
      success: true,
      message: 'تم تحديث الباقة بنجاح',
      data: plan
    });
  } catch (error) {
    console.error('خطأ في تحديث الباقة:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تحديث الباقة',
      error: error.message
    });
  }
};

// 5. حذف باقة (تعطيل)
exports.deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    if (permanent === 'true') {
      // حذف دائم
      const plan = await Plan.findByIdAndDelete(id);
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'الباقة غير موجودة'
        });
      }
    } else {
      // تعطيل الباقة
      const plan = await Plan.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      );
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'الباقة غير موجودة'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: permanent === 'true' ? 'تم حذف الباقة نهائياً' : 'تم تعطيل الباقة'
    });
  } catch (error) {
    console.error('خطأ في حذف الباقة:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في حذف الباقة',
      error: error.message
    });
  }
};

// 6. تفعيل/تعطيل باقة
exports.togglePlanStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Plan.findById(id).select('isActive');
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'الباقة غير موجودة'
      });
    }

    const updatedPlan = await Plan.findByIdAndUpdate(
      id,
      {
        isActive: !plan.isActive,
        updatedAt: Date.now()
      },
      {
        new: true,
        runValidators: false
      }
    );

    res.status(200).json({
      success: true,
      message: updatedPlan.isActive ? 'تم تفعيل الباقة' : 'تم تعطيل الباقة',
      data: {
        isActive: updatedPlan.isActive
      }
    });
  } catch (error) {
    console.error('خطأ في تغيير حالة الباقة:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تغيير حالة الباقة',
      error: error.message
    });
  }
};

// 7. الحصول على الباقات النشطة فقط
exports.getActivePlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ price: 1 });

    res.status(200).json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('خطأ في الحصول على الباقات النشطة:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الحصول على الباقات النشطة',
      error: error.message
    });
  }
};
