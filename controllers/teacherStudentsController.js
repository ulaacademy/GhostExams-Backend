const mongoose = require("mongoose");
const Student = require("../models/Student");
const TeacherStudentSubscription = require("../models/TeacherStudentSubscription");
const Teacher = require("../models/Teacher");
const Subscription = require("../models/Subscription");
const { ghostTeacherId } = require("../config/ghostTeacher");
const TeacherCustomExam = require("../models/TeacherCustomExam");

exports.getMyStudents = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100,
    );
    const search = (req.query.search || "").trim();
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    // ✅ التحقق إذا كان المعلم هو Ghost Teacher
    const isGhostTeacher =
      ghostTeacherId && teacherId.toString() === ghostTeacherId.toString();

    let students = [];
    let total = 0;

    if (isGhostTeacher) {
      // ✅ Ghost Teacher: عرض جميع الطلاب
      const studentFilter = {};
      if (search) {
        studentFilter.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      // ✅ جلب العدد الإجمالي
      total = await Student.countDocuments(studentFilter);

      // ✅ جلب جميع الطلاب مع pagination
      const allStudents = await Student.find(studentFilter, "-password")
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      // ✅ تجهيز البيانات النهائية
      students = allStudents.map((student) => ({
        ...student,
        subscriptionType: "free", // Ghost Teacher يعرض جميع الطلاب مجاناً
        paymentStatus: "free",
        paymentMethod: null,
        startDate: null,
        endDate: null,
      }));
    } else {
      // ✅ معلم عادي: عرض الطلاب المشتركين فقط
      const filter = { teacherId };
      if (search) {
        filter.$or = [
          { "studentId.name": { $regex: search, $options: "i" } },
          { "studentId.email": { $regex: search, $options: "i" } },
        ];
      }

      // ✅ جلب العدد الإجمالي
      total = await TeacherStudentSubscription.countDocuments(filter);

      // ✅ جلب اشتراكات الطلاب مع pagination
      const subscriptions = await TeacherStudentSubscription.find(filter)
        .populate("studentId", "-password")
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      // ✅ تجهيز البيانات النهائية مع فلترة البيانات الفارغة
      students = subscriptions
        .filter((sub) => sub.studentId && sub.studentId.name) // ✅ إزالة الطلاب الفارغين
        .map((sub) => ({
          ...sub.studentId, // بيانات الطالب
          subscriptionType: sub.type, // نوع الاشتراك
          paymentStatus: sub.paymentStatus,
          paymentMethod: sub.paymentMethod,
          startDate: sub.startDate,
          endDate: sub.endDate,
        }));
    }

    res.status(200).json({
      students,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء جلب طلاب المعلم:", error);
    res.status(500).json({ message: "❌ فشل في جلب طلاب المعلم", error });
  }
};

exports.subscribeStudentToTeacher = async (req, res) => {
  try {
    const { teacherId, type = "basic", startDate, endDate } = req.body;
    let { studentId } = req.body;

    if (!teacherId) {
      return res.status(400).json({ message: "❌ يجب تحديد المعلم." });
    }

    // ✅ Validate teacherId format
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      console.error("❌ Invalid teacherId format:", teacherId);
      return res.status(400).json({
        message: "❌ معرف المعلم غير صحيح.",
        debug: {
          teacherId,
          isValid: mongoose.Types.ObjectId.isValid(teacherId),
        },
      });
    }

    if (!req.user || req.user.role !== "student") {
      return res
        .status(403)
        .json({ message: "❌ هذا الإجراء متاح لطلاب المنصة فقط." });
    }

    if (!studentId) {
      studentId = req.user.userId || req.user.id || req.user._id;
    } else if (
      studentId.toString() !==
      (req.user.userId || req.user.id || req.user._id).toString()
    ) {
      return res
        .status(403)
        .json({ message: "❌ لا يمكنك الاشتراك بالنيابة عن طالب آخر." });
    }

    // ✅ Validate studentId format
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      console.error("❌ Invalid studentId format:", studentId);
      return res.status(400).json({
        message: "❌ معرف الطالب غير صحيح.",
        debug: {
          studentId,
          isValid: mongoose.Types.ObjectId.isValid(studentId),
        },
      });
    }

    if (!type) {
      return res
        .status(400)
        .json({ message: "❌ يجب تحديد نوع الاشتراك للطالب." });
    }

    // ✅ Convert to ObjectId for proper querying
    const teacherObjectId = new mongoose.Types.ObjectId(teacherId);
    const studentObjectId = new mongoose.Types.ObjectId(studentId);

    console.log("🔍 Attempting to subscribe:", {
      teacherId: teacherId,
      teacherObjectId: teacherObjectId.toString(),
      studentId: studentId,
      studentObjectId: studentObjectId.toString(),
    });

    let [student, teacher] = await Promise.all([
      Student.findById(studentObjectId),
      Teacher.findById(teacherObjectId),
    ]);

    if (!student) {
      console.error("❌ Student not found:", studentId);
      return res.status(404).json({ message: "❌ الطالب غير موجود." });
    }

    if (!teacher) {
      console.error(
        "❌ Teacher not found with ObjectId:",
        teacherObjectId.toString(),
      );
      // ✅ Try to find teacher by string ID as fallback
      const teacherByString = await Teacher.findById(teacherId);
      if (!teacherByString) {
        // ✅ Check if teacher exists at all
        const allTeachers = await Teacher.find({})
          .select("_id name email")
          .limit(5);
        console.error(
          "❌ Available teachers (sample):",
          allTeachers.map((t) => ({ id: t._id.toString(), name: t.name })),
        );
        return res.status(404).json({
          message: "❌ المعلم غير موجود.",
          debug: {
            teacherId,
            teacherObjectId: teacherObjectId.toString(),
            isValidObjectId: mongoose.Types.ObjectId.isValid(teacherId),
          },
        });
      }
      // ✅ Use the teacher found by string ID
      teacher = teacherByString;
    }

    const existing = await TeacherStudentSubscription.findOne({
      teacherId: teacherObjectId,
      studentId: studentObjectId,
    });
    if (existing) {
      return res.status(400).json({ message: "⚠️ الطالب مشترك بالفعل." });
    }

    const activeSubscription = await Subscription.findOne({
      teacherId: teacherObjectId,
      status: "active",
      endDate: { $gte: new Date() },
    }).populate("planId", "name maxStudents");

    if (!activeSubscription) {
      return res.status(400).json({
        message:
          "❌ هذا المعلم لا يملك خطة نشطة حالياً. الرجاء اختيار معلم آخر.",
      });
    }

    const currentStudentCount = await TeacherStudentSubscription.countDocuments(
      { teacherId: teacherObjectId },
    );

    const planMaxStudents =
      activeSubscription?.planId?.maxStudents ??
      teacher?.currentLimits?.maxStudents ??
      0;

    if (
      planMaxStudents > 0 &&
      currentStudentCount >= Number(planMaxStudents || 0)
    ) {
      return res.status(400).json({
        message:
          "You cannot subscribe to this teacher because they have reached the maximum number of students allowed. The teacher needs to upgrade their plan.",
      });
    }

    const subscription = new TeacherStudentSubscription({
      teacherId: teacherObjectId,
      studentId: studentObjectId,
      type,
      startDate,
      endDate,
    });

    await subscription.save();

    // ✅ ملاحظة: زيادة عداد الطلاب يتم تلقائياً عبر middleware updateUsageCount

    res.status(201).json({
      message: "✅ تم الاشتراك بنجاح",
      subscription,
      usage: {
        currentStudents: currentStudentCount + 1,
        maxStudents: planMaxStudents,
      },
    });
  } catch (error) {
    console.error("❌ خطأ أثناء الاشتراك:", error);
    res.status(500).json({ message: "❌ فشل الاشتراك", error });
  }
};

// ✅ جلب جميع المعلمين (لعرضهم في صفحة "معلمو المنصة")
exports.getAllTeachersPublic = async (req, res) => {
  try {
    const now = new Date();

    const activeSubscriptions = await Subscription.find({
      status: "active",
      endDate: { $gte: now },
    })
      .populate({
        path: "teacherId",
        select:
          "name email subjects bio brief description image avatar profileImage photo photoUrl currentUsage currentLimits isBanned",
      })
      .populate({
        path: "planId",
        select: "name maxStudents price",
      })
      .lean();

    const teacherSubscriptionMap = new Map();

    activeSubscriptions.forEach((subscription) => {
      const teacher = subscription.teacherId;
      if (!teacher || teacher.isBanned) {
        return;
      }

      const teacherId = teacher._id.toString();
      const existing = teacherSubscriptionMap.get(teacherId);

      if (
        !existing ||
        new Date(subscription.endDate) > new Date(existing.subscription.endDate)
      ) {
        teacherSubscriptionMap.set(teacherId, {
          teacher,
          subscription,
        });
      }
    });

    const teacherIds = Array.from(teacherSubscriptionMap.keys());

    if (teacherIds.length === 0) {
      return res.status(200).json({ success: true, teachers: [] });
    }

    // ✅ تحويل IDs إلى ObjectId مرة واحدة
    const teacherObjectIds = teacherIds.map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    // ✅ حساب عدد الامتحانات + عدد الأسئلة لكل معلم من TeacherCustomExam
    const examsAgg = await TeacherCustomExam.aggregate([
      { $match: { teacherId: { $in: teacherObjectIds } } },
      {
        $project: {
          teacherId: 1,
          qCount: { $size: { $ifNull: ["$questions", []] } },
        },
      },
      {
        $group: {
          _id: "$teacherId",
          examsCount: { $sum: 1 },
          questionsCount: { $sum: "$qCount" },
        },
      },
    ]);

    const examsCountMap = new Map();
    const questionsCountMap = new Map();

    examsAgg.forEach((x) => {
      examsCountMap.set(x._id.toString(), x.examsCount || 0);
      questionsCountMap.set(x._id.toString(), x.questionsCount || 0);
    });

    const teacherSubscriptions = await TeacherStudentSubscription.aggregate([
      {
        $match: {
          teacherId: {
            $in: teacherIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
      },
      {
        $group: {
          _id: "$teacherId",
          count: { $sum: 1 },
        },
      },
    ]);

    const countsMap = new Map();
    teacherSubscriptions.forEach((entry) => {
      countsMap.set(entry._id.toString(), entry.count || 0);
    });

    const teachers = teacherIds.map((id) => {
      const { teacher, subscription } = teacherSubscriptionMap.get(id);
      const plan = subscription?.planId;

      const currentStudents =
        countsMap.get(id) ?? teacher.currentUsage?.studentsCount ?? 0;

      const maxStudents =
        plan?.maxStudents ?? teacher.currentLimits?.maxStudents ?? 0;
      // ✅ هون ضيفها
      const examsCount = examsCountMap.get(id) ?? 0;
      const questionsCount = questionsCountMap.get(id) ?? 0;

      const normalizedImage =
        teacher.profileImage ||
        teacher.image ||
        teacher.avatar ||
        teacher.photo ||
        teacher.photoUrl ||
        "";

      const biography =
        teacher.bio || teacher.brief || teacher.description || "";

      return {
        id,
        name: teacher.name,
        email: teacher.email || "",
        subjects: teacher.subjects || [],
        bio: biography,
        image: normalizedImage,
        planName: plan?.name || "",
        maxStudents,
        currentStudents,
        examsCount, // ✅ وهون
        questionsCount,
        isFull:
          maxStudents > 0 ? currentStudents >= Number(maxStudents || 0) : false,
        subscriptionEndsAt: subscription?.endDate || null,
      };
    });

    res.status(200).json({
      success: true,
      teachers,
    });
  } catch (error) {
    console.error("❌ خطأ في getAllTeachersPublic:", error);
    res.status(500).json({ message: "❌ فشل في جلب المعلمين" });
  }
};
