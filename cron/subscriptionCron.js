const cron = require('node-cron');
const { checkExpiredSubscriptions, notifyUpcomingExpirations } = require('../utils/subscriptionUtils');

// تشغيل فحص الاشتراكات المنتهية كل يوم في الساعة 12:00 صباحاً
cron.schedule('0 0 * * *', async () => {
  console.log('بدء فحص الاشتراكات المنتهية...');
  try {
    const result = await checkExpiredSubscriptions();
    console.log(`تم تحديث ${result.expiredCount} اشتراك منتهي`);
    if (result.disabledCount > 0) {
      console.log(`تم تعطيل ${result.disabledCount} حساب بسبب انتهاء الباقات المجانية`);
    }
  } catch (error) {
    console.error('خطأ في فحص الاشتراكات المنتهية:', error);
  }
});

// إشعار المعلمين بانتهاء اشتراكهم خلال 7 أيام (كل يوم في الساعة 9:00 صباحاً)
cron.schedule('0 9 * * *', async () => {
  console.log('بدء إشعار الاشتراكات المنتهية قريباً...');
  try {
    const upcomingCount = await notifyUpcomingExpirations(7);
    console.log(`تم إشعار ${upcomingCount.length} معلم بانتهاء اشتراكهم قريباً`);
  } catch (error) {
    console.error('خطأ في إشعار الاشتراكات المنتهية قريباً:', error);
  }
});

// إشعار المعلمين بانتهاء اشتراكهم خلال 3 أيام (كل يوم في الساعة 9:00 صباحاً)
cron.schedule('0 9 * * *', async () => {
  console.log('بدء إشعار الاشتراكات المنتهية خلال 3 أيام...');
  try {
    const upcomingCount = await notifyUpcomingExpirations(3);
    console.log(`تم إشعار ${upcomingCount.length} معلم بانتهاء اشتراكهم خلال 3 أيام`);
  } catch (error) {
    console.error('خطأ في إشعار الاشتراكات المنتهية خلال 3 أيام:', error);
  }
});

console.log('تم تشغيل مهام cron لإدارة الاشتراكات');

module.exports = {
  // يمكن إضافة دوال أخرى هنا إذا لزم الأمر
};
