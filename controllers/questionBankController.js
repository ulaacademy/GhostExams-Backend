const express = require("express");
const mongoose = require("mongoose");
const QuestionBank = require("../models/QuestionBank"); // نموذج بنك الأسئلة
const ExamPattern = require("../models/ExamPattern"); // تحليل أنماط الأسئلة
const router = express.Router();

/**
 * 📌 إضافة سؤال جديد إلى بنك الأسئلة
 */
router.post("/add", async (req, res) => {
  try {
    const {
      subject,
      grade,
      term,
      questionText,
      questionType,
      options,
      correctAnswer,
      explanation,
      difficulty,
      source,
      language,
      tags,
    } = req.body;

    if (
      !subject ||
      !grade ||
      !term ||
      !questionText ||
      !questionType ||
      !correctAnswer ||
      !source
    ) {
      return res
        .status(400)
        .json({ message: "❌ جميع الحقول المطلوبة يجب ملؤها" });
    }

    const newQuestion = new QuestionBank({
      subject,
      grade,
      term,
      questionText,
      questionType,
      options,
      correctAnswer,
      explanation,
      difficulty,
      source,
      language,
      tags,
    });

    await newQuestion.save();
    res
      .status(201)
      .json({ message: "✅ تمت إضافة السؤال بنجاح", question: newQuestion });
  } catch (error) {
    res
      .status(500)
      .json({ message: "❌ حدث خطأ أثناء حفظ السؤال", error: error.message });
  }
});

/**
 * 📌 تحديث سؤال موجود في بنك الأسئلة
 */
router.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedQuestion = await QuestionBank.findByIdAndUpdate(id, updates, {
      new: true,
    });

    if (!updatedQuestion) {
      return res.status(404).json({ message: "❌ السؤال غير موجود" });
    }

    res
      .status(200)
      .json({ message: "✅ تم تحديث السؤال بنجاح", question: updatedQuestion });
  } catch (error) {
    res
      .status(500)
      .json({ message: "❌ حدث خطأ أثناء تحديث السؤال", error: error.message });
  }
});

/**
 * 📌 حذف سؤال من بنك الأسئلة
 */
router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedQuestion = await QuestionBank.findByIdAndDelete(id);

    if (!deletedQuestion) {
      return res.status(404).json({ message: "❌ السؤال غير موجود" });
    }

    res.status(200).json({ message: "✅ تم حذف السؤال بنجاح" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "❌ حدث خطأ أثناء حذف السؤال", error: error.message });
  }
});

/**
 * 📌 استرجاع جميع الأسئلة من بنك الأسئلة بناءً على الفلترة
 */
router.get("/list", async (req, res) => {
  try {
    const { subject, grade, term, difficulty, source, sortBy, order } =
      req.query;
    let filters = {};

    if (subject) filters.subject = subject;
    if (grade) filters.grade = grade;
    if (term) filters.term = term;
    if (difficulty) filters.difficulty = difficulty;
    if (source) filters.source = source;

    let sortQuery = {};
    if (sortBy) {
      sortQuery[sortBy] = order === "desc" ? -1 : 1;
    }

    const questions = await QuestionBank.find(filters).sort(sortQuery);

    res.status(200).json({ count: questions.length, questions });
  } catch (error) {
    res
      .status(500)
      .json({ message: "❌ حدث خطأ أثناء جلب الأسئلة", error: error.message });
  }
});

/**
 * 📌 تحليل أنماط الأسئلة في بنك الأسئلة
 */
router.get("/analyze-patterns", async (req, res) => {
  try {
    const patterns = await QuestionBank.aggregate([
      {
        $group: {
          _id: {
            subject: "$subject",
            grade: "$grade",
            term: "$term",
            questionType: "$questionType",
            difficulty: "$difficulty",
            source: "$source",
          },
          totalQuestions: { $sum: 1 },
        },
      },
      { $sort: { totalQuestions: -1 } },
    ]);

    res.status(200).json({ message: "✅ تم تحليل أنماط الأسئلة", patterns });
  } catch (error) {
    res.status(500).json({
      message: "❌ حدث خطأ أثناء تحليل الأنماط",
      error: error.message,
    });
  }
});

/**
 * 📌 تحديث تكرار السؤال في بنك الأنماط عند تكراره
 */
router.post("/update-pattern/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const question = await QuestionBank.findById(id);
    if (!question) {
      return res.status(404).json({ message: "❌ السؤال غير موجود" });
    }

    await ExamPattern.findOneAndUpdate(
      { subject: question.subject, grade: question.grade, term: question.term },
      { $inc: { "patterns.$[elem].frequency": 1 } },
      {
        arrayFilters: [{ "elem.questionType": question.questionType }],
        new: true,
      }
    );

    res
      .status(200)
      .json({ message: "✅ تم تحديث تكرار السؤال في الأنماط بنجاح" });
  } catch (error) {
    res.status(500).json({
      message: "❌ حدث خطأ أثناء تحديث الأنماط",
      error: error.message,
    });
  }
});

module.exports = router;
