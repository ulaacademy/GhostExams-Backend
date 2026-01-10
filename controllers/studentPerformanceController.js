const mongoose = require("mongoose"); // ✅ إصلاح الخطأ
const StudentPerformance = require("../models/StudentPerformance");
const ExamResult = require("../models/ExamResult");
const QuestionBank = require("../models/QuestionBank");

const getStudentPerformance = async (req, res) => {
  try {
    const userId = req.query.userId || req.params.userId;
    if (!userId) {
      return res.status(400).json({ message: "❌ يجب توفير معرف الطالب." });
    }

    console.log(`📡 جلب بيانات الأداء للطالب: ${userId}`);

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const examResults = await ExamResult.find({ userId: userObjectId })
      .populate({
        path: "examId",
        select: "title subject grade term source createdBy examType",
      })
      .sort({ date: -1 });

    if (!examResults.length) {
      return res.json({
        performance: [],
        examHistory: [],
        recommendations: [],
        notifications: ["⚠️ لم تقم بأي امتحان حتى الآن."],
      });
    }

    let performanceData = [];
    let examHistory = [];
    let recommendations = [];
    let ministryExamHistory = []; // ✅ قائمة خاصة بامتحانات الوزارة

    examResults.forEach((exam) => {
      if (!exam.examId || !exam.examId.subject) {
        console.error("⚠️ تحذير: لا توجد بيانات كافية للامتحان:", exam);
        return;
      }

      const examTitle = exam.examId.title || "غير معروف";
      const subject = exam.examId.subject || "غير محدد";
      const grade = exam.examId.grade || "غير محدد";
      const term = exam.examId.term || "غير محدد";
      const source = exam.examId.source || "غير معروف";
      const createdBy = exam.examId.createdBy || "غير معروف";
      const examType = exam.examId.examType || "غير معروف";

      const examData = {
        examId: exam.examId._id,
        title: examTitle,
        subject,
        grade,
        term,
        source,
        createdBy,
        examType,
        date: exam.date,
        score: exam.score,
        totalQuestions: exam.totalQuestions,
        performancePercentage: exam.performancePercentage || 0,
      };

      if (examType === "ministry") {
        ministryExamHistory.push(examData); // ✅ تخزين امتحانات الوزارة في قسم منفصل
      } else {
        examHistory.push(examData);
      }

      performanceData.push({
        subject,
        performancePercentage: exam.performancePercentage || 0,
      });

      if (exam.performancePercentage < 50) {
        recommendations.push(
          `📌 تحتاج إلى مراجعة مادة ${subject} حيث أن أدائك أقل من 50%.`
        );
      }
    });

    res.json({
      performance: performanceData,
      examHistory,
      ministryExamHistory, // ✅ إضافة امتحانات الوزارة إلى البيانات المسترجعة
      recommendations,
      notifications: [],
    });
  } catch (error) {
    console.error("❌ خطأ في تحليل أداء الطالب:", error);
    res.status(500).json({ message: "❌ فشل في جلب البيانات", error });
  }
};

// ✅ مقارنة أداء الطالب بزملائه
const compareWithClassmates = async (req, res) => {
  try {
    const { userId, subject, grade, term } = req.query;
    if (!userId || !subject || !grade || !term) {
      return res
        .status(400)
        .json({ message: "❌ يجب إدخال جميع الحقول المطلوبة." });
    }

    const studentPerformance = await StudentPerformance.find({
      userId,
      subject,
      grade,
      term,
    });

    if (!studentPerformance.length) {
      return res
        .status(404)
        .json({ message: "⚠️ لا توجد بيانات لهذا الطالب." });
    }

    const classPerformance = await StudentPerformance.aggregate([
      { $match: { subject, grade, term } },
      { $group: { _id: null, avgScore: { $avg: "$performancePercentage" } } },
    ]);

    const avgClassScore = classPerformance.length
      ? classPerformance[0].avgScore
      : 0;

    res.status(200).json({
      message: "✅ تم تحليل أداء الطالب مقارنة بزملائه.",
      studentPerformance,
      avgClassScore,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء تحليل الأداء الجماعي:", error);
    res
      .status(500)
      .json({ message: "❌ حدث خطأ أثناء تحليل الأداء الجماعي", error });
  }
};

// ✅ 1️⃣ تسجيل نتيجة امتحان الطالب
const recordExamResult = async (req, res) => {
  try {
    const { userId, examId, score, totalQuestions, examType } = req.body;

    if (
      !userId ||
      !examId ||
      score === undefined ||
      totalQuestions === undefined ||
      !examType
    ) {
      return res
        .status(400)
        .json({ message: "❌ جميع الحقول مطلوبة، بما في ذلك نوع الامتحان." });
    }

    console.log(
      `📡 تسجيل نتيجة امتحان للطالب ${userId}, الامتحان: ${examId}, النوع: ${examType}`
    );

    let performancePercentage =
      totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
    if (performancePercentage > 100) performancePercentage = 100;

    let existingExam = await ExamResult.findOne({ userId, examId });

    if (existingExam) {
      console.log("🔄 تحديث نتيجة امتحان موجود مسبقًا...");
      existingExam.score = score;
      existingExam.totalQuestions = totalQuestions;
      existingExam.performancePercentage = performancePercentage;
      existingExam.date = new Date();
      existingExam.examType = examType; // ✅ تخزين نوع الامتحان
      await existingExam.save();
    } else {
      console.log("✅ إنشاء نتيجة امتحان جديدة...");
      const newExamResult = new ExamResult({
        userId,
        examId,
        score,
        totalQuestions,
        performancePercentage,
        examType, // ✅ تخزين نوع الامتحان
        date: new Date(),
      });

      await newExamResult.save();
    }

    res.status(201).json({ message: "✅ تم تسجيل نتيجة الامتحان بنجاح" });
  } catch (error) {
    console.error("❌ خطأ أثناء تسجيل النتيجة:", error);
    res.status(500).json({ message: "❌ فشل في تسجيل النتيجة", error });
  }
};

// ✅ 2️⃣ اقتراح إعادة اختبار للأسئلة التي أخطأ فيها الطالب
const suggestRetest = async (req, res) => {
  try {
    const { userId, examId } = req.query;

    if (!userId || !examId) {
      return res
        .status(400)
        .json({ message: "❌ يجب إدخال معرف الطالب ومعرف الامتحان." });
    }

    const lastExam = await StudentPerformance.findOne({ userId, examId }).sort({
      createdAt: -1,
    });

    if (
      !lastExam ||
      !lastExam.incorrectQuestions ||
      lastExam.incorrectQuestions.length === 0
    ) {
      return res
        .status(404)
        .json({ message: "⚠️ لا توجد أسئلة خاطئة لإعادة الاختبار." });
    }

    const retestQuestions = await QuestionBank.find({
      _id: { $in: lastExam.incorrectQuestions },
    });

    res.status(200).json({
      message: "✅ تم اقتراح أسئلة لإعادة الاختبار",
      questions: retestQuestions,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء اقتراح إعادة الاختبار:", error);
    res
      .status(500)
      .json({ message: "❌ حدث خطأ أثناء اقتراح إعادة الاختبار", error });
  }
};

module.exports = {
  getStudentPerformance,
  compareWithClassmates,
  recordExamResult,
  suggestRetest,
};
