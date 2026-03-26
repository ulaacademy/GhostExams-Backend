const mongoose = require("mongoose");
const Student = require("../models/Student");
const Exam = require("../models/Exam");
const Teacher = require("../models/Teacher");
const TeacherCustomExam = require("../models/TeacherCustomExam");
const TeacherStudentSubscription = require("../models/TeacherStudentSubscription");
const { ghostTeacherId } = require("../config/ghostTeacher");

// ✅ تحويل ghostTeacherId إلى ObjectId إذا كان string
const getGhostTeacherObjectId = () => {
  if (!ghostTeacherId) return null;
  try {
    return mongoose.Types.ObjectId.isValid(ghostTeacherId)
      ? new mongoose.Types.ObjectId(ghostTeacherId)
      : null;
  } catch (error) {
    console.error("❌ Error converting ghostTeacherId to ObjectId:", error);
    return null;
  }
};

// ✅ تحسين لوحة تحكم الطالب وتحليل الأداء + إضافة الاشتراكات
const getStudentDashboard = async (req, res) => {
  try {
    const userId = req.params.id;

    const student = await Student.findById(userId)
      .populate("examsTaken")
      .populate("subscriptions.teacherId", "name email subjects");

    if (!student) {
      return res.status(404).json({ message: "❌ الطالب غير موجود" });
    }

    const exams = await Exam.find({
      _id: { $in: student.examsTaken },
    }).populate("questions");

    let totalScore = 0;
    let totalExams = exams.length;
    let subjectPerformance = {};

    exams.forEach((exam) => {
      let examScore = exam.questions.reduce(
        (acc, q) => acc + (q.correct ? 1 : 0),
        0,
      );
      totalScore += examScore;

      if (!subjectPerformance[exam.subject]) {
        subjectPerformance[exam.subject] = { total: 0, count: 0 };
      }
      subjectPerformance[exam.subject].total += examScore;
      subjectPerformance[exam.subject].count += 1;
    });

    const averageScore = totalExams > 0 ? (totalScore / totalExams) * 100 : 0;

    let performanceAnalysis = Object.keys(subjectPerformance).map(
      (subject) => ({
        subject,
        averageScore:
          (subjectPerformance[subject].total /
            subjectPerformance[subject].count) *
          100,
      }),
    );

    const subscriptions = student.subscriptions.map((sub) => ({
      teacherId: sub.teacherId._id,
      teacherName: sub.teacherId.name,
      teacherEmail: sub.teacherId.email,
      subjects: sub.teacherId.subjects,
      plan: sub.plan,
      isActive: sub.isActive,
      activeUntil: sub.activeUntil,
      paymentMethod: sub.paymentMethod,
    }));

    res.status(200).json({
      message: "✅ لوحة تحكم الطالب",
      exams,
      averageScore,
      performanceAnalysis,
      subscriptions,
      recommendations: [
        "🔹 ركّز على الوحدة 3 في الرياضيات.",
        "🔹 حاول تحسين أدائك في القواعد الإنجليزية.",
      ],
    });
  } catch (error) {
    res.status(500).json({ message: "❌ خطأ في جلب بيانات الطالب", error });
  }
};

// ✅ الدالة 1: جلب المعلمين المشترك معهم الطالب
const getSubscribedTeachers = async (req, res) => {
  try {
    // ✅ التحقق من وجود studentId
    const studentId = req.user?.id || req.user?.userId || req.user?._id;
    if (!studentId) {
      console.error(
        "❌ studentId not found in req.user:",
        JSON.stringify(req.user, null, 2),
      );
      return res
        .status(400)
        .json({ error: "❌ لم يتم العثور على معرف الطالب" });
    }

    // ✅ التحقق من صحة studentId
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      console.error("❌ Invalid studentId format:", studentId);
      return res.status(400).json({ error: "❌ معرف الطالب غير صحيح" });
    }

    console.log("✅ Fetching subscribed teachers for studentId:", studentId);
    console.log("✅ Ghost Teacher ID (raw):", ghostTeacherId);

    // ✅ تحويل ghostTeacherId إلى ObjectId
    const ghostTeacherObjectId = getGhostTeacherObjectId();
    if (!ghostTeacherObjectId) {
      console.warn(
        "⚠️ Invalid ghostTeacherId, continuing without Ghost Teacher",
      );
    }

    // ✅ تحويل studentId إلى ObjectId للتأكد من صحة الاستعلام
    const studentObjectId = new mongoose.Types.ObjectId(studentId);

    // ✅ جلب جميع الاشتراكات مع معالجة الأخطاء
    let subscriptions = [];
    try {
      subscriptions = await TeacherStudentSubscription.find({
        studentId: studentObjectId,
      })
        .populate({
          path: "teacherId",
          select: "name subjects profileImage",
          strictPopulate: false, // ✅ السماح بجلب المعلمين حتى لو كان هناك مشاكل
        })
        .lean();
      console.log("✅ Found subscriptions:", subscriptions.length);
    } catch (subError) {
      console.error("❌ Error fetching subscriptions:", subError.message);
      console.error("❌ Subscription error stack:", subError.stack);
      // Continue with empty subscriptions array
      subscriptions = [];
    }

    // ✅ جلب معلومات Ghost Teacher مع معالجة الأخطاء
    let ghostTeacher = null;
    try {
      if (ghostTeacherObjectId) {
        ghostTeacher = await Teacher.findById(ghostTeacherObjectId)
          .select("name subjects profileImage")
          .lean();
        if (ghostTeacher) {
          console.log("✅ Found Ghost Teacher:", ghostTeacher.name);
        } else {
          console.warn(
            "⚠️ Ghost Teacher not found with ID:",
            ghostTeacherObjectId,
          );
        }
      } else {
        console.warn("⚠️ ghostTeacherId is not valid");
      }
    } catch (ghostError) {
      console.error("❌ Error fetching Ghost Teacher:", ghostError.message);
      console.error("❌ Ghost Teacher error stack:", ghostError.stack);
      // Continue without Ghost Teacher if there's an error
    }

    // ✅ التأكد من وجود اشتراك للطالب مع Ghost Teacher
    const hasGhostSubscription =
      ghostTeacherObjectId &&
      subscriptions.some((sub) => {
        try {
          const subTeacherId = sub.teacherId?._id || sub.teacherId;
          if (!subTeacherId) return false;

          // ✅ مقارنة كـ string للتأكد من المطابقة
          return subTeacherId.toString() === ghostTeacherObjectId.toString();
        } catch (e) {
          console.error("❌ Error checking ghost subscription:", e);
          return false;
        }
      });

    console.log("🔍 Ghost subscription check:", {
      hasGhostSubscription,
      ghostTeacherExists: !!ghostTeacher,
      ghostTeacherObjectId: ghostTeacherObjectId?.toString(),
      subscriptionsCount: subscriptions.length,
    });

    // ✅ إذا لم يكن هناك اشتراك وكان Ghost Teacher موجوداً، إنشاء واحد تلقائياً
    if (!hasGhostSubscription && ghostTeacher && ghostTeacherObjectId) {
      try {
        const newSubscription = await TeacherStudentSubscription.create({
          studentId: studentObjectId,
          teacherId: ghostTeacherObjectId,
          type: "free",
          startDate: new Date(),
        });
        console.log("✅ تم إنشاء اشتراك تلقائي للطالب مع Ghost Teacher:", {
          subscriptionId: newSubscription._id.toString(),
          studentId: studentObjectId.toString(),
          teacherId: ghostTeacherObjectId.toString(),
        });
      } catch (subError) {
        // ✅ تجاهل الخطأ إذا كان الاشتراك موجوداً بالفعل
        if (subError.code === 11000) {
          console.log(
            "ℹ️ Ghost Teacher subscription already exists (duplicate key)",
          );
        } else {
          console.warn(
            "⚠️ فشل في إنشاء اشتراك Ghost Teacher:",
            subError.message,
          );
          console.error("❌ Subscription error details:", subError);
        }
      }
    }

    // ✅ إعادة جلب الاشتراكات بعد التأكد من وجود Ghost Teacher
    let allSubscriptions = [];
    try {
      allSubscriptions = await TeacherStudentSubscription.find({
        studentId: studentObjectId,
      })
        .populate({
          path: "teacherId",
          select: "name subjects profileImage",
          strictPopulate: false,
        })
        .lean();
      console.log(
        "✅ Total subscriptions after refresh:",
        allSubscriptions.length,
      );
    } catch (refreshError) {
      console.error("❌ Error refreshing subscriptions:", refreshError.message);
      console.error("❌ Refresh error stack:", refreshError.stack);
      // Use original subscriptions if refresh fails
      allSubscriptions = subscriptions;
    }

    // ✅ تنسيق البيانات مع إعطاء أولوية لـ Ghost Teacher
    const formatted = allSubscriptions
      .filter((sub) => {
        // ✅ تصفية الاشتراكات التي لا تحتوي على معلم صالح
        try {
          return sub.teacherId && sub.teacherId._id;
        } catch (e) {
          return false;
        }
      })
      .map((sub) => {
        try {
          const teacherId = sub.teacherId?._id || sub.teacherId;
          const isGhost =
            ghostTeacherObjectId &&
            teacherId &&
            teacherId.toString() === ghostTeacherObjectId.toString();

          return {
            _id: teacherId,
            name: sub.teacherId?.name || "معلم غير معروف",
            subjects: Array.isArray(sub.teacherId?.subjects)
              ? sub.teacherId.subjects
              : [],
            profileImage: sub.teacherId?.profileImage || null,
            subscriptionType: sub.type || "free",
            startDate: sub.startDate || null,
            endDate: sub.endDate || null,
            isGhostTeacher: isGhost,
          };
        } catch (mapError) {
          console.error("❌ Error mapping subscription:", mapError);
          return null;
        }
      })
      .filter((item) => item !== null); // ✅ إزالة العناصر الفارغة

    // ✅ التأكد من وجود Ghost Teacher في القائمة (إذا كان موجوداً)
    if (ghostTeacher && ghostTeacherObjectId) {
      const ghostTeacherInList = formatted.some(
        (t) => t._id && t._id.toString() === ghostTeacherObjectId.toString(),
      );

      if (!ghostTeacherInList) {
        console.log(
          "⚠️ Ghost Teacher not in subscriptions list, adding it manually",
        );
        // ✅ إضافة Ghost Teacher يدوياً إذا لم يكن موجوداً
        formatted.unshift({
          _id: ghostTeacher._id || ghostTeacherObjectId,
          name: ghostTeacher.name || "Ghost Examinations",
          subjects: Array.isArray(ghostTeacher.subjects)
            ? ghostTeacher.subjects
            : ["جميع المواد"],
          profileImage: ghostTeacher.profileImage || null,
          subscriptionType: "free",
          startDate: null,
          endDate: null,
          isGhostTeacher: true,
        });

        // ✅ محاولة إنشاء الاشتراك إذا لم يكن موجوداً
        try {
          await TeacherStudentSubscription.create({
            studentId: studentObjectId,
            teacherId: ghostTeacherObjectId,
            type: "free",
            startDate: new Date(),
          });
          console.log("✅ Created missing Ghost Teacher subscription");
        } catch (createError) {
          if (createError.code !== 11000) {
            console.warn(
              "⚠️ Could not create Ghost Teacher subscription:",
              createError.message,
            );
          }
        }
      }
    }

    // ✅ ترتيب القائمة بحيث يظهر Ghost Teacher أولاً
    formatted.sort((a, b) => {
      if (a.isGhostTeacher) return -1;
      if (b.isGhostTeacher) return 1;
      return 0;
    });

    console.log("✅ Returning", formatted.length, "teachers");
    console.log(
      "👻 Ghost Teacher in list:",
      formatted.some((t) => t.isGhostTeacher),
    );
    res.json(formatted);
  } catch (error) {
    console.error("❌ خطأ أثناء جلب المعلمين:", error);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({
      error: "حدث خطأ أثناء جلب المعلمين المشترك معهم",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ✅ الدالة 2: جلب امتحانات المعلم حسب نوع الاشتراك
const getTeacherExamsByStudent = async (req, res) => {
  try {
    const studentId = req.user?.id || req.user?.userId || req.user?._id;
    const { teacherId } = req.params;

    if (!studentId) {
      return res.status(401).json({ error: "❌ يجب تسجيل الدخول أولاً" });
    }

    if (!teacherId || !mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({ error: "❌ معرف المعلم غير صحيح" });
    }

    const studentObjectId = new mongoose.Types.ObjectId(studentId);
    const teacherObjectId = new mongoose.Types.ObjectId(teacherId);

    // ✅ ابحث عن اشتراك حقيقي بين الطالب وهذا المعلم
    const subscription = await TeacherStudentSubscription.findOne({
      studentId: studentObjectId,
      teacherId: teacherObjectId,
    }).lean();

    // ✅ التحقق هل هذا هو Ghost Teacher
    const ghostTeacherObjectId = getGhostTeacherObjectId();
    const isGhostTeacher =
      ghostTeacherObjectId &&
      ghostTeacherObjectId.toString() === teacherObjectId.toString();

    console.log("🔐 Access check:", {
      studentId: studentObjectId.toString(),
      teacherId: teacherObjectId.toString(),
      hasSubscription: !!subscription,
      subscriptionType: subscription?.type || null,
      isGhostTeacher,
    });

    // ✅ الحماية الأساسية:
    // إذا لا يوجد اشتراك مع هذا المعلم -> امنع الوصول
    if (!subscription) {
      return res.status(403).json({
        error: "❌ غير مصرح لك بالوصول إلى هذا البنك",
        message: "يجب أن يكون لديك اشتراك فعّال مع هذا المعلم أولاً",
      });
    }

    const type = subscription.type || "free";
    let allExams = [];

    if (isGhostTeacher) {
      console.log("👻 Fetching Ghost Examinations from Exam model");

      const ghostExams = await Exam.find({ examType: "ghost" })
        .populate("questions")
        .sort({ createdAt: -1 })
        .lean();

      const ghostCustomExams = await TeacherCustomExam.find({
        teacherId: teacherObjectId,
      })
        .sort({ createdAt: -1 })
        .lean();

      const examModelExams = ghostExams.map((exam) => {
        const questionsArray = Array.isArray(exam.questions)
          ? exam.questions.map((q) => {
              if (typeof q === "object" && q !== null && q.questionText) {
                return q;
              }
              return q;
            })
          : [];

        return {
          _id: exam._id,
          examName: exam.title || exam.examName || "امتحان بدون عنوان",
          subject: exam.subject || "غير محدد",
          grade: exam.grade || "غير محدد",
          term: exam.term || "غير محدد",
          duration: exam.duration || 0,
          questions: questionsArray,
          createdAt: exam.createdAt || new Date(),
          isGhostExam: true,
        };
      });

      allExams = [...examModelExams, ...ghostCustomExams];

      const uniqueExams = [];
      const seenIds = new Set();

      for (const exam of allExams) {
        const examId = exam._id?.toString();
        if (examId && !seenIds.has(examId)) {
          seenIds.add(examId);
          uniqueExams.push(exam);
        }
      }

      allExams = uniqueExams;

      console.log(
        `✅ Found ${allExams.length} Ghost Examinations (${examModelExams.length} from Exam, ${ghostCustomExams.length} from TeacherCustomExam)`,
      );
    } else {
      console.log("📚 Fetching regular teacher exams from TeacherCustomExam");

      allExams = await TeacherCustomExam.find({ teacherId: teacherObjectId })
        .sort({ createdAt: -1 })
        .lean();

      console.log(`✅ Found ${allExams.length} regular teacher exams`);
    }

    return res.json({
      subscriptionType: type,
      exams: allExams,
      totalExams: allExams.length,
    });
  } catch (error) {
    console.error("❌ خطأ في getTeacherExamsByStudent:", error);
    return res.status(500).json({ error: "فشل في جلب امتحانات المعلم" });
  }
};

// ✅ الدالة 3: جلب امتحانات المعلم الافتراضي
const getGhostTeacherExams = async (req, res) => {
  try {
    const ghostTeacherObjectId = getGhostTeacherObjectId();
    if (!ghostTeacherObjectId) {
      console.warn("⚠️ Invalid ghostTeacherId, returning empty array");
      return res.json([]);
    }

    const exams = await TeacherCustomExam.find({
      teacherId: ghostTeacherObjectId,
    }).sort({ createdAt: -1 });

    res.json(exams);
  } catch (error) {
    console.error("❌ فشل في جلب امتحانات المعلم الافتراضي:", error);
    res.status(500).json({ error: "فشل في جلب الامتحانات" });
  }
};

// ✅ الدالة 4: جلب جميع امتحانات المعلمين المشترك معهم الطالب (بما في ذلك Ghost)
const getStudentSubscribedTeachersExams = async (req, res) => {
  try {
    // ✅ التحقق من أن المستخدم طالب وليس معلم
    if (req.user?.role !== "student") {
      console.error(
        "❌ Unauthorized: User is not a student. Role:",
        req.user?.role,
      );
      return res.status(403).json({
        error: "❌ هذا الـ endpoint مخصص للطلاب فقط",
        userRole: req.user?.role,
      });
    }

    // ✅ الحصول على studentId من req.user
    const studentId = req.user?.id || req.user?.userId || req.user?._id;

    if (!studentId) {
      console.error("❌ studentId not found in req.user:", req.user);
      return res
        .status(400)
        .json({ error: "❌ لم يتم العثور على معرف الطالب" });
    }

    // ✅ التحقق من صحة studentId
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      console.error("❌ Invalid studentId format:", studentId);
      return res.status(400).json({ error: "❌ معرف الطالب غير صحيح" });
    }

    // ✅ تحويل studentId إلى ObjectId
    const studentObjectId = new mongoose.Types.ObjectId(studentId);

    console.log("✅ Fetching exams for studentId:", studentId);

    // ✅ جلب جميع المعلمين المشترك معهم الطالب
    const subscriptions = await TeacherStudentSubscription.find({
      studentId: studentObjectId,
    })
      .select("teacherId")
      .lean();

    console.log("✅ Found subscriptions:", subscriptions.length);

    const teacherIds = subscriptions
      .map((sub) => sub.teacherId)
      .filter((id) => id);

    // ✅ Ensure Ghost Teacher is always included
    const ghostTeacherObjectId = getGhostTeacherObjectId();
    if (
      ghostTeacherObjectId &&
      !teacherIds.some(
        (id) => id.toString() === ghostTeacherObjectId.toString(),
      )
    ) {
      teacherIds.push(ghostTeacherObjectId);
      console.log("✅ Added Ghost Teacher to teacherIds list");
    }

    if (teacherIds.length === 0) {
      console.log("⚠️ No teacher subscriptions found for student (even Ghost)");
      return res.json([]);
    }

    // ✅ جلب جميع امتحانات هؤلاء المعلمين
    const exams = await TeacherCustomExam.find({
      teacherId: { $in: teacherIds },
    })
      .sort({ createdAt: -1 })
      .lean();

    console.log("✅ Found exams:", exams.length);
    res.json(exams);
  } catch (error) {
    console.error("❌ خطأ في getStudentSubscribedTeachersExams:", error);
    res
      .status(500)
      .json({ error: "فشل في جلب امتحانات المعلمين", details: error.message });
  }
};

// ✅ التصدير النهائي
module.exports = {
  getStudentDashboard,
  getSubscribedTeachers,
  getTeacherExamsByStudent,
  getGhostTeacherExams,
  getStudentSubscribedTeachersExams,
};
