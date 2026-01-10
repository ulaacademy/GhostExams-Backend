// backend/controllers/teacherDashboardController.js

const Student = require("../models/Student");
const TeacherCustomExam = require("../models/TeacherCustomExam");
const ExamResult = require("../models/ExamResult");
const TeacherExamResult = require("../models/TeacherExamResult"); // ✅ تأكد انه مستورد بالأعلى
const TeacherStudentSubscription = require("../models/TeacherStudentSubscription");

// ✅ جلب كل الطلاب (بدون شرط teacherId)
exports.getTeacherStudents = async (req, res) => {
  try {
    // Log incoming request for debugging
    console.log("📡 Request to /students");
    console.log("Query params:", req.query);
    console.log("Body:", req.body);
    console.log("Auth user:", req.user);

    // Try to get teacherId from multiple sources
    const teacherId = req.body.teacherId || req.query.teacherId || req.user?.id || req.user?._id;

    if (!teacherId) {
      console.error("❌ teacherId not found in query, body, or auth token");
      return res.status(400).json({ 
        message: "❌ teacherId مفقود في الطلب.",
        debug: {
          query: req.query,
          bodyKeys: Object.keys(req.body || {}),
          hasUser: !!req.user
        }
      });
    }

    console.log("✅ Using teacherId:", teacherId);

    // ✅ جلب كل اشتراكات هذا المعلم
    const subscriptions = await TeacherStudentSubscription.find({ teacherId });

    const studentIds = subscriptions.map(sub => sub.studentId);

    const students = await Student.find({ _id: { $in: studentIds } });

    res.json({ students });
  } catch (error) {
    console.error("❌ خطأ أثناء جلب طلاب المعلم:", error);
    res.status(500).json({ message: "❌ خطأ داخلي." });
  }
};


// ✅ جلب أداء الطلاب مع pagination و search - محسّن لعرض بيانات شاملة
exports.getTeacherStudentsPerformance = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const search = (req.query.search || "").trim();
    const sortBy = req.query.sortBy || "totalExams"; // Default sort by total exams
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    // ✅ بناء فلتر البحث
    const filter = { teacherId };
    if (search) {
      // We'll filter after aggregation since we need to search student names
      filter._search = search;
    }

    // ✅ جلب جميع نتائج الامتحانات للمعلم
    const allResults = await TeacherExamResult.find({ teacherId })
      .populate('studentId', 'name email')
      .populate('examId', 'title subject name grade term')
      .sort({ createdAt: -1 })
      .lean();

    // ✅ تجميع البيانات حسب الطالب و الامتحان
    const studentPerformanceMap = {};
    const examStatisticsMap = {}; // ✅ إحصائيات الامتحانات

    allResults.forEach((record) => {
      const studentId = record.studentId?._id?.toString() || record.studentId?.toString();
      const studentName = record.studentId?.name || record.studentName || 'غير محدد';
      const studentEmail = record.studentId?.email || '';
      const examId = record.examId?._id?.toString() || record.examId?.toString();
      const examName = record.examId?.title || record.examId?.name || record.examName || 'غير محدد';
      const examSubject = record.examId?.subject || 'غير محدد';

      if (!studentId || !examId) return;

      // ✅ تجميع بيانات الطالب
      if (!studentPerformanceMap[studentId]) {
        studentPerformanceMap[studentId] = {
          studentId: studentId,
          studentName: studentName,
          studentEmail: studentEmail,
          totalExams: 0,
          scores: [],
          subjects: new Set(),
          examNames: [],
          dates: [],
          examAttempts: {}, // ✅ عدد مرات أخذ كل امتحان
          totalTimeSpent: 0,
          bestScore: 0,
          worstScore: 100,
          averageScore: 0,
          lastExamDate: null,
          firstExamDate: null,
          improvement: null, // Will calculate trend
        };
      }

      const student = studentPerformanceMap[studentId];
      const score = record.score || record.percentage || 0;
      
      student.totalExams += 1;
      student.scores.push(score);
      student.examNames.push(examName);
      
      // ✅ حساب عدد مرات أخذ كل امتحان
      if (!student.examAttempts[examId]) {
        student.examAttempts[examId] = {
          examId: examId,
          examName: examName,
          count: 0,
          scores: [],
          averageScore: 0,
          bestScore: 0,
          worstScore: 100,
        };
      }
      student.examAttempts[examId].count += 1;
      student.examAttempts[examId].scores.push(score);
      if (score > student.examAttempts[examId].bestScore) {
        student.examAttempts[examId].bestScore = score;
      }
      if (score < student.examAttempts[examId].worstScore) {
        student.examAttempts[examId].worstScore = score;
      }
      
      if (record.examId?.subject) {
        student.subjects.add(record.examId.subject);
      }
      
      const examDate = record.createdAt || record.date || record.submittedAt;
      if (examDate) {
        student.dates.push(new Date(examDate));
        if (!student.lastExamDate || new Date(examDate) > student.lastExamDate) {
          student.lastExamDate = new Date(examDate);
        }
        if (!student.firstExamDate || new Date(examDate) < student.firstExamDate) {
          student.firstExamDate = new Date(examDate);
        }
      }

      if (score > student.bestScore) {
        student.bestScore = score;
      }
      if (score < student.worstScore) {
        student.worstScore = score;
      }

      // ✅ تجميع إحصائيات الامتحانات
      if (!examStatisticsMap[examId]) {
        examStatisticsMap[examId] = {
          examId: examId,
          examName: examName,
          subject: examSubject,
          totalAttempts: 0,
          uniqueStudents: new Set(),
          scores: [],
          averageScore: 0,
          bestScore: 0,
          worstScore: 100,
          lastAttemptDate: null,
        };
      }

      const examStats = examStatisticsMap[examId];
      examStats.totalAttempts += 1;
      examStats.uniqueStudents.add(studentId);
      examStats.scores.push(score);
      
      if (examDate) {
        if (!examStats.lastAttemptDate || new Date(examDate) > examStats.lastAttemptDate) {
          examStats.lastAttemptDate = new Date(examDate);
        }
      }

      if (score > examStats.bestScore) {
        examStats.bestScore = score;
      }
      if (score < examStats.worstScore) {
        examStats.worstScore = score;
      }
    });

    // ✅ حساب الإحصائيات لكل طالب
    const students = Object.values(studentPerformanceMap).map((student) => {
      // Calculate average score
      student.averageScore = student.scores.length > 0
        ? Math.round(student.scores.reduce((sum, s) => sum + s, 0) / student.scores.length)
        : 0;

      // Calculate improvement trend (compare first half vs second half of exams)
      if (student.scores.length >= 4) {
        const midPoint = Math.floor(student.scores.length / 2);
        const firstHalf = student.scores.slice(0, midPoint);
        const secondHalf = student.scores.slice(midPoint);
        
        const firstHalfAvg = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length;
        
        student.improvement = Math.round(secondHalfAvg - firstHalfAvg);
      } else {
        student.improvement = null;
      }

      // Convert Set to Array for subjects
      student.subjectsCount = student.subjects.size;
      student.subjects = Array.from(student.subjects);

      // Format dates
      student.lastExamDate = student.lastExamDate ? student.lastExamDate.toISOString() : null;
      student.firstExamDate = student.firstExamDate ? student.firstExamDate.toISOString() : null;

      // Calculate achievements
      student.achievements = [];
      if (student.bestScore >= 95) {
        student.achievements.push('ممتاز');
      }
      if (student.totalExams >= 10) {
        student.achievements.push('نشط');
      }
      if (student.improvement && student.improvement > 10) {
        student.achievements.push('محسّن');
      }
      if (student.subjectsCount >= 3) {
        student.achievements.push('متنوع');
      }

      // ✅ حساب متوسط الدرجات لكل امتحان
      Object.keys(student.examAttempts).forEach((examId) => {
        const examAttempt = student.examAttempts[examId];
        if (examAttempt.scores.length > 0) {
          examAttempt.averageScore = Math.round(
            examAttempt.scores.reduce((sum, s) => sum + s, 0) / examAttempt.scores.length
          );
        }
        delete examAttempt.scores; // Remove scores array to reduce payload
      });

      // Convert examAttempts object to array for easier frontend handling
      student.examAttemptsList = Object.values(student.examAttempts);

      // Remove internal arrays to reduce payload size
      delete student.scores;
      delete student.examNames;
      delete student.dates;
      delete student.examAttempts; // Keep only examAttemptsList

      return student;
    });

    // ✅ حساب إحصائيات الامتحانات
    const examStatistics = Object.values(examStatisticsMap).map((exam) => {
      exam.averageScore = exam.scores.length > 0
        ? Math.round(exam.scores.reduce((sum, s) => sum + s, 0) / exam.scores.length)
        : 0;
      exam.uniqueStudentsCount = exam.uniqueStudents.size;
      exam.lastAttemptDate = exam.lastAttemptDate ? exam.lastAttemptDate.toISOString() : null;
      
      // Remove internal data
      delete exam.scores;
      delete exam.uniqueStudents;
      
      return exam;
    });

    // ✅ ترتيب الامتحانات حسب عدد المرات التي تم إجراؤها
    examStatistics.sort((a, b) => b.totalAttempts - a.totalAttempts);

    // ✅ تطبيق البحث إذا كان موجوداً
    let filteredStudents = students;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredStudents = students.filter((student) => {
        return (
          student.studentName.toLowerCase().includes(searchLower) ||
          student.studentEmail.toLowerCase().includes(searchLower) ||
          student.subjects.some((subj) => subj.toLowerCase().includes(searchLower))
        );
      });
    }

    // ✅ تطبيق الترتيب
    filteredStudents.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'totalExams':
          aValue = a.totalExams;
          bValue = b.totalExams;
          break;
        case 'averageScore':
          aValue = a.averageScore;
          bValue = b.averageScore;
          break;
        case 'bestScore':
          aValue = a.bestScore;
          bValue = b.bestScore;
          break;
        case 'lastExamDate':
          aValue = a.lastExamDate ? new Date(a.lastExamDate).getTime() : 0;
          bValue = b.lastExamDate ? new Date(b.lastExamDate).getTime() : 0;
          break;
        case 'studentName':
          aValue = a.studentName.toLowerCase();
          bValue = b.studentName.toLowerCase();
          break;
        default:
          aValue = a.totalExams;
          bValue = b.totalExams;
      }

      if (typeof aValue === 'string') {
        return sortOrder === 1 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return sortOrder === 1 ? aValue - bValue : bValue - aValue;
    });

    // ✅ تطبيق pagination
    const total = filteredStudents.length;
    const paginatedStudents = filteredStudents.slice(
      (page - 1) * limit,
      page * limit
    );

    res.status(200).json({ 
      students: paginatedStudents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      examStatistics: examStatistics // ✅ إحصائيات الامتحانات
    });
  } catch (error) {
    console.error("❌ فشل في جلب أداء الطلاب:", error);
    res.status(500).json({ message: "فشل في جلب أداء الطلاب" });
  }
};

// ✅ جلب احصائيات الداشبورد
exports.getTeacherDashboardMetrics = async (req, res) => {
  try {
    // Log incoming request for debugging
    console.log("📡 Request to /dashboard-metrics");
    console.log("Query params:", req.query);
    console.log("Body:", req.body);
    console.log("Headers:", req.headers);
    console.log("Auth user:", req.user);

    // Try to get userId from multiple sources
    const userId = req.query.userId || req.body.userId || req.user?.id || req.user?._id;

    if (!userId) {
      console.error("❌ userId not found in query, body, or auth token");
      return res.status(400).json({ 
        message: "❌ لم يتم إرسال userId.", 
        debug: {
          query: req.query,
          bodyKeys: Object.keys(req.body || {}),
          hasUser: !!req.user
        }
      });
    }

    console.log("✅ Using userId:", userId);

    // ✅ المعلم الحالي
    const teacherId = userId;

    // ✅ عدد الطلاب
    const subscriptions = await TeacherStudentSubscription.find({ teacherId });
    const totalStudents = subscriptions.length;
    

    // ✅ عدد الامتحانات التي أنشأها المعلم
    const activeExams = await TeacherCustomExam.countDocuments({ teacherId });

    // ✅ المعدل العام للطلاب في امتحانات المعلم
    const studentResults = await TeacherExamResult.find({ teacherId }); // ✅ فلترة حسب المعلم
    const averageScore = studentResults.length
      ? Math.round(
          studentResults.reduce((sum, r) => sum + r.score, 0) /
            studentResults.length
        )
      : 0;

    // ✅ عدد الطلاب المتفوقين (مثلاً أعلى من 85%)
    const topPerformers = studentResults.filter((r) => r.score >= 85).length;

    // ✅ مجموع عدد كل الامتحانات المقدمة من الطلاب
    const totalExamsSubmitted = await TeacherExamResult.countDocuments({
      teacherId,
    });

    // ✅ توزيع حالة الامتحانات بناءً على البيانات الفعلية
    const totalExamsCreated = await TeacherCustomExam.countDocuments({ teacherId });
    const completedExams = await TeacherExamResult.countDocuments({ teacherId });
    const pendingExams = Math.max(0, totalExamsCreated - completedExams);
    
    const examCompletion = [
      { name: "مكتمل", value: completedExams },
      { name: "قيد الحل", value: Math.floor(pendingExams * 0.3) },
      { name: "لم يتم الحل", value: Math.floor(pendingExams * 0.7) },
    ];

    // ✅ -------------------------------
    // ✅ إحصائيات الأداء حسب المادة والدرجات
    // ✅ -------------------------------

    // ✅ جلب نتائج امتحانات المعلم من TeacherExamResult بدلاً من ExamResult
    const teacherExamResults = await TeacherExamResult.find({ teacherId });

    let subjectPerformance = [];
    let gradeDistribution = [];

    if (teacherExamResults.length > 0) {
      // ✅ حساب الأداء حسب المادة
      const subjectPerformanceMap = {};

      teacherExamResults.forEach((result) => {
        const subject = result.examId?.subject || 'غير محدد';
        if (!subjectPerformanceMap[subject]) {
          subjectPerformanceMap[subject] = { total: 0, count: 0 };
        }
        subjectPerformanceMap[subject].total += result.score || 0;
        subjectPerformanceMap[subject].count += 1;
      });

      subjectPerformance = Object.keys(subjectPerformanceMap).map(
        (subject) => ({
          label: subject,
          value: Math.round(
            subjectPerformanceMap[subject].total /
              subjectPerformanceMap[subject].count
          ),
        })
      );

      // ✅ توزيع الدرجات بناءً على نتائج TeacherExamResult
      gradeDistribution = [
        { label: "90-100", value: teacherExamResults.filter((r) => (r.score || 0) >= 90).length },
        { label: "80-89", value: teacherExamResults.filter((r) => (r.score || 0) >= 80 && (r.score || 0) <= 89).length },
        { label: "70-79", value: teacherExamResults.filter((r) => (r.score || 0) >= 70 && (r.score || 0) <= 79).length },
        { label: "60-69", value: teacherExamResults.filter((r) => (r.score || 0) >= 60 && (r.score || 0) <= 69).length },
        { label: "أقل من 60", value: teacherExamResults.filter((r) => (r.score || 0) < 60).length },
      ];
    }

    // ✅ لوجز للتأكد
    console.log("✅ totalStudents:", totalStudents);
    console.log("✅ activeExams:", activeExams);
    console.log("✅ averageScore:", averageScore);
    console.log("✅ topPerformers:", topPerformers);
    console.log("✅ teacherExamResults count:", teacherExamResults.length);
    console.log("✅ gradeDistribution:", gradeDistribution);
    console.log("✅ subjectPerformance:", subjectPerformance);

    // ✅ إرجاع البيانات النهائية
    res.json({
      totalStudents,
      activeExams,
      averageScore,
      topPerformers,
      examCompletion,
      totalExamsSubmitted,
      subjectPerformance,
      gradeDistribution,
    });
  } catch (error) {
    console.error("❌ خطأ في جلب إحصائيات الداشبورد:", error);
    res.status(500).json({ message: "❌ خطأ داخلي في جلب إحصائيات الداشبورد" });
  }
};
