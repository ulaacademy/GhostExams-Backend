// مثال على كيفية إعداد النظام الجديد في app.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// استيراد routes الجديدة
const planRoutes = require('./routes/planRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');

// استيراد cron jobs
require('./cron/subscriptionCron');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ula-csc', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// استخدام routes الجديدة
app.use('/api/plans', planRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Routes الأخرى الموجودة...
// app.use('/api/auth', authRoutes);
// app.use('/api/teachers', teacherRoutes);
// إلخ...

// مثال على كيفية استخدام middleware للتحقق من حدود الاستخدام
const { checkUsageLimits, updateUsageCount } = require('./middleware/usageLimits');

// مثال: إضافة طالب جديد مع التحقق من الحدود
app.post('/api/students', 
  checkUsageLimits('student'), 
  updateUsageCount('student'), 
  (req, res) => {
    // منطق إضافة الطالب
    res.json({ success: true, message: 'تم إضافة الطالب بنجاح' });
  }
);

// مثال: إنشاء امتحان جديد مع التحقق من الحدود
app.post('/api/exams', 
  checkUsageLimits('exam'), 
  updateUsageCount('exam'), 
  (req, res) => {
    // منطق إنشاء الامتحان
    res.json({ success: true, message: 'تم إنشاء الامتحان بنجاح' });
  }
);

// مثال: إضافة سؤال جديد مع التحقق من الحدود
app.post('/api/questions', 
  checkUsageLimits('question'), 
  updateUsageCount('question'), 
  (req, res) => {
    // منطق إضافة السؤال
    res.json({ success: true, message: 'تم إضافة السؤال بنجاح' });
  }
);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`الخادم يعمل على المنفذ ${PORT}`);
  console.log('تم تشغيل نظام الاشتراكات الجديد');
});
