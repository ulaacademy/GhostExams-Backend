const express = require("express");
const mongoose = require("mongoose");
const ExamPattern = require("../models/ExamPattern");
const QuestionBank = require("../models/QuestionBank");
const SimulationExam = require("../models/SimulationExam");

const router = express.Router();

/**
 * 🔍 تحليل الامتحانات الوزارية المخزنة واستنتاج الأنماط الشائعة
 */
exports.analyzeMinistryExams = async (req, res) => {
  try {
    const { subject, grade } = req.body;

    if (!subject || !grade) {
      return res.status(400).json({ message: "❌ يرجى تحديد المادة والصف." });
    }

    // 🔹 جلب الأنماط المسجلة في الامتحانات الوزارية
    const patterns = await ExamPattern.find({
      subject,
      grade,
      source: "امتحان وزاري",
    });

    if (!patterns.length) {
      return res
        .status(404)
        .json({ message: "⚠️ لا توجد بيانات تحليلية متاحة لهذه المادة." });
    }

    res.status(200).json({
      message: "✅ تم تحليل الامتحانات الوزارية بنجاح",
      patterns,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء تحليل الامتحانات الوزارية:", error);
    res
      .status(500)
      .json({ message: "❌ حدث خطأ أثناء تحليل الامتحانات الوزارية", error });
  }
};

/**
 * 🤖 توليد امتحان وزاري محاكي بناءً على بيانات الامتحانات السابقة
 */
exports.generateSimulationExam = async (req, res) => {
  try {
    const { subject, grade, term } = req.query;

    if (!subject || !grade || !term) {
      return res
        .status(400)
        .json({
          message:
            "❌ يرجى تحديد الصف، الفصل، والمادة لإنشاء الامتحان الوزاري المحاكي.",
        });
    }

    // 🔹 جلب أنماط الأسئلة من الامتحانات الوزارية السابقة
    const patterns = await ExamPattern.findOne({
      subject,
      grade,
      term,
      source: "امتحان وزاري",
    });

    if (!patterns) {
      return res
        .status(404)
        .json({
          message: "⚠️ لا توجد بيانات كافية لإنشاء امتحان وزاري محاكي.",
        });
    }

    // 🔹 جلب الأسئلة من بنك الأسئلة الخاصة بالامتحانات الوزارية
    const storedQuestions = await QuestionBank.find({
      subject,
      grade,
      term,
      source: "امتحان وزاري",
    }).limit(20);

    if (!storedQuestions.length) {
      return res
        .status(404)
        .json({ message: "⚠️ لا توجد أسئلة وزارية متاحة لإنشاء امتحان." });
    }

    const simulationExam = new SimulationExam({
      subject,
      grade,
      term,
      questions: storedQuestions,
      generatedAt: new Date(),
    });

    await simulationExam.save();

    res.status(200).json({
      message: "✅ تم إنشاء امتحان وزاري محاكي بنجاح",
      exam: simulationExam,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء إنشاء الامتحان الوزاري المحاكي:", error);
    res
      .status(500)
      .json({
        message: "❌ حدث خطأ أثناء إنشاء الامتحان الوزاري المحاكي",
        error,
      });
  }
};

/**
 * 📥 **عرض الامتحانات الوزارية السابقة مع تحليل لكل سؤال**
 */
exports.getMinistryExam = async (req, res) => {
  try {
    const { year, subject, grade } = req.query;

    if (!year || !subject || !grade) {
      return res
        .status(400)
        .json({ message: "❌ يرجى تحديد السنة، المادة، والصف." });
    }

    // 🔹 جلب الامتحان الوزاري المحدد
    const ministryExam = await SimulationExam.findOne({ year, subject, grade });

    if (!ministryExam) {
      return res
        .status(404)
        .json({ message: "⚠️ لم يتم العثور على امتحان وزاري بهذه المواصفات." });
    }

    res.status(200).json({
      message: "✅ تم جلب الامتحان الوزاري بنجاح",
      exam: ministryExam,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء جلب الامتحان الوزاري:", error);
    res
      .status(500)
      .json({ message: "❌ حدث خطأ أثناء جلب الامتحان الوزاري", error });
  }
};

/**
 * 🎯 **توقعات الامتحانات الوزارية القادمة بناءً على التحليل الذكي**
 */
exports.predictFutureMinistryExam = async (req, res) => {
  try {
    const { subject, grade } = req.query;

    if (!subject || !grade) {
      return res.status(400).json({ message: "❌ يرجى تحديد المادة والصف." });
    }

    // 🔹 جلب الأنماط المتكررة من الامتحانات السابقة
    const patterns = await ExamPattern.find({
      subject,
      grade,
      source: "امتحان وزاري",
    });

    if (!patterns.length) {
      return res
        .status(404)
        .json({ message: "⚠️ لا توجد بيانات كافية لتوقع الامتحانات القادمة." });
    }

    const predictedQuestions = patterns.map((pattern) => ({
      questionText: `📌 سؤال متوقع: ${pattern.tags.join(", ")}`,
      difficulty: pattern.difficulty,
      frequency: pattern.frequency,
    }));

    res.status(200).json({
      message: "✅ تم استخراج التوقعات بناءً على الامتحانات السابقة",
      predictions: predictedQuestions,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء توقع الامتحان القادم:", error);
    res
      .status(500)
      .json({ message: "❌ حدث خطأ أثناء توقع الامتحان القادم", error });
  }
};

module.exports = router;
