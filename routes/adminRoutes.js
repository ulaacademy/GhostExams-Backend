const express = require("express");
const router = express.Router();
const Subscription = require("../models/Subscription");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Exam = require("../models/Exam");
const Plan = require("../models/Plan");
const authMiddleware = require("../middleware/authMiddleware");
const StudentSubscription = require("../models/StudentSubscription");
const TeacherStudentSubscription = require("../models/TeacherStudentSubscription");

// Note: Add authMiddleware to protect these routes in production
// router.use(authMiddleware);

// ==================== STUDENT MANAGEMENT ====================

// Get all students with pagination and filters
router.get("/students", async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", grade, status } = req.query;

    const query = {};

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Grade filter
    if (grade) {
      query.grade = parseInt(grade);
    }

    // Status filter (banned/active)
    if (status === "banned") {
      query.isBanned = true;
    } else if (status === "active") {
      query.isBanned = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const students = await Student.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Student.countDocuments(query);

    res.status(200).json({
      success: true,
      data: students,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch students",
      error: error.message,
    });
  }
});

// Get single student by ID with detailed information
router.get("/students/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .select("-password")
      .populate("subscriptions.teacherId", "name email");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Get student's exam results
    const ExamResult = require("../models/ExamResult");
    const examResults = await ExamResult.find({ userId: student._id })
      .populate("examId", "title subject examType grade")
      .sort({ date: -1 })
      .limit(10);

    // Calculate exam statistics
    const totalExamsTaken = examResults.length;
    const averageScore =
      examResults.length > 0
        ? Math.round(
            examResults.reduce(
              (sum, result) => sum + (result.performancePercentage || 0),
              0
            ) / examResults.length
          )
        : 0;

    const passedExams = examResults.filter(
      (r) => (r.performancePercentage || 0) >= 50
    ).length;
    const failedExams = totalExamsTaken - passedExams;

    // Get subject performance
    const subjectPerformance = {};
    examResults.forEach((result) => {
      if (result.examId && result.examId.subject) {
        const subject = result.examId.subject;
        if (!subjectPerformance[subject]) {
          subjectPerformance[subject] = { total: 0, count: 0, scores: [] };
        }
        subjectPerformance[subject].total += result.performancePercentage || 0;
        subjectPerformance[subject].count += 1;
        subjectPerformance[subject].scores.push(
          result.performancePercentage || 0
        );
      }
    });

    const subjectStats = Object.keys(subjectPerformance)
      .map((subject) => ({
        subject,
        average: Math.round(
          subjectPerformance[subject].total / subjectPerformance[subject].count
        ),
        examsCount: subjectPerformance[subject].count,
        highest: Math.max(...subjectPerformance[subject].scores),
        lowest: Math.min(...subjectPerformance[subject].scores),
      }))
      .sort((a, b) => b.average - a.average);

    // Get teachers count
    const activeTeachers =
      student.subscriptions?.filter((sub) => sub.isActive).length || 0;

    // Build comprehensive response
    const response = {
      ...student.toObject(),
      statistics: {
        totalExamsTaken,
        averageScore,
        passedExams,
        failedExams,
        activeTeachers,
        totalTeachers: student.subscriptions?.length || 0,
      },
      recentExamResults: examResults.map((result) => ({
        _id: result._id,
        exam: result.examId,
        score: result.score,
        totalQuestions: result.totalQuestions,
        performancePercentage: result.performancePercentage,
        date: result.date,
      })),
      subjectPerformance: subjectStats,
      activeSubscriptions:
        student.subscriptions?.filter((sub) => {
          if (!sub.isActive) return false;
          const now = new Date();
          const activeUntil = new Date(sub.activeUntil);
          return activeUntil > now;
        }) || [],
    };

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Error fetching student:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch student",
      error: error.message,
    });
  }
});

// Ban/Unban student
router.patch("/students/:id/ban", async (req, res) => {
  try {
    const { isBanned } = req.body;

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { isBanned },
      { new: true }
    ).select("-password");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Student ${isBanned ? "banned" : "unbanned"} successfully`,
      data: student,
    });
  } catch (error) {
    console.error("Error updating student ban status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update student ban status",
      error: error.message,
    });
  }
});

// Delete student
router.delete("/students/:id", async (req, res) => {
  try {
    const studentId = req.params.id;

    // 1) احذف اشتراكات الطالب (طالب-منصة)
    await StudentSubscription.deleteMany({ studentId });

    // 2) احذف اشتراكات الطالب مع المعلمين (TeacherStudentSubscription)
    await TeacherStudentSubscription.deleteMany({ studentId });

    // 3) احذف الطالب نفسه
    const student = await Student.findByIdAndDelete(studentId);

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Student and related subscriptions deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting student:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete student",
      error: error.message,
    });
  }
});

// ==================== TEACHER MANAGEMENT ====================

// Get all teachers with pagination and filters
router.get("/teachers", async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status } = req.query;

    const query = {};

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Status filter
    if (status === "banned") {
      query.isBanned = true;
    } else if (status === "active") {
      query.isBanned = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const teachers = await Teacher.find(query)
      .select("-password")
      .populate("subscription", "status planId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Teacher.countDocuments(query);

    res.status(200).json({
      success: true,
      data: teachers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching teachers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch teachers",
      error: error.message,
    });
  }
});

// Get single teacher by ID with detailed information
router.get("/teachers/:id", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .select("-password")
      .populate({
        path: "subscription",
        populate: {
          path: "planId",
          model: "Plan",
        },
      });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    // Get teacher's exams
    const exams = await Exam.find({ createdBy: teacher._id })
      .select("title subject examType grade createdAt")
      .sort({ createdAt: -1 })
      .limit(10);

    // Get teacher's students count (from TeacherStudentSubscription)
    const TeacherStudentSubscription = require("../models/TeacherStudentSubscription");
    const studentsCount = await TeacherStudentSubscription.countDocuments({
      teacherId: teacher._id,
    });

    // Get recent students
    const recentStudents = await TeacherStudentSubscription.find({
      teacherId: teacher._id,
    })
      .populate("studentId", "name email grade")
      .sort({ createdAt: -1 })
      .limit(5);

    // Calculate days remaining in subscription
    let daysRemaining = null;
    if (teacher.subscription && teacher.subscription.endDate) {
      const now = new Date();
      const endDate = new Date(teacher.subscription.endDate);
      daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    }

    // Build comprehensive response
    const response = {
      ...teacher.toObject(),
      statistics: {
        totalExams: exams.length,
        totalStudents: studentsCount,
        examsUsage: teacher.currentUsage.examsCount,
        studentsUsage: teacher.currentUsage.studentsCount,
        questionsUsage: teacher.currentUsage.questionsCount,
        examsLimit: teacher.currentLimits.maxExams,
        studentsLimit: teacher.currentLimits.maxStudents,
        questionsLimit: teacher.currentLimits.maxQuestions,
      },
      recentExams: exams,
      recentStudents: recentStudents.map((s) => s.studentId).filter(Boolean),
      subscriptionDetails: teacher.subscription
        ? {
            ...teacher.subscription.toObject(),
            daysRemaining,
            isExpired: daysRemaining !== null && daysRemaining < 0,
          }
        : null,
    };

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Error fetching teacher:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch teacher",
      error: error.message,
    });
  }
});

// Ban/Unban teacher
router.patch("/teachers/:id/ban", async (req, res) => {
  try {
    const { isBanned } = req.body;

    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      { isBanned },
      { new: true }
    ).select("-password");

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Teacher ${isBanned ? "banned" : "unbanned"} successfully`,
      data: teacher,
    });
  } catch (error) {
    console.error("Error updating teacher ban status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update teacher ban status",
      error: error.message,
    });
  }
});

router.delete("/teachers/:id", async (req, res) => {
  try {
    const teacherId = req.params.id;

    // 1) احذف اشتراك المعلم (Subscription)
    await Subscription.deleteMany({ teacherId });

    // 2) احذف كل اشتراكات طلابه معه
    await TeacherStudentSubscription.deleteMany({ teacherId });

    // 3) (اختياري) احذف امتحاناته (إذا عندك createdBy على Exam)
    await Exam.deleteMany({ createdBy: teacherId });

    // 4) احذف المعلم نفسه
    const teacher = await Teacher.findByIdAndDelete(teacherId);

    if (!teacher) {
      return res
        .status(404)
        .json({ success: false, message: "Teacher not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Teacher and related subscriptions deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting teacher:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete teacher",
      error: error.message,
    });
  }
});

// ==================== EXAM MANAGEMENT ====================

// Get all exams with pagination
router.get("/exams", async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", examType, grade } = req.query;

    const query = {};

    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    if (examType) {
      query.examType = examType;
    }

    if (grade) {
      query.grade = parseInt(grade);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const exams = await Exam.find(query)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Exam.countDocuments(query);

    res.status(200).json({
      success: true,
      data: exams,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching exams:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch exams",
      error: error.message,
    });
  }
});

// Delete exam
router.delete("/exams/:id", async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Exam deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting exam:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete exam",
      error: error.message,
    });
  }
});

// ==================== SUBSCRIPTION UTILITIES ====================

// Fix subscriptions with null status
router.post("/fix-subscription-status", async (req, res) => {
  try {
    const subscriptionsToFix = await Subscription.find({
      $or: [{ status: null }, { status: { $exists: false } }],
    });

    if (subscriptionsToFix.length === 0) {
      return res.status(200).json({
        success: true,
        message: "All subscriptions already have valid status",
        fixed: 0,
      });
    }

    const updateResult = await Subscription.updateMany(
      {
        $or: [{ status: null }, { status: { $exists: false } }],
      },
      {
        $set: { status: "pending" },
      }
    );

    res.status(200).json({
      success: true,
      message: `Successfully fixed ${updateResult.modifiedCount} subscriptions`,
      fixed: updateResult.modifiedCount,
    });
  } catch (error) {
    console.error("Error fixing subscription status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fix subscription status",
      error: error.message,
    });
  }
});

// Get database statistics
router.get("/stats", async (req, res) => {
  try {
    const stats = {
      students: {
        total: await Student.countDocuments(),
        banned: await Student.countDocuments({ isBanned: true }),
        active: await Student.countDocuments({ isBanned: false }),
      },
      teachers: {
        total: await Teacher.countDocuments(),
        banned: await Teacher.countDocuments({ isBanned: true }),
        active: await Teacher.countDocuments({ isBanned: false }),
      },
      exams: {
        total: await Exam.countDocuments(),
        byType: await Exam.aggregate([
          {
            $group: {
              _id: "$examType",
              count: { $sum: 1 },
            },
          },
        ]),
      },
      subscriptions: {
        total: await Subscription.countDocuments(),
        withNullStatus: await Subscription.countDocuments({
          $or: [{ status: null }, { status: { $exists: false } }],
        }),
        byStatus: await Subscription.aggregate([
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]),
      },
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error getting stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get stats",
      error: error.message,
    });
  }
});

module.exports = router;
