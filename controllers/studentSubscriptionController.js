// backend/controllers/studentSubscriptionController.js
const StudentSubscription = require("../models/StudentSubscription");
const StudentPlan = require("../models/StudentPlan");

const addDuration = (startDate, duration, unit) => {
  const d = new Date(startDate);

  if (unit === "days") d.setDate(d.getDate() + duration);
  else if (unit === "months") d.setMonth(d.getMonth() + duration);
  else if (unit === "years") d.setFullYear(d.getFullYear() + duration);
  else d.setDate(d.getDate() + duration); // fallback

  return d;
};

const buildPlanSnapshot = (plan) => ({
  name: plan.name,
  price: plan.price,
  currency: plan.currency,
  maxTeachers: plan.maxTeachers,
  teacherType: plan.teacherType,
  duration: plan.duration,
  durationUnit: plan.durationUnit,
  freeExtraTeachers: plan.freeExtraTeachers || 0,
});

exports.createStudentSubscription = async (req, res) => {
  try {
    const {
      studentId,
      planId,
      customStartDate,
      customEndDate,
      paymentMethod,
      amount,
      currency,
      notes,
      source,
    } = req.body;

    if (!studentId || !planId) {
      return res
        .status(400)
        .json({ success: false, message: "studentId و planId مطلوبين" });
    }

    const plan = await StudentPlan.findById(planId);
    if (!plan || !plan.isActive) {
      return res
        .status(404)
        .json({ success: false, message: "الخطة غير موجودة أو غير فعّالة" });
    }

    // ✅ 1) امنع إرسال أكثر من طلب (Pending)
    const existingPending = await StudentSubscription.findOne({
      studentId,
      status: "pending",
      isActive: true,
      // (اختياري) لو عندك حالات دفع: paymentStatus: "pending"
    }).lean();

    if (existingPending) {
      return res.status(409).json({
        success: false,
        message:
          "✅ تم إرسال طلبك سابقًا وهو قيد المراجعة. الرجاء الانتظار لتفعيل الاشتراك.",
        pendingSubscription: existingPending,
      });
    }

    // ✅ 2) امنع إنشاء جديد إذا في اشتراك فعّال (Active)
    const existingActive = await StudentSubscription.findOne({
      studentId,
      status: "active",
      isActive: true,
      endDate: { $gt: new Date() },
    }).lean();

    if (existingActive) {
      return res.status(409).json({
        success: false,
        message: "يوجد اشتراك طالب فعّال بالفعل. لا يمكنك إرسال طلب جديد الآن.",
        activeSubscription: existingActive,
      });
    }

    // ✅ 3) تحديد start/end: إذا الواجهة بترسل customStartDate/customEndDate استخدمهم وإلا احسب من الخطة
    let startDate = customStartDate ? new Date(customStartDate) : new Date();
    let endDate;

    if (customEndDate) {
      endDate = new Date(customEndDate);
    } else {
      endDate = addDuration(startDate, plan.duration, plan.durationUnit);
    }

    if (
      isNaN(startDate.getTime()) ||
      isNaN(endDate.getTime()) ||
      endDate <= startDate
    ) {
      return res.status(400).json({
        success: false,
        message: "تواريخ الاشتراك غير صحيحة (startDate / endDate).",
      });
    }

    // ✅ 4) إنشاء الطلب Pending
    const sub = await StudentSubscription.create({
      studentId,
      planId,
      planSnapshot: buildPlanSnapshot(plan),
      status: "pending",
      paymentStatus: "pending",
      startDate,
      endDate,
      isActive: true,

      // (اختياري) نخزن بيانات الدفع/الملاحظات لو موجودة عندك في الموديل
      paymentMethod: paymentMethod || "cash",
      amount: typeof amount === "number" ? amount : undefined,
      currency: currency || "JOD",
      notes: notes || "",
      source: source || "student-portal",
    });

    return res.status(201).json({
      success: true,
      message:
        "✅ تم إرسال طلب اشتراكك بنجاح. الرجاء الانتظار لتفعيل الاشتراك بعد تأكيد الدفع (خلال 24 ساعة).",
      subscription: sub,
    });
  } catch (err) {
    console.error("❌ createStudentSubscription:", err);
    return res
      .status(500)
      .json({ success: false, message: "خطأ في إنشاء اشتراك الطالب" });
  }
};

exports.getStudentSubscriptions = async (req, res) => {
  try {
    const { studentId } = req.params;
    const list = await StudentSubscription.find({ studentId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: list });
  } catch (err) {
    console.error("❌ getStudentSubscriptions:", err);
    return res.status(500).json({ message: "خطأ في جلب اشتراكات الطالب" });
  }
};

exports.getActiveStudentSubscription = async (req, res) => {
  try {
    const { studentId } = req.params;

    const active = await StudentSubscription.findOne({
      studentId,
      status: "active",
      isActive: true,
      endDate: { $gt: new Date() },
    }).lean();

    if (!active) {
      return res.status(404).json({ success: false, data: null });
    }

    return res.json({ success: true, data: active });
  } catch (err) {
    console.error("❌ getActiveStudentSubscription:", err);
    return res
      .status(500)
      .json({ message: "خطأ في جلب الاشتراك النشط للطالب" });
  }
};

exports.activateStudentSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const sub = await StudentSubscription.findById(subscriptionId);
    if (!sub) return res.status(404).json({ message: "الاشتراك غير موجود" });

    sub.paymentStatus = "paid";
    sub.status = "active";
    sub.isActive = true;

    await sub.save();

    return res.json({ success: true, subscription: sub });
  } catch (err) {
    console.error("❌ activateStudentSubscription:", err);
    return res.status(500).json({ message: "خطأ في تفعيل اشتراك الطالب" });
  }
};

exports.deactivateStudentSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const sub = await StudentSubscription.findById(subscriptionId);
    if (!sub) return res.status(404).json({ message: "الاشتراك غير موجود" });

    sub.isActive = false;
    sub.status = "canceled";

    await sub.save();

    return res.json({ success: true, subscription: sub });
  } catch (err) {
    console.error("❌ deactivateStudentSubscription:", err);
    return res
      .status(500)
      .json({ message: "خطأ في إلغاء تفعيل اشتراك الطالب" });
  }
};

exports.renewStudentSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const sub = await StudentSubscription.findById(subscriptionId);
    if (!sub) return res.status(404).json({ message: "الاشتراك غير موجود" });

    // ✅ نمدد من آخر endDate إذا لسه مستمر، أو من الآن إذا منتهي
    const base = sub.endDate > new Date() ? sub.endDate : new Date();
    const duration = sub.planSnapshot?.duration || 30;
    const unit = sub.planSnapshot?.durationUnit || "days";
    sub.endDate = addDuration(base, duration, unit);

    sub.status = "active";
    sub.isActive = true;

    await sub.save();
    return res.json({ success: true, subscription: sub });
  } catch (err) {
    console.error("❌ renewStudentSubscription:", err);
    return res.status(500).json({ message: "خطأ في تجديد اشتراك الطالب" });
  }
};

exports.changeStudentPlan = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { newPlanId } = req.body;

    if (!newPlanId) {
      return res.status(400).json({ message: "newPlanId مطلوب" });
    }

    const sub = await StudentSubscription.findById(subscriptionId);
    if (!sub) return res.status(404).json({ message: "الاشتراك غير موجود" });

    const plan = await StudentPlan.findById(newPlanId);
    if (!plan || !plan.isActive) {
      return res
        .status(404)
        .json({ message: "الخطة الجديدة غير موجودة أو غير فعّالة" });
    }

    sub.planId = newPlanId;
    sub.planSnapshot = buildPlanSnapshot(plan);

    // ✅ إعادة حساب endDate من الآن (تقدر تغيرها حسب سياستك)
    const startDate = new Date();
    sub.startDate = startDate;
    sub.endDate = addDuration(startDate, plan.duration, plan.durationUnit);

    await sub.save();

    return res.json({ success: true, subscription: sub });
  } catch (err) {
    console.error("❌ changeStudentPlan:", err);
    return res.status(500).json({ message: "خطأ في تغيير خطة الطالب" });
  }
};

exports.updateStudentPaymentStatus = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { paymentStatus } = req.body;

    const allowed = ["pending", "paid", "failed", "refunded"];
    if (!allowed.includes(paymentStatus)) {
      return res.status(400).json({ message: "paymentStatus غير صالح" });
    }

    const sub = await StudentSubscription.findById(subscriptionId);
    if (!sub) return res.status(404).json({ message: "الاشتراك غير موجود" });

    sub.paymentStatus = paymentStatus;

    // ✅ لو صار paid نفعّله
    if (paymentStatus === "paid") {
      sub.status = "active";
      sub.isActive = true;
    }

    await sub.save();
    return res.json({ success: true, subscription: sub });
  } catch (err) {
    console.error("❌ updateStudentPaymentStatus:", err);
    return res.status(500).json({ message: "خطأ في تحديث حالة الدفع" });
  }
};

// ✅ Admin/List: جلب كل اشتراكات الطلاب (مع فلاتر اختيارية)
exports.getAllStudentSubscriptions = async (req, res) => {
  try {
    const { status, paymentStatus, studentId } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (studentId) filter.studentId = studentId;

    const list = await StudentSubscription.find(filter)
      .populate("studentId", "name email phone")
      .populate(
        "planId",
        "name price currency maxTeachers duration durationUnit"
      )
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: list });
  } catch (err) {
    console.error("❌ getAllStudentSubscriptions:", err);
    return res.status(500).json({ message: "خطأ في جلب اشتراكات الطلاب" });
  }
};

// ✅ GET /api/student-subscriptions/me
exports.getMySubscriptionStatus = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "student") {
      return res.status(403).json({ message: "❌ هذا الإجراء للطلاب فقط." });
    }

    const studentId = req.user.userId || req.user.id || req.user._id;

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // ✅ اشتراك فعّال
    const activeSubscription = await StudentSubscription.findOne({
      studentId,
      status: "active",
      isActive: true,
      paymentStatus: "paid",
      endDate: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .lean();

    // ✅ طلب اشتراك (Pending) خلال 24 ساعة فقط
    const pendingSubscription = await StudentSubscription.findOne({
      studentId,
      status: { $in: ["pending", "requested"] }, // ✅ إذا عندك اسم status مختلف عدّله هون
      createdAt: { $gte: last24h },
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      activeSubscription,
      pendingSubscription,
    });
  } catch (e) {
    console.error("❌ getMySubscriptionStatus:", e);
    return res.status(500).json({ message: "❌ خطأ بجلب حالة اشتراك الطالب" });
  }
};
