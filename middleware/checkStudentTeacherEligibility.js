// backend/middleware/checkStudentTeacherEligibility.js
const StudentSubscription = require("../models/StudentSubscription");
const TeacherStudentSubscription = require("../models/TeacherStudentSubscription");
const { ghostTeacherId, ghostTeachersIds } = require("../config/ghostTeacher");

module.exports = async (req, res, next) => {
  try {
    const { teacherId } = req.body;

    if (!req.user || req.user.role !== "student") {
      return res.status(403).json({ message: "❌ هذا الإجراء للطلاب فقط." });
    }

    const studentId = req.user.userId || req.user.id || req.user._id;

    // 1) اشتراك الطالب لازم يكون active + paid + غير منتهي
    const activeStudentSub = await StudentSubscription.findOne({
      studentId,
      status: "active",
      isActive: true,
      paymentStatus: "paid",
      endDate: { $gt: new Date() },
    }).lean();

    if (!activeStudentSub) {
      return res.status(403).json({
        message:
          "❌ لازم يكون عندك اشتراك طالب فعّال ومدفوع قبل الاشتراك بمعلم.",
      });
    }

    // 2) نوع المعلمين المسموح (ghost/platform/both)
    const allowedType = activeStudentSub.planSnapshot?.teacherType || "both";

    const teacherIdStr = teacherId ? teacherId.toString() : "";
    const isGhost =
      Array.isArray(ghostTeachersIds) &&
      ghostTeachersIds.map(String).includes(teacherIdStr);

    if (allowedType === "ghost" && !isGhost) {
      return res
        .status(403)
        .json({ message: "❌ خطتك تسمح بمعلمي الشبح فقط." });
    }
    if (allowedType === "platform" && isGhost) {
      return res
        .status(403)
        .json({ message: "❌ خطتك تسمح بمعلمي المنصة فقط." });
    }

    // 3) حد المعلمين
    const maxTeachers = Number(activeStudentSub.planSnapshot?.maxTeachers || 0);
    const freeExtra = Number(
      activeStudentSub.planSnapshot?.freeExtraTeachers || 0
    );
    const allowedTeachers = maxTeachers + freeExtra;

    const filter = {
      studentId,
      // ✅ احسب أي سجل مش ملغي/مش inactive حتى لو status مش موجود
      status: { $nin: ["cancelled", "canceled", "inactive"] },
      // ✅ احسب أي سجل مش مطفي حتى لو isActive مش موجود
      isActive: { $ne: false },
    };

    // ✅ استثناء المعلم الافتراضي من العدّاد
    if (ghostTeacherId) {
      filter.teacherId = { $ne: ghostTeacherId };
    }

    // ✅ بدون تكرار
    const currentTeachers = await TeacherStudentSubscription.distinct(
      "teacherId",
      filter
    );
    const currentTeachersCount = currentTeachers.length;

    console.log(
      "allowedTeachers:",
      allowedTeachers,
      "currentTeachersCount:",
      currentTeachersCount
    );

    if (allowedTeachers > 0 && currentTeachersCount >= allowedTeachers) {
      return res.status(409).json({
        message: `❌ وصلت للحد المسموح من المعلمين في خطتك (${allowedTeachers}).`,
      });
    }

    req.activeStudentSubscription = activeStudentSub;
    next();
  } catch (e) {
    console.error("❌ checkStudentTeacherEligibility:", e);
    return res
      .status(500)
      .json({ message: "❌ خطأ فحص أهلية الطالب للاشتراك بمعلم" });
  }
};
