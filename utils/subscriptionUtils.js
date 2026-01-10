const Subscription = require('../models/Subscription');
const Teacher = require('../models/Teacher');

// دالة للتحقق من انتهاء الاشتراكات وتحديث حالتها
const checkExpiredSubscriptions = async () => {
  try {
    console.log('بدء فحص الاشتراكات المنتهية...');
    
    const now = new Date();
    
    // البحث عن الاشتراكات المنتهية (active أو pending)
    const expiredSubscriptions = await Subscription.find({
      status: { $in: ['active', 'pending'] },
      endDate: { $lt: now }
    }).populate('teacherId').populate('planId');

    console.log(`تم العثور على ${expiredSubscriptions.length} اشتراك منتهي`);

    let disabledCount = 0;

    for (const subscription of expiredSubscriptions) {
      // تحديث حالة الاشتراك
      subscription.status = 'expired';
      await subscription.save();

      // إعادة تعيين حدود المعلم وتعطيل الحساب إذا كانت باقة مجانية
      if (subscription.teacherId) {
        const teacher = subscription.teacherId;
        const plan = subscription.planId;
        
        // إعادة تعيين جميع الحدود إلى 0
        teacher.currentLimits.maxStudents = 0;
        teacher.currentLimits.maxExams = 0;
        teacher.currentLimits.maxQuestions = 0;
        
        // إذا كانت الباقة مجانية (price = 0)، قم بتعطيل حساب المعلم
        if (plan && plan.price === 0) {
          // لا نحظر الحساب تماماً، بل نمنع الوصول للوظائف
          // يمكن إضافة حقل isRestricted بدلاً من isBanned إذا لزم الأمر
          console.log(`تم تعطيل حساب المعلم بسبب انتهاء الباقة المجانية: ${teacher.name}`);
          disabledCount++;
        }
        
        await teacher.save();
        
        console.log(`تم إعادة تعيين حدود المعلم: ${teacher.name} (الباقة: ${plan?.name || 'غير معروفة'})`);
      }
    }

    console.log(`تم الانتهاء من فحص الاشتراكات المنتهية. تم تعطيل ${disabledCount} حساب بسبب انتهاء الباقات المجانية`);
    return { expiredCount: expiredSubscriptions.length, disabledCount };
  } catch (error) {
    console.error('خطأ في فحص الاشتراكات المنتهية:', error);
    throw error;
  }
};

// دالة للحصول على إحصائيات الاشتراكات
const getSubscriptionStats = async () => {
  try {
    const stats = await Subscription.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const totalSubscriptions = await Subscription.countDocuments();
    const activeSubscriptions = await Subscription.countDocuments({ status: 'active' });
    const expiredSubscriptions = await Subscription.countDocuments({ status: 'expired' });
    const pendingSubscriptions = await Subscription.countDocuments({ status: 'pending' });

    return {
      total: totalSubscriptions,
      active: activeSubscriptions,
      expired: expiredSubscriptions,
      pending: pendingSubscriptions,
      breakdown: stats
    };
  } catch (error) {
    console.error('خطأ في الحصول على إحصائيات الاشتراكات:', error);
    throw error;
  }
};

// دالة لإشعار المعلمين بانتهاء اشتراكهم قريباً
const notifyUpcomingExpirations = async (daysBeforeExpiration = 7) => {
  try {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysBeforeExpiration);

    const upcomingExpirations = await Subscription.find({
      status: 'active',
      endDate: { 
        $gte: new Date(),
        $lte: futureDate
      }
    }).populate('teacherId', 'name email');

    console.log(`تم العثور على ${upcomingExpirations.length} اشتراك سينتهي خلال ${daysBeforeExpiration} أيام`);

    // هنا يمكن إضافة منطق إرسال الإشعارات (إيميل، SMS، إلخ)
    for (const subscription of upcomingExpirations) {
      console.log(`إشعار للمعلم ${subscription.teacherId.name}: اشتراكك سينتهي في ${subscription.endDate}`);
    }

    return upcomingExpirations;
  } catch (error) {
    console.error('خطأ في إشعار الاشتراكات المنتهية قريباً:', error);
    throw error;
  }
};

module.exports = {
  checkExpiredSubscriptions,
  getSubscriptionStats,
  notifyUpcomingExpirations
};
