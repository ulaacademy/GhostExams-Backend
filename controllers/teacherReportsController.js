const TeacherExamResult = require('../models/TeacherExamResult');
const TeacherCustomExam = require('../models/TeacherCustomExam');

// ✅ جلب تقارير المعلم
exports.getTeacherReports = async (req, res) => {
  try {
    const teacherId = req.user.id || req.user._id; // من middleware
    
    console.log('📊 جلب تقارير المعلم:', teacherId);

    // جلب جميع امتحانات المعلم
    const exams = await TeacherCustomExam.find({ 
      teacherId: teacherId 
    }).select('examName subject grade term createdAt questions');

    if (!exams || exams.length === 0) {
      return res.status(200).json({
        success: true,
        reports: [],
        message: 'لا توجد امتحانات بعد'
      });
    }

    // جلب نتائج كل امتحان
    const reports = await Promise.all(
      exams.map(async (exam) => {
        const results = await TeacherExamResult.find({ 
          examId: exam._id 
        }).populate('studentId', 'name email');

        // حساب الإحصائيات
        const studentsCount = results.length;
        const totalScore = results.reduce((sum, r) => sum + (r.score || 0), 0);
        const averageScore = studentsCount > 0 
          ? (totalScore / studentsCount).toFixed(2) 
          : 0;

        // أعلى وأقل درجة
        const scores = results.map(r => r.score || 0);
        const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
        const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

        // عدد الطلاب الناجحين (أكثر من 50%)
        const passingStudents = results.filter(
          r => (r.score / r.totalQuestions) * 100 >= 50
        ).length;

        return {
          examId: exam._id,
          examName: exam.examName,
          subject: exam.subject,
          grade: exam.grade,
          term: exam.term,
          studentsCount,
          averageScore: parseFloat(averageScore),
          highestScore,
          lowestScore,
          passingStudents,
          passingRate: studentsCount > 0 
            ? ((passingStudents / studentsCount) * 100).toFixed(2) 
            : 0,
          createdAt: exam.createdAt,
          updatedAt: exam.createdAt
        };
      })
    );

    // ترتيب التقارير حسب التاريخ (الأحدث أولاً)
    reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      reports,
      totalExams: reports.length
    });

  } catch (error) {
    console.error('❌ خطأ في جلب التقارير:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب التقارير',
      error: error.message
    });
  }
};

// ✅ جلب تقرير تفصيلي لامتحان واحد
exports.getExamDetailedReport = async (req, res) => {
  try {
    const { examId } = req.params;
    const teacherId = req.user.id || req.user._id;

    console.log('📊 جلب تقرير تفصيلي للامتحان:', examId);

    // التحقق من أن الامتحان يخص المعلم
    const exam = await TeacherCustomExam.findOne({
      _id: examId,
      teacherId: teacherId
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'الامتحان غير موجود'
      });
    }

    // جلب جميع نتائج الطلاب
    const results = await TeacherExamResult.find({ 
      examId 
    })
      .populate('studentId', 'name email grade')
      .sort({ score: -1 }); // ترتيب حسب الدرجة

    // تفاصيل كل طالب
    const studentDetails = results.map((result, index) => ({
      rank: index + 1,
      studentName: result.studentId?.name || 'غير معروف',
      studentEmail: result.studentId?.email || '',
      studentGrade: result.studentId?.grade || '',
      score: result.score,
      totalQuestions: result.totalQuestions,
      percentage: ((result.score / result.totalQuestions) * 100).toFixed(2),
      timeSpent: result.timeSpent || 'غير محدد',
      submittedAt: result.submittedAt,
      passed: (result.score / result.totalQuestions) * 100 >= 50
    }));

    // إحصائيات الامتحان
    const totalStudents = results.length;
    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    const averageScore = totalStudents > 0 
      ? (totalScore / totalStudents).toFixed(2) 
      : 0;
    const averagePercentage = totalStudents > 0
      ? ((totalScore / (totalStudents * exam.questions.length)) * 100).toFixed(2)
      : 0;

    res.status(200).json({
      success: true,
      exam: {
        id: exam._id,
        title: exam.examName,
        subject: exam.subject,
        grade: exam.grade,
        term: exam.term,
        totalQuestions: exam.questions.length,
        createdAt: exam.createdAt
      },
      statistics: {
        totalStudents,
        averageScore: parseFloat(averageScore),
        averagePercentage: parseFloat(averagePercentage),
        passedStudents: studentDetails.filter(s => s.passed).length,
        failedStudents: studentDetails.filter(s => !s.passed).length
      },
      students: studentDetails
    });

  } catch (error) {
    console.error('❌ خطأ في جلب التقرير التفصيلي:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب التقرير التفصيلي',
      error: error.message
    });
  }
};

