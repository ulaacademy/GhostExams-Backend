const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true,
    unique: true // كل أستاذ له اشتراك واحد فقط
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired', 'cancelled', 'pending'],
    default: 'pending'
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
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'cash', 'check', 'online', 'credit_card'],
    default: 'bank_transfer'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'unpaid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentDate: Date,
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'JOD'
  },
  notes: {
    type: String,
    trim: true
  },
  cancelledAt: Date,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // من قام بالإلغاء
  },
  cancellationReason: String,
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
subscriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// إضافة فهارس للبحث السريع
subscriptionSchema.index({ teacherId: 1 });
subscriptionSchema.index({ planId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ endDate: 1 });

// دالة للتحقق من انتهاء الاشتراك
subscriptionSchema.methods.isExpired = function() {
  return this.endDate < new Date();
};

// دالة للتحقق من صحة الاشتراك
subscriptionSchema.methods.isValid = function() {
  return this.status === 'active' && !this.isExpired();
};

module.exports = mongoose.model('Subscription', subscriptionSchema);