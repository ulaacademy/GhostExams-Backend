const mongoose = require('mongoose');

const studentPlanSchema = new mongoose.Schema({
  // اسم الحزمة
  name: {
    type: String,
    required: true,
    trim: true
  },

  // وصف (اختياري)
  description: {
    type: String,
    trim: true
  },

  // السعر
  price: {
    type: Number,
    required: true,
    min: 0
  },

  // العملة
  currency: {
    type: String,
    default: 'JOD',
    enum: ['JOD', 'SAR', 'USD', 'EUR']
  },

  // عدد المعلمين المسموح للطالب
  maxTeachers: {
    type: Number,
    required: true,
    min: 0
  },

  // نوع المعلم المسموح داخل الخطة: منصة / شبح / الاثنين
  teacherType: {
    type: String,
    required: true,
    enum: ['platform', 'ghost', 'both'],
    default: 'both'
  },

  // مدة الاشتراك
  duration: {
    type: Number,
    required: true,
    min: 1,
    default: 30
  },

  durationUnit: {
    type: String,
    enum: ['days', 'months', 'years'],
    default: 'days'
  },

  // تاريخ البدء والانتهاء
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },

  endDate: {
    type: Date,
    required: true
  },

  // (اختياري) مجاني: إضافة معلمين إضافيين (لا يظهر بالواجهة إلا إذا أدخلت رقم)
  freeExtraTeachers: {
    type: Number,
    default: 0,
    min: 0
  },

  // (اختياري) مجاني: إضافة عدد طلاب (لا يظهر بالواجهة إلا إذا أدخلت رقم)
  freeExtraStudents: {
    type: Number,
    default: 0,
    min: 0
  },

  // مزايا
  features: [{
    type: String,
    trim: true
  }],

  isActive: {
    type: Boolean,
    default: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// تحديث updatedAt تلقائياً قبل الحفظ
studentPlanSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// فهارس
studentPlanSchema.index({ name: 1 });
studentPlanSchema.index({ isActive: 1 });
studentPlanSchema.index({ teacherType: 1 });

module.exports = mongoose.model('StudentPlan', studentPlanSchema);
