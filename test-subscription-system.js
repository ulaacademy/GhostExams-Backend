// ملف اختبار بسيط لنظام الاشتراكات الجديد
const mongoose = require('mongoose');
const Teacher = require('./models/Teacher');
const Plan = require('./models/Plan');
const Subscription = require('./models/Subscription');

// الاتصال بقاعدة البيانات
mongoose.connect('mongodb://localhost:27017/ula-csc-test', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testSubscriptionSystem() {
  try {
    console.log('بدء اختبار نظام الاشتراكات...');

    // 1. إنشاء باقة تجريبية
    console.log('\n1. إنشاء باقة تجريبية...');
    const plan = new Plan({
      name: 'الباقة التجريبية',
      description: 'باقة للاختبار',
      price: 10,
      currency: 'JOD',
      maxStudents: 25,
      maxExams: 5,
      maxQuestions: 100,
      duration: 30,
      durationUnit: 'days',
      features: ['دعم فني', 'تقارير']
    });
    await plan.save();
    console.log('تم إنشاء الباقة:', plan.name);

    // 2. إنشاء معلم تجريبي
    console.log('\n2. إنشاء معلم تجريبي...');
    const teacher = new Teacher({
      name: 'أحمد محمد',
      email: 'ahmed@test.com',
      password: 'password123',
      subjects: ['الرياضيات', 'العلوم']
    });
    await teacher.save();
    console.log('تم إنشاء المعلم:', teacher.name);

    // 3. إنشاء اشتراك تجريبي
    console.log('\n3. إنشاء اشتراك تجريبي...');
    const subscription = new Subscription({
      teacherId: teacher._id,
      planId: plan._id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 يوم من الآن
      paymentMethod: 'bank_transfer',
      amount: plan.price,
      currency: plan.currency,
      status: 'pending'
    });
    await subscription.save();
    console.log('تم إنشاء الاشتراك');

    // 4. تحديث المعلم بالاشتراك والحدود
    console.log('\n4. تحديث المعلم بالاشتراك والحدود...');
    teacher.subscription = subscription._id;
    teacher.updateLimitsFromPlan(plan);
    await teacher.save();
    console.log('حدود المعلم:', teacher.currentLimits);

    // 5. اختبار حدود الاستخدام
    console.log('\n5. اختبار حدود الاستخدام...');
    console.log('يمكن إضافة طالب؟', teacher.canAddStudent());
    console.log('يمكن إنشاء امتحان؟', teacher.canCreateExam());
    console.log('يمكن إضافة سؤال؟', teacher.canAddQuestion());

    // 6. اختبار زيادة الاستخدام
    console.log('\n6. اختبار زيادة الاستخدام...');
    teacher.incrementUsage('student', 5);
    teacher.incrementUsage('exam', 2);
    teacher.incrementUsage('question', 20);
    await teacher.save();
    console.log('الاستخدام الحالي:', teacher.currentUsage);

    // 7. اختبار الحدود مرة أخرى
    console.log('\n7. اختبار الحدود بعد الاستخدام...');
    console.log('يمكن إضافة طالب؟', teacher.canAddStudent());
    console.log('يمكن إنشاء امتحان؟', teacher.canCreateExam());
    console.log('يمكن إضافة سؤال؟', teacher.canAddQuestion());

    // 8. تفعيل الاشتراك
    console.log('\n8. تفعيل الاشتراك...');
    subscription.status = 'active';
    subscription.paymentStatus = 'paid';
    subscription.paymentDate = new Date();
    await subscription.save();
    console.log('تم تفعيل الاشتراك');

    // 9. اختبار دالة انتهاء الاشتراك
    console.log('\n9. اختبار دالة انتهاء الاشتراك...');
    console.log('الاشتراك منتهي؟', subscription.isExpired());
    console.log('الاشتراك صالح؟', subscription.isValid());

    console.log('\n✅ تم الانتهاء من اختبار النظام بنجاح!');

  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error);
  } finally {
    // تنظيف البيانات التجريبية
    await Teacher.deleteMany({ email: 'ahmed@test.com' });
    await Plan.deleteMany({ name: 'الباقة التجريبية' });
    await Subscription.deleteMany({ teacherId: { $exists: true } });
    console.log('\nتم تنظيف البيانات التجريبية');
    
    mongoose.connection.close();
  }
}

// تشغيل الاختبار
testSubscriptionSystem();
