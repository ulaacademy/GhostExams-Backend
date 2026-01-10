const mongoose = require("mongoose");

// ✅ Ghost Teachers IDs
const GHOST_TEACHERS = new Set([
  "695c379a76bfebc62783b4a5", // Ghost History 2009
  "6945cbc643cff502c6460873", // GHOST ISLAMIC 2009
  "6945bfcd43cff502c645f5ee", // GHOST ARABIC 2009
  "6945bd19f63cff3e4bd2d854", // GHOST ENGLISH 2009
]);

const isGhostTeacherId = (id) => GHOST_TEACHERS.has(String(id));

// ✅ Unlimited limits values (safe big numbers)
const GHOST_LIMITS = {
  maxStudents: 999,
  maxExams: 999999999,
  maxQuestions: 999999999,
};

const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, default: null },
  password: { type: String, required: true },
  subjects: [{ type: String, required: false }],
  profileImage: { type: String },
  examsCreated: [{ type: mongoose.Schema.Types.ObjectId, ref: "Exam" }],
  role: { type: String, default: "teacher" },
  isBanned: { type: Boolean, default: false },

  // حدود الاستخدام الحالية
  currentLimits: {
    maxStudents: { type: Number, default: 0 },
    maxExams: { type: Number, default: 0 },
    maxQuestions: { type: Number, default: 0 },
  },

  // إحصائيات الاستخدام الحالي
  currentUsage: {
    studentsCount: { type: Number, default: 0 },
    examsCount: { type: Number, default: 0 },
    questionsCount: { type: Number, default: 0 },
  },

  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subscription",
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// تحديث updatedAt تلقائياً قبل الحفظ
teacherSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// ✅ دالة مساعدة: لو Ghost رجّع limits الخاصة فيه
teacherSchema.methods.getEffectiveLimits = function () {
  if (isGhostTeacherId(this._id)) return GHOST_LIMITS;
  return this.currentLimits;
};

// ✅ دالة للتحقق من إمكانية إضافة طالب جديد
teacherSchema.methods.canAddStudent = function () {
  const limits = this.getEffectiveLimits();
  return this.currentUsage.studentsCount < limits.maxStudents;
};

// ✅ دالة للتحقق من إمكانية إنشاء امتحان جديد
teacherSchema.methods.canCreateExam = function () {
  const limits = this.getEffectiveLimits();
  return this.currentUsage.examsCount < limits.maxExams;
};

// ✅ دالة للتحقق من إمكانية إضافة سؤال جديد
teacherSchema.methods.canAddQuestion = function () {
  const limits = this.getEffectiveLimits();
  return this.currentUsage.questionsCount < limits.maxQuestions;
};

// ✅ دالة لتحديث حدود الاستخدام من الباقة
teacherSchema.methods.updateLimitsFromPlan = function (plan) {
  // ✅ Ghost Teachers: ignore plan, keep unlimited
  if (isGhostTeacherId(this._id)) {
    this.currentLimits.maxStudents = GHOST_LIMITS.maxStudents;
    this.currentLimits.maxExams = GHOST_LIMITS.maxExams;
    this.currentLimits.maxQuestions = GHOST_LIMITS.maxQuestions;
    return;
  }

  this.currentLimits.maxStudents = plan.maxStudents;
  this.currentLimits.maxExams = plan.maxExams;
  this.currentLimits.maxQuestions = plan.maxQuestions;
};

// دالة لزيادة عداد الاستخدام
teacherSchema.methods.incrementUsage = function (type, amount = 1) {
  switch (type) {
    case "student":
      this.currentUsage.studentsCount += amount;
      break;
    case "exam":
      this.currentUsage.examsCount += amount;
      break;
    case "question":
      this.currentUsage.questionsCount += amount;
      break;
  }
};

// دالة لتقليل عداد الاستخدام
teacherSchema.methods.decrementUsage = function (type, amount = 1) {
  switch (type) {
    case "student":
      this.currentUsage.studentsCount = Math.max(
        0,
        this.currentUsage.studentsCount - amount
      );
      break;
    case "exam":
      this.currentUsage.examsCount = Math.max(
        0,
        this.currentUsage.examsCount - amount
      );
      break;
    case "question":
      this.currentUsage.questionsCount = Math.max(
        0,
        this.currentUsage.questionsCount - amount
      );
      break;
  }
};

const Teacher = mongoose.model("Teacher", teacherSchema);
module.exports = Teacher;
