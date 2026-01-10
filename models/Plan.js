const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'JOD',
    enum: ['JOD', 'SAR', 'USD', 'EUR']
  },
  maxStudents: {
    type: Number,
    required: true,
    min: 1
  },
  maxExams: {
    type: Number,
    required: true,
    min: 1
  },
  maxQuestions: {
    type: Number,
    required: true,
    min: 1
  },
  duration: {
    type: Number,
    required: true,
    min: 1,
    default: 30 // عدد الأيام
  },
  durationUnit: {
    type: String,
    enum: ['days', 'months', 'years'],
    default: 'days'
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  features: [{
    type: String,
    trim: true
  }],
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
planSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// إضافة فهرس للبحث السريع
planSchema.index({ name: 1 });
planSchema.index({ isActive: 1 });

module.exports = mongoose.model('Plan', planSchema);
