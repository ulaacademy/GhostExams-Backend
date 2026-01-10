const express = require("express");
const mongoose = require("mongoose");
const BookContent = require("../models/BookContent"); // نموذج تخزين الكتب
const QuestionBank = require("../models/QuestionBank"); // بنك الأسئلة
const { extractQuestionsFromText } = require("../utils/bookQuestionExtractor"); // أداة تحليل الكتب

const router = express.Router();

/**
 * 📥 تحميل كتاب جديد إلى النظام
 */
exports.uploadBook = async (req, res) => {
  try {
    const { subject, grade, term, content } = req.body;

    if (!subject || !grade || !term || !content) {
      return res.status(400).json({ message: "❌ جميع الحقول مطلوبة." });
    }

    const newBook = new BookContent({ subject, grade, term, content });
    await newBook.save();

    res
      .status(201)
      .json({ message: "✅ تم تحميل الكتاب بنجاح", book: newBook });
  } catch (error) {
    console.error("❌ خطأ أثناء تحميل الكتاب:", error);
    res.status(500).json({ message: "❌ حدث خطأ أثناء تحميل الكتاب", error });
  }
};

/**
 * 🔍 استخراج الأسئلة من الكتب الدراسية وتحليلها
 */
exports.extractBookQuestions = async (req, res) => {
  try {
    const { subject, grade, term } = req.query;

    if (!subject || !grade || !term) {
      return res
        .status(400)
        .json({
          message: "❌ يجب تحديد الصف، الفصل، والمادة لاستخراج الأسئلة.",
        });
    }

    const book = await BookContent.findOne({ subject, grade, term });

    if (!book) {
      return res
        .status(404)
        .json({ message: "⚠️ لا يوجد كتاب مسجل لهذه المادة." });
    }

    // 🔹 تحليل محتوى الكتاب واستخراج الأسئلة
    const extractedQuestions = await extractQuestionsFromText(book.content);

    // 🔹 تخزين الأسئلة في بنك الأسئلة
    const storedQuestions = extractedQuestions.map((q) => ({
      subject,
      grade,
      term,
      questionText: q.question,
      questionType: q.type,
      options: q.options || [],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || "",
      difficulty: q.difficulty || "متوسط",
      source: "كتاب",
      generatedByAI: false,
      tags: q.tags || [],
    }));

    await QuestionBank.insertMany(storedQuestions);

    res.status(200).json({
      message: "✅ تم استخراج الأسئلة من الكتاب بنجاح",
      questions: storedQuestions,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء استخراج الأسئلة:", error);
    res
      .status(500)
      .json({ message: "❌ حدث خطأ أثناء استخراج الأسئلة", error });
  }
};

/**
 * 🛠️ توليد امتحان من الكتاب المدرسي فقط
 */
exports.generateBookExam = async (req, res) => {
  try {
    const { subject, grade, term, unit, lesson } = req.body;

    if (!subject || !grade || !term) {
      return res
        .status(400)
        .json({
          message: "❌ يجب تحديد المادة، الصف، والفصل لإنشاء الامتحان.",
        });
    }

    // 🔹 البحث عن الأسئلة المستخرجة من الكتاب
    const filters = { subject, grade, term, source: "كتاب" };
    if (unit) filters.unit = unit;
    if (lesson) filters.lesson = lesson;

    const bookQuestions = await QuestionBank.find(filters).limit(20);

    if (!bookQuestions.length) {
      return res
        .status(404)
        .json({ message: "⚠️ لا توجد أسئلة متاحة لإنشاء امتحان من الكتاب." });
    }

    res.status(200).json({
      message: "✅ تم إنشاء امتحان من الكتاب بنجاح",
      questions: bookQuestions,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء إنشاء الامتحان:", error);
    res.status(500).json({ message: "❌ حدث خطأ أثناء إنشاء الامتحان", error });
  }
};

module.exports = router;
