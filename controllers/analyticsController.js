const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const Subscription = require("../models/Subscription");
const Plan = require("../models/Plan");
const Exam = require("../models/Exam");
const Question = require("../models/Question");

const TeacherCustomExam = require("../models/TeacherCustomExam");
const StudentSubscription = require("../models/StudentSubscription");

// 1. Get Dashboard Overview Statistics
exports.getDashboardOverview = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Total counts
    const totalTeachers = await Teacher.countDocuments();
    const totalStudents = await Student.countDocuments();
    const totalSubscriptions = await Subscription.countDocuments();
    const platformExams = await Exam.countDocuments();
    const teacherExams = await TeacherCustomExam.countDocuments();
    const totalExams = platformExams + teacherExams;
    const totalQuestions = await Question.countDocuments();
    const totalPlans = await Plan.countDocuments({ isActive: true });

    // Active subscriptions
    const activeSubscriptions = await Subscription.countDocuments({
      status: "active",
    });

    // Recent additions (last 30 days)
    const newTeachers = await Teacher.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });
    const newStudents = await Student.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });
    const newSubscriptions = await Subscription.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Calculate growth percentages
    const teacherGrowth =
      totalTeachers > 0 ? ((newTeachers / totalTeachers) * 100).toFixed(1) : 0;
    const studentGrowth =
      totalStudents > 0 ? ((newStudents / totalStudents) * 100).toFixed(1) : 0;
    const subscriptionGrowth =
      totalSubscriptions > 0
        ? ((newSubscriptions / totalSubscriptions) * 100).toFixed(1)
        : 0;

    // Revenue calculation
    // ✅ Teacher revenue: from Subscription.amount (paid)
    // ✅ Revenue (JOD)

    // -------- Teacher revenue (paid) from Subscription.amount --------
    const teacherRevenueAgg = await Subscription.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$amount", 0] } } } },
    ]);
    const teacherTotalRevenue = teacherRevenueAgg?.[0]?.total || 0;

    // Monthly teacher revenue (last 30 days) - using createdAt (or paymentDate if you have it)
    const teacherMonthlyAgg = await Subscription.aggregate([
      { $match: { paymentStatus: "paid", createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$amount", 0] } } } },
    ]);
    const teacherMonthlyRevenue = teacherMonthlyAgg?.[0]?.total || 0;

    // -------- Student revenue (paid) from StudentSubscription.planSnapshot.price --------
    const studentRevenueAgg = await StudentSubscription.aggregate([
      { $match: { paymentStatus: "paid" } },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ["$planSnapshot.price", 0] } },
        },
      },
    ]);
    const studentTotalRevenue = studentRevenueAgg?.[0]?.total || 0;

    // Monthly student revenue (last 30 days) using createdAt
    const studentMonthlyAgg = await StudentSubscription.aggregate([
      { $match: { paymentStatus: "paid", createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ["$planSnapshot.price", 0] } },
        },
      },
    ]);
    const studentMonthlyRevenue = studentMonthlyAgg?.[0]?.total || 0;

    // -------- Totals --------
    const totalRevenue = teacherTotalRevenue + studentTotalRevenue;
    const monthlyRevenue = teacherMonthlyRevenue + studentMonthlyRevenue;

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalTeachers,
          totalStudents,
          totalSubscriptions,
          activeSubscriptions,
          totalExams,
          totalQuestions,
          totalPlans,
          // ✅ new breakdown
          teacherTotalRevenue,
          studentTotalRevenue,
          totalRevenue,

          teacherMonthlyRevenue,
          studentMonthlyRevenue,
          monthlyRevenue,

          currency: "JOD",
        },
        growth: {
          teachers: {
            total: totalTeachers,
            new: newTeachers,
            percentage: teacherGrowth,
          },
          students: {
            total: totalStudents,
            new: newStudents,
            percentage: studentGrowth,
          },
          subscriptions: {
            total: totalSubscriptions,
            new: newSubscriptions,
            percentage: subscriptionGrowth,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error in getDashboardOverview:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ في جلب إحصائيات لوحة التحكم",
      error: error.message,
    });
  }
};

// 2. Get Revenue Analytics
exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { period = "30" } = req.query; // days
    const daysAgo = new Date(
      Date.now() - parseInt(period) * 24 * 60 * 60 * 1000,
    );

    // Revenue by payment status
    const revenueByStatus = await Subscription.aggregate([
      {
        $group: {
          _id: "$paymentStatus",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Revenue by payment method
    const revenueByMethod = await Subscription.aggregate([
      {
        $match: { paymentStatus: "paid" },
      },
      {
        $group: {
          _id: "$paymentMethod",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Daily revenue trend (last 30 days)
    const dailyRevenue = await Subscription.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          paymentDate: { $gte: daysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$paymentDate" },
          },
          revenue: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Revenue by plan
    const revenueByPlan = await Subscription.aggregate([
      {
        $match: { paymentStatus: "paid" },
      },
      {
        $lookup: {
          from: "plans",
          localField: "planId",
          foreignField: "_id",
          as: "planDetails",
        },
      },
      {
        $unwind: "$planDetails",
      },
      {
        $group: {
          _id: "$planDetails.name",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        byStatus: revenueByStatus,
        byMethod: revenueByMethod,
        byPlan: revenueByPlan,
        dailyTrend: dailyRevenue,
      },
    });
  } catch (error) {
    console.error("Error in getRevenueAnalytics:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ في جلب تحليلات الإيرادات",
      error: error.message,
    });
  }
};

// 3. Get Subscription Analytics
exports.getSubscriptionAnalytics = async (req, res) => {
  try {
    // Subscriptions by status (filter out null/undefined statuses)
    const byStatus = await Subscription.aggregate([
      {
        $match: {
          status: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Subscriptions by plan (only include subscriptions with valid status)
    const byPlan = await Subscription.aggregate([
      {
        $match: {
          status: { $exists: true, $ne: null },
        },
      },
      {
        $lookup: {
          from: "plans",
          localField: "planId",
          foreignField: "_id",
          as: "planDetails",
        },
      },
      {
        $unwind: "$planDetails",
      },
      {
        $group: {
          _id: "$planDetails.name",
          active: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
          expired: {
            $sum: { $cond: [{ $eq: ["$status", "expired"] }, 1, 0] },
          },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },
    ]);

    // Expiring soon (next 7 days)
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const expiringSoon = await Subscription.countDocuments({
      status: "active",
      endDate: { $lte: sevenDaysFromNow, $gte: new Date() },
    });

    // Monthly subscription trend (last 6 months)
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const monthlyTrend = await Subscription.aggregate([
      {
        $match: { createdAt: { $gte: sixMonthsAgo } },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        byStatus,
        byPlan,
        expiringSoon,
        monthlyTrend,
      },
    });
  } catch (error) {
    console.error("Error in getSubscriptionAnalytics:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ في جلب تحليلات الاشتراكات",
      error: error.message,
    });
  }
};

// 4. Get Exam Analytics
exports.getExamAnalytics = async (req, res) => {
  try {
    // Exams by type
    const byType = await Exam.aggregate([
      {
        $group: {
          _id: "$examType",
          count: { $sum: 1 },
        },
      },
    ]);

    // Exams by subject
    const bySubject = await Exam.aggregate([
      {
        $group: {
          _id: "$subject",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    // Exams by grade
    const byGrade = await Exam.aggregate([
      {
        $group: {
          _id: "$grade",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Recent exams creation trend (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentTrend = await Exam.aggregate([
      {
        $match: { createdAt: { $gte: thirtyDaysAgo } },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Top exam creators
    const topCreators = await Exam.aggregate([
      {
        $match: { createdBy: { $exists: true, $ne: null } },
      },
      {
        $group: {
          _id: "$createdBy",
          examCount: { $sum: 1 },
        },
      },
      {
        $sort: { examCount: -1 },
      },
      {
        $limit: 5,
      },
      {
        $lookup: {
          from: "teachers",
          localField: "_id",
          foreignField: "_id",
          as: "teacher",
        },
      },
      {
        $unwind: "$teacher",
      },
      {
        $project: {
          teacherName: "$teacher.name",
          teacherEmail: "$teacher.email",
          examCount: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        byType,
        bySubject,
        byGrade,
        recentTrend,
        topCreators,
      },
    });
  } catch (error) {
    console.error("Error in getExamAnalytics:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ في جلب تحليلات الامتحانات",
      error: error.message,
    });
  }
};

// 5. Get Recent Activities
exports.getRecentActivities = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Recent teachers
    const recentTeachers = await Teacher.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) / 4)
      .select("name email createdAt");

    // Recent students
    const recentStudents = await Student.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) / 4)
      .select("name email createdAt");

    // Recent subscriptions
    const recentSubscriptions = await Subscription.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) / 4)
      .populate("teacherId", "name email")
      .populate("planId", "name");

    // Recent exams
    const recentExams = await Exam.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) / 4)
      .populate("createdBy", "name")
      .select("title subject examType createdAt");

    // Combine and sort all activities
    const activities = [
      ...recentTeachers.map((t) => ({
        type: "teacher",
        action: "registered",
        user: t.name,
        email: t.email,
        timestamp: t.createdAt,
      })),
      ...recentStudents.map((s) => ({
        type: "student",
        action: "registered",
        user: s.name,
        email: s.email,
        timestamp: s.createdAt,
      })),
      ...recentSubscriptions.map((sub) => ({
        type: "subscription",
        action: "created",
        user: sub.teacherId?.name || "Unknown",
        plan: sub.planId?.name || "Unknown",
        status: sub.status,
        timestamp: sub.createdAt,
      })),
      ...recentExams.map((exam) => ({
        type: "exam",
        action: "created",
        title: exam.title,
        subject: exam.subject,
        examType: exam.examType,
        creator: exam.createdBy?.name || "System",
        timestamp: exam.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error("Error in getRecentActivities:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ في جلب الأنشطة الأخيرة",
      error: error.message,
    });
  }
};

// 6. Get User Analytics (Teachers & Students)
exports.getUserAnalytics = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Teacher statistics
    const totalTeachers = await Teacher.countDocuments();
    const activeTeachers = await Teacher.countDocuments({
      subscription: { $exists: true, $ne: null },
    });
    const bannedTeachers = await Teacher.countDocuments({ isBanned: true });

    // Student statistics
    const totalStudents = await Student.countDocuments();
    const bannedStudents = await Student.countDocuments({ isBanned: true });

    // User growth trend (last 30 days)
    const teacherGrowth = await Teacher.aggregate([
      {
        $match: { createdAt: { $gte: thirtyDaysAgo } },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const studentGrowth = await Student.aggregate([
      {
        $match: { createdAt: { $gte: thirtyDaysAgo } },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Students by grade
    const studentsByGrade = await Student.aggregate([
      {
        $match: { grade: { $exists: true, $ne: null } },
      },
      {
        $group: {
          _id: "$grade",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        teachers: {
          total: totalTeachers,
          active: activeTeachers,
          banned: bannedTeachers,
          growth: teacherGrowth,
        },
        students: {
          total: totalStudents,
          banned: bannedStudents,
          byGrade: studentsByGrade,
          growth: studentGrowth,
        },
      },
    });
  } catch (error) {
    console.error("Error in getUserAnalytics:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ في جلب تحليلات المستخدمين",
      error: error.message,
    });
  }
};

// 7. Get Plan Analytics
exports.getPlanAnalytics = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true });

    const planStats = await Promise.all(
      plans.map(async (plan) => {
        const subscriptions = await Subscription.countDocuments({
          planId: plan._id,
        });
        const activeSubscriptions = await Subscription.countDocuments({
          planId: plan._id,
          status: "active",
        });
        const revenue = await Subscription.aggregate([
          {
            $match: {
              planId: plan._id,
              paymentStatus: "paid",
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" },
            },
          },
        ]);

        return {
          planId: plan._id,
          name: plan.name,
          price: plan.price,
          duration: plan.duration,
          totalSubscriptions: subscriptions,
          activeSubscriptions,
          revenue: revenue[0]?.total || 0,
          features: plan.features,
        };
      }),
    );

    res.status(200).json({
      success: true,
      data: planStats,
    });
  } catch (error) {
    console.error("Error in getPlanAnalytics:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ في جلب تحليلات الباقات",
      error: error.message,
    });
  }
};
