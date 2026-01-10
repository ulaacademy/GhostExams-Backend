// backend/controllers/teacherExamController.js

const TeacherCustomExam = require("../models/TeacherCustomExam");
const ExamResult = require("../models/ExamResult"); // ✅ استدعاء موديل النتائج
const TeacherExamResult = require("../models/TeacherExamResult"); // استدعاء مودل النتائج
const Teacher = require("../models/Teacher");

const createTeacherExam = async (req, res) => {
  try {
    // ✅ الحصول على teacherId من المستخدم المصادق عليه فقط
    const teacherId = req.user?.id || req.user?._id;
    if (!teacherId) {
      return res.status(401).json({ message: "❌ يجب تسجيل الدخول كمعلم." });
    }

    const { examName, subject, grade, term, duration, questions } = req.body;

    if (
      !examName ||
      !subject ||
      !grade ||
      !term ||
      !duration ||
      !questions ||
      !Array.isArray(questions)
    ) {
      return res.status(400).json({ message: "❌ جميع الحقول مطلوبة." });
    }

    const newExam = new TeacherCustomExam({
      teacherId, // ✅ استخدام teacherId من المستخدم المصادق عليه فقط
      examName,
      subject,
      grade,
      term,
      duration,
      questions,
    });

    await newExam.save();

    // ✅ ملاحظة: زيادة عداد الامتحانات يتم تلقائياً عبر middleware updateUsageCount

    res.status(201).json({
      message: "✅ تم إنشاء الامتحان بنجاح",
      exam: newExam,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء إنشاء امتحان المعلم:", error);
    res.status(500).json({ message: "❌ فشل في إنشاء الامتحان", error });
  }
};

// ✅ جلب جميع امتحانات المعلم
// ✅ جلب امتحانات للطلاب (فقط الامتحانات المفعّلة)
const getTeacherCustomExams = async (req, res) => {
  try {
    // لازم يكون في teacherId يا من query أو params حسب الراوت عندك
    const teacherId = req.query.teacherId || req.params.teacherId;

    // إذا ما في teacherId رجّع فقط المفعّلة (احتياط)
    const filter = teacherId
      ? { teacherId, isActive: true }
      : { isActive: true };

    const exams = await TeacherCustomExam.find(filter).sort({ createdAt: -1 });
    res.status(200).json(exams);
  } catch (error) {
    console.error("❌ فشل في جلب امتحانات المعلم:", error);
    res.status(500).json({ message: "❌ خطأ أثناء جلب الامتحانات", error });
  }
};

// ✅ دالة جلب جميع امتحانات المعلم مع عدد الطلاب الذين قدموا كل امتحان

// ✅ جلب امتحانات معلم محدد باستخدام userId
const getTeacherExamsWithResults = async (req, res) => {
  try {
    // Log incoming request for debugging
    console.log("📡 Request to /custom-exams/with-results");
    console.log("Query params:", req.query);
    console.log("Body:", req.body);
    console.log("Auth user:", req.user);

    // ✅ التحقق من أن المستخدم معلم وليس طالب
    if (req.user?.role !== "teacher") {
      console.error(
        "❌ Unauthorized: User is not a teacher. Role:",
        req.user?.role
      );
      return res.status(403).json({
        error: "❌ هذا الـ endpoint مخصص للمعلمين فقط",
        userRole: req.user?.role,
      });
    }

    // Try to get userId from multiple sources
    const userId =
      req.query.userId ||
      req.body.userId ||
      req.user?.userId ||
      req.user?.id ||
      req.user?._id;

    if (!userId) {
      console.error("❌ userId not found in query, body, or auth token");
      console.error("❌ req.user:", req.user);
      console.error(
        "❌ req.user keys:",
        req.user ? Object.keys(req.user) : "req.user is null"
      );
      return res.status(400).json({
        message: "❌ userId مفقود.",
        debug: {
          query: req.query,
          bodyKeys: Object.keys(req.body || {}),
          hasUser: !!req.user,
          userKeys: req.user ? Object.keys(req.user) : null,
        },
      });
    }

    console.log("✅ Using userId:", userId);

    // ✅ جلب فقط الامتحانات الخاصة بالمعلم الحالي
    const exams = await TeacherCustomExam.find({ teacherId: userId }).sort({
      createdAt: -1,
    });

    const examsWithResults = await Promise.all(
      exams.map(async (exam) => {
        const resultsCount = await ExamResult.countDocuments({
          examId: exam._id,
        });

        return {
          ...exam.toObject(),
          studentsCount: resultsCount,
        };
      })
    );

    res.status(200).json({ exams: examsWithResults });
  } catch (error) {
    console.error("❌ خطأ أثناء جلب امتحانات المعلم مع عدد الطلاب:", error);
    res.status(500).json({ message: "❌ خطأ داخلي أثناء جلب الامتحانات" });
  }
};

// ✅ جلب عدد الطلاب الذين قدموا امتحان معين
const getExamStudentsCount = async (req, res) => {
  try {
    const { examId } = req.params;
    if (!examId) {
      return res.status(400).json({ message: "❌ examId مطلوب." });
    }

    const count = await TeacherExamResult.countDocuments({ examId });
    res.status(200).json({ count });
  } catch (error) {
    console.error("❌ فشل في جلب عدد الطلاب للامتحان:", error);
    res.status(500).json({ message: "❌ خطأ داخلي." });
  }
};

const setTeacherCustomExamActive = async (req, res) => {
  try {
    const teacherId = req.user?.id || req.user?._id;
    const { examId } = req.params;
    const { isActive } = req.body;

    if (!teacherId) return res.status(401).json({ message: "❌ يجب تسجيل الدخول كمعلم." });

    const updated = await TeacherCustomExam.findOneAndUpdate(
      { _id: examId, teacherId },          // مهم: يتأكد الامتحان للمعلم نفسه
      { $set: { isActive: !!isActive } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "❌ الامتحان غير موجود." });

    return res.status(200).json({ exam: updated });
  } catch (error) {
    console.error("❌ خطأ أثناء تغيير حالة الامتحان:", error);
    return res.status(500).json({ message: "❌ فشل تغيير حالة الامتحان" });
  }
};


module.exports = {
  createTeacherExam,
  getTeacherCustomExams,
  getTeacherExamsWithResults,
  getExamStudentsCount, // ✅ أضف هذه هنا أيضًا
  setTeacherCustomExamActive,
};
