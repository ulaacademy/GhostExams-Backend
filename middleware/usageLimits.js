const Teacher = require("../models/Teacher");
const Subscription = require("../models/Subscription");
const {
  AuthenticationError,
  AuthorizationError,
  SubscriptionLimitError,
  NotFoundError,
  ValidationError,
} = require("../utils/AppError");

const GHOST_TEACHERS = new Set([
  "69d108397f5781b881489620",
  "69d107ee7f5781b8814895e4",
  "69d106137f5781b881489450",
  "69d1072e7f5781b88148954a",
]);

const isGhostTeacherId = (id) => GHOST_TEACHERS.has(String(id));

// دالة مساعدة للتحقق من صحة الاشتراك
const isSubscriptionValid = async (subscriptionId) => {
  if (!subscriptionId) {
    return { valid: false, reason: "لا يوجد اشتراك" };
  }

  const subscription = await Subscription.findById(subscriptionId).populate(
    "planId"
  );

  if (!subscription) {
    return { valid: false, reason: "الاشتراك غير موجود" };
  }

  // التحقق من أن الاشتراك نشط
  if (subscription.status !== "active") {
    return {
      valid: false,
      reason: `الاشتراك غير نشط (الحالة: ${subscription.status})`,
    };
  }

  // التحقق من أن الاشتراك لم ينتهي
  const now = new Date();
  if (subscription.endDate < now) {
    return { valid: false, reason: "الاشتراك منتهي الصلاحية" };
  }

  // التحقق من أن الباقة نشطة
  if (subscription.planId && !subscription.planId.isActive) {
    return { valid: false, reason: "الباقة غير نشطة" };
  }

  return { valid: true, subscription };
};

// middleware للتحقق من حدود الاستخدام
const checkUsageLimits = (type) => {
  return async (req, res, next) => {
    try {
      // ✅ For student subscriptions, teacherId comes from body, not user
      // ✅ For teacher operations, teacherId comes from user (authenticated teacher)
      // ✅ Prioritize req.user.id for teacher operations to prevent teachers from acting on behalf of others
      let teacherId;

      if (req.user?.role === "teacher") {
        // ✅ For teacher operations, always use authenticated teacher's ID (security)
        teacherId = req.user?.id || req.user?._id || req.user?.userId;
      } else {
        // ✅ For student operations (like subscribing), teacherId comes from body/params
        teacherId = req.body?.teacherId || req.params?.teacherId;
      }

      if (!teacherId) {
        console.error("❌ No teacherId found:", {
          hasUser: !!req.user,
          userRole: req.user?.role,
          userId: req.user?.id,
          userUserId: req.user?.userId,
          user_id: req.user?._id,
          bodyTeacherId: req.body?.teacherId,
        });
        throw new ValidationError("معرف المعلم مطلوب");
      }

      // ✅ Validate ObjectId format
      const mongoose = require("mongoose");
      if (!mongoose.Types.ObjectId.isValid(teacherId)) {
        console.error("❌ Invalid teacherId format:", teacherId);
        throw new ValidationError("معرف المعلم غير صحيح");
      }

      const teacherObjectId = new mongoose.Types.ObjectId(teacherId);
      console.log("🔍 Looking up teacher:", {
        teacherId,
        teacherObjectId: teacherObjectId.toString(),
        isValid: mongoose.Types.ObjectId.isValid(teacherId),
        hasCachedTeacher: !!req.teacher,
        cachedTeacherId: req.teacher?._id?.toString(),
      });

      // ✅ If authMiddleware already found the teacher and it matches, use it (optimization)
      let teacher;
      if (
        req.teacher &&
        req.teacher._id &&
        req.teacher._id.toString() === teacherId
      ) {
        // ✅ Use the teacher from authMiddleware, but we still need to populate subscription
        // Check if subscription is already populated
        if (
          req.teacher.subscription &&
          typeof req.teacher.subscription === "object"
        ) {
          teacher = req.teacher;
          // Ensure it's a Mongoose document with all methods
          if (!teacher.populate) {
            teacher = await Teacher.findById(teacherObjectId).populate(
              "subscription"
            );
          }
        } else {
          // Need to populate subscription
          teacher = await Teacher.findById(teacherObjectId).populate(
            "subscription"
          );
        }
      } else {
        // ✅ Normal lookup for student operations or if teacher not cached
        teacher = await Teacher.findById(teacherObjectId).populate(
          "subscription"
        );
      }

      if (!teacher) {
        // ✅ Try to find the teacher with different ID formats for debugging
        const teacherAsString = await Teacher.findById(teacherId).populate(
          "subscription"
        );
        const teacherWithoutPopulate = await Teacher.findById(teacherObjectId);
        const teacherCount = await Teacher.countDocuments();
        console.error("❌ Teacher not found in checkUsageLimits:", {
          teacherId,
          teacherIdType: typeof teacherId,
          teacherObjectId: teacherObjectId.toString(),
          triedStringLookup: !!teacherAsString,
          teacherExistsWithoutPopulate: !!teacherWithoutPopulate,
          totalTeachersInDB: teacherCount,
          body: req.body,
          user: req.user
            ? {
                id: req.user.id,
                _id: req.user._id,
                userId: req.user.userId,
                role: req.user.role,
              }
            : null,
        });
        throw new NotFoundError("المعلم");
      }

      console.log("✅ Teacher found:", {
        teacherId: teacher._id.toString(),
        name: teacher.name,
        email: teacher.email,
        hasSubscription: !!teacher.subscription,
      });

      // ✅ Ghost Teachers: unlimited (skip subscription + limits)
      if (teacher.isGhostTeacher || isGhostTeacherId(teacher._id)) {
        req.teacher = teacher;
        req.subscription = null;
        return next();
      }

      // التحقق من وجود اشتراك نشط وصالح
      if (!teacher.subscription) {
        throw new AuthorizationError(
          "لا يوجد اشتراك نشط. يرجى الاشتراك في إحدى الباقات للاستمرار"
        );
      }

      // التحقق من صحة الاشتراك (نشط + غير منتهي)
      const subscriptionCheck = await isSubscriptionValid(teacher.subscription);
      if (!subscriptionCheck.valid) {
        throw new AuthorizationError(
          subscriptionCheck.reason || "الاشتراك غير صالح"
        );
      }

      // التحقق من أن المعلم غير محظور
      if (teacher.isBanned) {
        throw new AuthorizationError("تم حظر حسابك. يرجى التواصل مع الدعم");
      }

      // التحقق من حدود الاستخدام حسب النوع
      let canProceed = false;
      let limitMessage = "";

      switch (type) {
        case "student":
          canProceed = teacher.canAddStudent();
          limitMessage = `لا يمكن إضافة المزيد من الطلاب. الحد الأقصى: ${teacher.currentLimits.maxStudents}`;
          break;
        case "exam":
          canProceed = teacher.canCreateExam();
          limitMessage = `لا يمكن إنشاء المزيد من الامتحانات. الحد الأقصى: ${teacher.currentLimits.maxExams}`;
          break;
        case "question":
          canProceed = teacher.canAddQuestion();
          limitMessage = `لا يمكن إضافة المزيد من الأسئلة. الحد الأقصى: ${teacher.currentLimits.maxQuestions}`;
          break;
        default:
          return res.status(400).json({
            success: false,
            message: "نوع التحقق غير صحيح",
          });
      }

      if (!canProceed) {
        throw new SubscriptionLimitError(limitMessage);
      }

      // إضافة معلومات المعلم والاشتراك للطلب
      req.teacher = teacher;
      req.subscription = subscriptionCheck.subscription;
      next();
    } catch (error) {
      // ✅ Pass error to global error handler
      next(error);
    }
  };
};

// middleware لتحديث عداد الاستخدام بعد العملية
// يجب أن يتم استدعاؤه بعد نجاح العملية (في حالة 200/201)
const updateUsageCount = (type, increment = true) => {
  return async (req, res, next) => {
    // حفظ الدالة الأصلية للـ response
    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);
    let statusCode = 200;

    // Override status to capture status code
    res.status = function (code) {
      statusCode = code;
      return originalStatus(code);
    };

    res.json = async function (body) {
      // إذا كانت العملية ناجحة (2xx)، قم بتحديث العداد
      if (statusCode >= 200 && statusCode < 300) {
        if (req.teacher) {
          try {
            // إعادة جلب المعلم للتأكد من أحدث البيانات
            const teacher = await Teacher.findById(req.teacher._id);

            // ✅ Ghost Teachers: do not count usage
            if (
              teacher &&
              (teacher.isGhostTeacher || isGhostTeacherId(teacher._id))
            ) {
              return originalJson(body);
            }

            if (teacher) {
              if (increment) {
                teacher.incrementUsage(type);
              } else {
                teacher.decrementUsage(type);
              }
              await teacher.save();
              console.log(
                `✅ تم تحديث عداد الاستخدام: ${type} (${
                  increment ? "+" : "-"
                }1) للمعلم ${teacher._id}`
              );
            }
          } catch (err) {
            console.error("❌ خطأ في تحديث عداد الاستخدام:", err);
            // لا نوقف العملية إذا فشل تحديث العداد
          }
        }
      }
      // استدعاء الدالة الأصلية
      return originalJson(body);
    };

    next();
  };
};

module.exports = {
  checkUsageLimits,
  updateUsageCount,
  isSubscriptionValid,
};
