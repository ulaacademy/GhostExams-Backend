const Teacher = require('../models/Teacher');
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const { sendTeacherSubscriptionRequestEmail } = require('../utils/emailService');

// 1. إنشاء اشتراك جديد للأستاذ
exports.createSubscription = async (req, res) => {
  try {
    const {
      teacherId,
      planId,
      paymentMethod,
      amount,
      currency,
      notes,
      customStartDate, // اختياري: لتحديد تاريخ بدء مخصص
      customEndDate,   // اختياري: لتحديد تاريخ انتهاء مخصص
      startDate: submittedStartDate,
      endDate: submittedEndDate,
      status: requestedStatus,
      source
    } = req.body;

    let teacher = null;
    let plan = null;
    let subscription = null;

    // التحقق من البيانات المطلوبة
    if (!teacherId || !planId) {
      return res.status(400).json({
        success: false,
        message: 'المعلم والباقة مطلوبة'
      });
    }

    // التحقق من وجود المعلم
    teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'المعلم غير موجود'
      });
    }

    // التحقق من وجود الباقة
    plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'الباقة غير موجودة'
      });
    }

    if (!plan.isActive) {
      return res.status(400).json({
        success: false,
        message: 'الباقة غير نشطة'
      });
    }

    // التحقق من عدم وجود اشتراك نشط للمعلم
    const existingSubscription = await Subscription.findOne({
      teacherId,
      status: { $in: ['active', 'pending', 'inactive'] }
    });

    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message: 'المعلم لديه اشتراك قيد المراجعة أو نشط بالفعل'
      });
    }

    // استخدام التواريخ من الباقة (Plan) أو من الطلب
    let startDate, endDate;

    const preferredStartDate = customStartDate || submittedStartDate;
    const preferredEndDate = customEndDate || submittedEndDate;

    if (preferredStartDate && preferredEndDate) {
      // استخدام تواريخ مخصصة من الطلب
      startDate = new Date(preferredStartDate);
      endDate = new Date(preferredEndDate);
      
      // التحقق من صحة التواريخ
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'تواريخ غير صحيحة'
        });
      }
      
      // التحقق من أن تاريخ الانتهاء أكبر من تاريخ البدء
      if (endDate <= startDate) {
        return res.status(400).json({
          success: false,
          message: 'تاريخ الانتهاء يجب أن يكون أكبر من تاريخ البدء'
        });
      }
    } else if (plan.startDate && plan.endDate) {
      // استخدام التواريخ المحددة في الباقة
      startDate = new Date(plan.startDate);
      endDate = new Date(plan.endDate);
      
      // التحقق من صحة التواريخ
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'الباقة تحتوي على تواريخ غير صحيحة'
        });
      }
      
      // التحقق من أن الباقة لم تنتهي
      if (endDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'الباقة منتهية الصلاحية'
        });
      }
    } else {
      // إذا لم تكن هناك تواريخ في الباقة ولا تواريخ مخصصة، استخدم اليوم + duration
      startDate = new Date();
      endDate = new Date(startDate);
      
      switch (plan.durationUnit) {
        case 'days':
          endDate.setDate(endDate.getDate() + plan.duration);
          break;
        case 'months':
          endDate.setMonth(endDate.getMonth() + plan.duration);
          break;
        case 'years':
          endDate.setFullYear(endDate.getFullYear() + plan.duration);
          break;
        default:
          endDate.setDate(endDate.getDate() + plan.duration);
      }
    }

    const allowedStatuses = Subscription.schema?.paths?.status?.enumValues || [];
    const actorRole = req.user?.role || req.body.createdBy;
    const defaultStatus = actorRole === 'admin' ? 'pending' : 'inactive';
    const initialStatus = allowedStatuses.includes(requestedStatus)
      ? requestedStatus
      : defaultStatus;

    // إنشاء الاشتراك
    subscription = new Subscription({
      teacherId,
      planId,
      startDate,
      endDate,
      paymentMethod: paymentMethod || 'bank_transfer',
      amount: amount || plan.price,
      currency: currency || plan.currency,
      notes,
      status: initialStatus
    });

    await subscription.save();

    // تحديث معلومات المعلم
    teacher.subscription = subscription._id;
    if (subscription.status === 'active') {
      teacher.updateLimitsFromPlan(plan);
    } else {
      teacher.currentLimits.maxStudents = 0;
      teacher.currentLimits.maxExams = 0;
      teacher.currentLimits.maxQuestions = 0;
    }
    await teacher.save();

    const submittedDetails = {
      startDate: preferredStartDate || startDate,
      endDate: preferredEndDate || endDate,
      paymentMethod: paymentMethod || subscription.paymentMethod,
      amount: amount || subscription.amount,
      currency: currency || subscription.currency,
      notes: notes || '',
      source: source || 'teacher-portal'
    };

    // إرسال البريد الإلكتروني (غير متزامن - لا يمنع إنشاء الاشتراك)
    sendTeacherSubscriptionRequestEmail({
      teacher,
      plan,
      subscription,
      submittedData: submittedDetails
    }).catch((emailError) => {
      // تسجيل الخطأ ولكن لا نوقف العملية
      console.error('❌ فشل إرسال البريد الإلكتروني:', emailError.message);
      console.error('📧 تفاصيل الخطأ:', {
        error: emailError.message,
        stack: emailError.stack,
        teacherEmail: teacher?.email,
        teacherName: teacher?.name,
        subscriptionId: subscription._id
      });
    });

    // إرجاع البيانات مع تفاصيل الباقة والمعلم
    const populatedSubscription = await Subscription.findById(subscription._id)
      .populate('teacherId', 'name email')
      .populate('planId', 'name price maxStudents maxExams maxQuestions');

    res.status(201).json({
      success: true,
      message: subscription.status === 'inactive'
        ? 'تم تسجيل طلب الاشتراك وسيتم مراجعته من قبل الإدارة'
        : 'تم إنشاء الاشتراك بنجاح',
      data: populatedSubscription
    });
  } catch (error) {
    console.error('خطأ في إنشاء الاشتراك:', error);
    if (typeof subscription !== 'undefined' && subscription?._id) {
      try {
        await Subscription.findByIdAndDelete(subscription._id);
      } catch (cleanupError) {
        console.error('فشل تنظيف الاشتراك بعد الخطأ:', cleanupError);
      }
    }
    if (typeof teacher !== 'undefined' && teacher && subscription?._id) {
      try {
        if (teacher.subscription && String(teacher.subscription) === String(subscription._id)) {
          teacher.subscription = undefined;
        }
        teacher.currentLimits.maxStudents = teacher.currentLimits.maxStudents || 0;
        teacher.currentLimits.maxExams = teacher.currentLimits.maxExams || 0;
        teacher.currentLimits.maxQuestions = teacher.currentLimits.maxQuestions || 0;
        await teacher.save();
      } catch (cleanupError) {
        console.error('فشل تحديث بيانات المعلم بعد الخطأ:', cleanupError);
      }
    }
    const friendlyMessage = error.message === 'EMAIL_TRANSPORT_MISSING_CONFIG'
      ? 'إعدادات البريد الإلكتروني غير مكتملة، يرجى مراجعة ملف البيئة'
      : 'حدث خطأ في إنشاء الاشتراك';
    res.status(500).json({
      success: false,
      message: friendlyMessage,
      error: error.message
    });
  }
};

// 2. الحصول على جميع اشتراكات المعلم
exports.getTeacherSubscription = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const subscriptions = await Subscription.find({ teacherId })
      .populate('teacherId', 'name email currentLimits currentUsage')
      .populate('planId', 'name price maxStudents maxExams maxQuestions features')
      .sort({ createdAt: -1 });

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'لا يوجد اشتراك للمعلم'
      });
    }

    res.status(200).json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    console.error('خطأ في الحصول على الاشتراكات:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الحصول على الاشتراكات',
      error: error.message
    });
  }
};

// 2.1 الحصول على الاشتراك النشط للمعلم
exports.getActiveSubscription = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const subscription = await Subscription.findOne({ 
      teacherId,
      status: 'active'
    })
      .populate('teacherId', 'name email currentLimits currentUsage')
      .populate('planId', 'name price maxStudents maxExams maxQuestions features')
      .sort({ createdAt: -1 });

    if (!subscription) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'لا يوجد اشتراك نشط حالياً'
      });
    }

    res.status(200).json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('خطأ في الحصول على الاشتراك النشط:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الحصول على الاشتراك النشط',
      error: error.message
    });
  }
};

// 3. تفعيل الاشتراك (تغيير حالة الدفع إلى مدفوع)
exports.activateSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const {
      paymentDate,
      paymentStatus,
      paymentMethod,
      amount,
      notes,
      teacherId,
      planId,
      newEndDate
    } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'الاشتراك غير موجود'
      });
    }

    // تعيين المعلم إن لم يكن محفوظاً
    if (!subscription.teacherId) {
      let resolvedTeacherId = teacherId;

      if (!resolvedTeacherId) {
        const teacher = await Teacher.findOne({ subscription: subscription._id });
        if (teacher) {
          resolvedTeacherId = teacher._id;
        }
      }

      if (resolvedTeacherId) {
        subscription.teacherId = resolvedTeacherId;
      }
    }

    // تعيين الباقة إن لم تكن محفوظة
    if (!subscription.planId) {
      if (!planId) {
        return res.status(400).json({
          success: false,
          message: 'معرف الباقة مفقود في الاشتراك، يرجى تمرير planId'
        });
      }

      subscription.planId = planId;
    }

    const plan = await Plan.findById(subscription.planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'الباقة غير موجودة'
      });
    }

    // تحديد تاريخ الانتهاء
    if (newEndDate) {
      subscription.endDate = new Date(newEndDate);
    } else if (!subscription.endDate) {
      const calculatedEndDate = new Date();

      switch (plan.durationUnit) {
        case 'days':
          calculatedEndDate.setDate(calculatedEndDate.getDate() + plan.duration);
          break;
        case 'months':
          calculatedEndDate.setMonth(calculatedEndDate.getMonth() + plan.duration);
          break;
        case 'years':
          calculatedEndDate.setFullYear(calculatedEndDate.getFullYear() + plan.duration);
          break;
        default:
          calculatedEndDate.setDate(calculatedEndDate.getDate() + plan.duration);
      }

      subscription.endDate = calculatedEndDate;
    }

    // تحديث بيانات الدفع
    subscription.status = 'active';
    subscription.paymentStatus = paymentStatus || 'paid';
    subscription.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
    if (paymentMethod) {
      subscription.paymentMethod = paymentMethod;
    }
    if (notes !== undefined) {
      subscription.notes = notes;
    }

    if (amount !== undefined && amount !== '') {
      const parsedAmount = Number(amount);
      subscription.amount = Number.isNaN(parsedAmount) ? plan.price : parsedAmount;
    } else if (!subscription.amount) {
      subscription.amount = plan.price;
    }

    await subscription.save();

    // تحديث حدود المعلم
    if (subscription.teacherId) {
      const teacher = await Teacher.findById(subscription.teacherId);
      if (teacher) {
        teacher.updateLimitsFromPlan(plan);
        await teacher.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'تم تفعيل الاشتراك بنجاح',
      data: subscription
    });
  } catch (error) {
    console.error('خطأ في تفعيل الاشتراك:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تفعيل الاشتراك',
      error: error.message
    });
  }
};

// 3.1 إلغاء تفعيل الاشتراك مؤقتاً
exports.deactivateSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { reason, notes } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'الاشتراك غير موجود'
      });
    }

    subscription.status = 'inactive';
    subscription.paymentStatus = 'pending';
    subscription.paymentDate = null;

    if (reason !== undefined) {
      subscription.cancellationReason = reason;
    }

    if (notes !== undefined) {
      subscription.notes = notes;
    }

    await subscription.save();

    let teacherToUpdate = null;
    if (subscription.teacherId) {
      teacherToUpdate = await Teacher.findById(subscription.teacherId);
    }
    if (!teacherToUpdate) {
      teacherToUpdate = await Teacher.findOne({ subscription: subscription._id });
    }

    if (teacherToUpdate) {
      teacherToUpdate.currentLimits.maxStudents = 0;
      teacherToUpdate.currentLimits.maxExams = 0;
      teacherToUpdate.currentLimits.maxQuestions = 0;
      await teacherToUpdate.save();
    }

    res.status(200).json({
      success: true,
      message: 'تم تعطيل الاشتراك بنجاح',
      data: subscription
    });
  } catch (error) {
    console.error('خطأ في تعطيل الاشتراك:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تعطيل الاشتراك',
      error: error.message
    });
  }
};

// 4. إلغاء الاشتراك
exports.cancelSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { reason, cancelledBy, teacherId } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'الاشتراك غير موجود'
      });
    }

    if (subscription.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'الاشتراك ملغي بالفعل'
      });
    }

    // محاولة تحديد المعلم المرتبط بالاشتراك
    let resolvedTeacherId = subscription.teacherId;
    if (!resolvedTeacherId && teacherId) {
      resolvedTeacherId = teacherId;
    }
    if (!resolvedTeacherId) {
      const teacher = await Teacher.findOne({ subscription: subscription._id });
      if (teacher) {
        resolvedTeacherId = teacher._id;
      }
    }

    const updates = {
      status: 'cancelled',
      cancelledAt: new Date()
    };

    if (reason !== undefined) {
      updates.cancellationReason = reason;
    }
    if (cancelledBy) {
      updates.cancelledBy = cancelledBy;
    }
    if (resolvedTeacherId) {
      updates.teacherId = resolvedTeacherId;
    }

    const updatedSubscription = await Subscription.findByIdAndUpdate(
      subscriptionId,
      { $set: updates },
      { new: true, runValidators: false }
    );

    if (!updatedSubscription) {
      return res.status(404).json({
        success: false,
        message: 'الاشتراك غير موجود'
      });
    }

    // إعادة تعيين حدود المعلم
    let teacherToUpdate = null;
    if (resolvedTeacherId) {
      teacherToUpdate = await Teacher.findById(resolvedTeacherId);
    }
    if (!teacherToUpdate) {
      teacherToUpdate = await Teacher.findOne({ subscription: updatedSubscription._id });
    }

    if (teacherToUpdate) {
      teacherToUpdate.currentLimits.maxStudents = 0;
      teacherToUpdate.currentLimits.maxExams = 0;
      teacherToUpdate.currentLimits.maxQuestions = 0;
      await teacherToUpdate.save();
    }

    res.status(200).json({
      success: true,
      message: 'تم إلغاء الاشتراك بنجاح',
      data: updatedSubscription
    });
  } catch (error) {
    console.error('خطأ في إلغاء الاشتراك:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في إلغاء الاشتراك',
      error: error.message
    });
  }
};

// 5. تجديد الاشتراك
exports.renewSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { amount, paymentMethod } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'الاشتراك غير موجود'
      });
    }

    // الحصول على الباقة
    const plan = await Plan.findById(subscription.planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'الباقة غير موجودة'
      });
    }

    // حساب تاريخ الانتهاء الجديد بناءً على الباقة
    let newEndDate = new Date(subscription.endDate);
    
    switch (plan.durationUnit) {
      case 'days':
        newEndDate.setDate(newEndDate.getDate() + plan.duration);
        break;
      case 'months':
        newEndDate.setMonth(newEndDate.getMonth() + plan.duration);
        break;
      case 'years':
        newEndDate.setFullYear(newEndDate.getFullYear() + plan.duration);
        break;
      default:
        newEndDate.setDate(newEndDate.getDate() + plan.duration);
    }

    // تحديث تاريخ الانتهاء
    subscription.endDate = newEndDate;
    subscription.status = 'active';
    subscription.paymentStatus = 'paid';
    subscription.paymentDate = new Date();
    
    if (amount) subscription.amount = amount;
    if (paymentMethod) subscription.paymentMethod = paymentMethod;
    
    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'تم تجديد الاشتراك بنجاح',
      data: subscription
    });
  } catch (error) {
    console.error('خطأ في تجديد الاشتراك:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تجديد الاشتراك',
      error: error.message
    });
  }
};

// 6. تغيير باقة الاشتراك
exports.changePlan = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { newPlanId, customEndDate, amount } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'الاشتراك غير موجود'
      });
    }

    // التحقق من وجود الباقة الجديدة
    const newPlan = await Plan.findById(newPlanId);
    if (!newPlan) {
      return res.status(404).json({
        success: false,
        message: 'الباقة الجديدة غير موجودة'
      });
    }

    // تحديث الاشتراك
    subscription.planId = newPlanId;
    
    // حساب تاريخ الانتهاء بناءً على الباقة الجديدة إذا لم يتم تحديد تاريخ مخصص
    if (customEndDate) {
      subscription.endDate = new Date(customEndDate);
    } else {
      // حساب تاريخ انتهاء جديد بناءً على الباقة الجديدة
      let newEndDate = new Date(); // تاريخ البدء من الآن
      
      switch (newPlan.durationUnit) {
        case 'days':
          newEndDate.setDate(newEndDate.getDate() + newPlan.duration);
          break;
        case 'months':
          newEndDate.setMonth(newEndDate.getMonth() + newPlan.duration);
          break;
        case 'years':
          newEndDate.setFullYear(newEndDate.getFullYear() + newPlan.duration);
          break;
        default:
          newEndDate.setDate(newEndDate.getDate() + newPlan.duration);
      }
      
      subscription.endDate = newEndDate;
    }
    
    if (amount) subscription.amount = amount;
    
    await subscription.save();

    // تحديث حدود المعلم
    const teacher = await Teacher.findById(subscription.teacherId);
    if (teacher) {
      teacher.updateLimitsFromPlan(newPlan);
      await teacher.save();
    }

    res.status(200).json({
      success: true,
      message: 'تم تغيير الباقة بنجاح',
      data: subscription
    });
  } catch (error) {
    console.error('خطأ في تغيير الباقة:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تغيير الباقة',
      error: error.message
    });
  }
};

// 7. الحصول على جميع الاشتراكات
exports.getAllSubscriptions = async (req, res) => {
  try {
    const { status, teacherId, planId } = req.query;
    
    let filter = {};
    if (status) filter.status = status;
    if (teacherId) filter.teacherId = teacherId;
    if (planId) filter.planId = planId;

    const subscriptions = await Subscription.find(filter)
      .populate('teacherId', 'name email')
      .populate('planId', 'name price maxStudents maxExams maxQuestions')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    console.error('خطأ في الحصول على الاشتراكات:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الحصول على الاشتراكات',
      error: error.message
    });
  }
};

// 8. تحديث حالة الدفع
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const {
      paymentStatus,
      paymentDate,
      notes,
      paymentMethod,
      amount,
      teacherId,
      planId,
      newEndDate
    } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'الاشتراك غير موجود'
      });
    }

    // محاولة ربط المعلم إذا كان مفقوداً
    let resolvedTeacherId = subscription.teacherId;
    if (!resolvedTeacherId && teacherId) {
      resolvedTeacherId = teacherId;
    }
    if (!resolvedTeacherId) {
      const teacher = await Teacher.findOne({ subscription: subscription._id });
      if (teacher) {
        resolvedTeacherId = teacher._id;
      }
    }

    // محاولة ربط الباقة إذا كانت مفقودة
    let resolvedPlanId = subscription.planId;
    if (!resolvedPlanId && planId) {
      resolvedPlanId = planId;
    }

    let plan = null;
    if (resolvedPlanId) {
      plan = await Plan.findById(resolvedPlanId);
      if (!plan && planId) {
        return res.status(404).json({
          success: false,
          message: 'الباقة غير موجودة'
        });
      }
    }

    const updates = {};

    if (resolvedTeacherId) {
      updates.teacherId = resolvedTeacherId;
    }

    if (plan) {
      updates.planId = plan._id;
    }

    if (paymentStatus) {
      updates.paymentStatus = paymentStatus;
    }

    if (paymentDate) {
      updates.paymentDate = new Date(paymentDate);
    }

    if (paymentMethod) {
      updates.paymentMethod = paymentMethod;
    }

    if (notes !== undefined) {
      updates.notes = notes;
    }

    // تحديث أو حساب مبلغ الدفع
    let amountToSet = subscription.amount;
    if (amount !== undefined && amount !== '') {
      const parsedAmount = Number(amount);
      if (!Number.isNaN(parsedAmount)) {
        amountToSet = parsedAmount;
      }
    } else if ((subscription.amount === undefined || subscription.amount === null) && plan) {
      amountToSet = plan.price;
    }

    if (amountToSet !== undefined && amountToSet !== null) {
      updates.amount = amountToSet;
    }

    // تحديث تاريخ الانتهاء إذا كان مفقوداً أو تم تمرير تاريخ جديد
    if (newEndDate) {
      updates.endDate = new Date(newEndDate);
    } else if (!subscription.endDate && plan) {
      const calculatedEndDate = subscription.startDate ? new Date(subscription.startDate) : new Date();
      switch (plan.durationUnit) {
        case 'days':
          calculatedEndDate.setDate(calculatedEndDate.getDate() + plan.duration);
          break;
        case 'months':
          calculatedEndDate.setMonth(calculatedEndDate.getMonth() + plan.duration);
          break;
        case 'years':
          calculatedEndDate.setFullYear(calculatedEndDate.getFullYear() + plan.duration);
          break;
        default:
          calculatedEndDate.setDate(calculatedEndDate.getDate() + plan.duration);
      }
      updates.endDate = calculatedEndDate;
    }

    // تحديث حالة الاشتراك إذا تم الدفع
    if (
      paymentStatus === 'paid' &&
      (subscription.status === 'pending' || subscription.status === 'inactive')
    ) {
      updates.status = 'active';
    }

    const updatedSubscription = await Subscription.findByIdAndUpdate(
      subscriptionId,
      { $set: updates },
      { new: true, runValidators: false }
    );

    if (!updatedSubscription) {
      return res.status(404).json({
        success: false,
        message: 'الاشتراك غير موجود'
      });
    }

    // تحديث حدود المعلم إذا توفر المعلم والباقة
    const planForLimits = plan || (updatedSubscription.planId ? await Plan.findById(updatedSubscription.planId) : null);
    if (updatedSubscription.teacherId && planForLimits) {
      const teacherToUpdate = await Teacher.findById(updatedSubscription.teacherId);
      if (teacherToUpdate) {
        teacherToUpdate.updateLimitsFromPlan(planForLimits);
        await teacherToUpdate.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'تم تحديث حالة الدفع بنجاح',
      data: updatedSubscription
    });
  } catch (error) {
    console.error('خطأ في تحديث حالة الدفع:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تحديث حالة الدفع',
      error: error.message
    });
  }
};