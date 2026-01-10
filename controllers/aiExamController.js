const Question = require("../models/Question"); // ✅ قاعدة بيانات الأسئلة (questions bucket)
console.log("📌 تحميل `Question`:", Question);
const Exam = require("../models/Exam"); // ✅ مسؤول عن تخزين الامتحانات
const { generateAIQuestions } = require("../utils/aiQuestionGenerator"); // ✅ توليد الأسئلة بالذكاء الاصطناعي
const ExamPattern = require("../models/ExamPattern");

/**
 * 🔍 تحليل الامتحانات واستخراج الأنماط المتكررة من امتحانات المعلمين والمدارس
 */
exports.analyzeExams = async (req, res) => {
  try {
    const { subject, grade, term, questions } = req.body;

    if (!subject || !grade || !term || !questions || questions.length === 0) {
      return res
        .status(400)
        .json({ message: "❌ البيانات غير مكتملة لتحليل الامتحان." });
    }

    const patterns = questions.map((q) => ({
      questionType: q.type,
      difficulty: q.difficulty || "متوسط",
      tags: q.tags || [],
      structure: q.structure || "",
      frequency: 1,
      source: q.source || "مدرس",
    }));

    const existingPattern = await ExamPattern.findOne({ subject, grade, term });

    if (existingPattern) {
      existingPattern.patterns.push(...patterns);
      await existingPattern.save();
      return res.status(200).json({
        message: "✅ تم تحديث الأنماط بنجاح",
        updatedPattern: existingPattern,
      });
    }

    const newPattern = new ExamPattern({ subject, grade, term, patterns });
    await newPattern.save();

    res.status(201).json({
      message: "✅ تم تحليل الامتحانات وحفظ الأنماط بنجاح",
      newPattern,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء تحليل الامتحانات:", error);
    res
      .status(500)
      .json({ message: "❌ حدث خطأ أثناء تحليل الامتحانات", error });
  }
};

exports.generateAIExam = async (req, res) => {
  try {
    const { subject, grade, term, numQuestions = 10, saveToDB = false } = req.body;

    if (!subject || !grade || !term) {
      return res.status(400).json({
        message: "❌ يجب تحديد الصف، الفصل، والمادة لإنشاء الامتحان.",
      });
    }

    // 🔍 تحليل الأسئلة من المصادر الثلاثة بالنسب المطلوبة
    const bookQuestions = await Question.find({ subject, grade, term, source: "books" }).limit(Math.ceil(numQuestions * 0.34));
    const teacherQuestions = await Question.find({ subject, grade, term, source: "teacher" }).limit(Math.ceil(numQuestions * 0.33));
    const schoolQuestions = await Question.find({ subject, grade, term, source: "school" }).limit(Math.ceil(numQuestions * 0.33));

    const allQuestions = [...bookQuestions, ...teacherQuestions, ...schoolQuestions];

    if (!allQuestions.length) {
      return res.status(404).json({ message: "⚠️ لا توجد أسئلة كافية لتحليلها وإنشاء امتحان." });
    }

    console.log(`📊 [AI Exam Generator] تحليل ${allQuestions.length} سؤالًا لتوليد ${numQuestions} أسئلة جديدة...`);

    // 🧠 طلب من الذكاء الاصطناعي إنشاء أسئلة جديدة بناءً على هذه الأسئلة
    const aiGeneratedQuestions = await generateAIQuestions(allQuestions, numQuestions);

    if (!Array.isArray(aiGeneratedQuestions) || !aiGeneratedQuestions.length) {
      return res.status(500).json({ message: "❌ فشل في توليد أسئلة الذكاء الاصطناعي." });
    }

    // ✅ حفظ الأسئلة في قاعدة البيانات إذا تم تفعيل saveToDB
    if (saveToDB) {
      await Question.insertMany(aiGeneratedQuestions);
    }

    res.status(200).json({
      message: "✅ تم إنشاء امتحان ذكاء اصطناعي بنجاح",
      questions: aiGeneratedQuestions,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء إنشاء الامتحان:", error);
    res.status(500).json({
      message: "❌ حدث خطأ أثناء إنشاء امتحان الذكاء الاصطناعي",
      error,
    });
  }
};


/**
 * 🛠️ تخزين امتحان تم توليده
 */
exports.storeGeneratedExam = async (req, res) => {
  try {
    const { subject, grade, term, questions, createdBy } = req.body;

    if (!subject || !grade || !term || !questions || questions.length === 0) {
      return res
        .status(400)
        .json({ message: "❌ البيانات غير مكتملة لحفظ الامتحان." });
    }

    const newExam = new Exam({ subject, grade, term, questions, createdBy });
    await newExam.save();

    res
      .status(201)
      .json({ message: "✅ تم حفظ الامتحان بنجاح", exam: newExam });
  } catch (error) {
    console.error("❌ خطأ أثناء حفظ الامتحان:", error);
    res.status(500).json({ message: "❌ حدث خطأ أثناء حفظ الامتحان", error });
  }
};

/**
 * 📥 **جلب الأسئلة التي تم توليدها بواسطة الذكاء الاصطناعي**
 */
exports.getGeneratedQuestions = async (req, res) => {
  try {
    const { subject, grade, term } = req.query;

    if (!subject || !grade || !term) {
      return res
        .status(400)
        .json({ message: "❌ يرجى تحديد الصف، الفصل، والمادة." });
    }

    const questions = await Question.find({
      subject,
      grade,
      term,
      generatedByAI: true,
    });

    if (!questions.length) {
      return res
        .status(404)
        .json({ message: "⚠️ لا توجد أسئلة متاحة لهذه المادة حتى الآن." });
    }

    res.status(200).json({ message: "✅ تم جلب الأسئلة بنجاح", questions });
  } catch (error) {
    console.error("❌ خطأ أثناء جلب الأسئلة:", error);
    res.status(500).json({ message: "❌ فشل في جلب الأسئلة", error });
  }
};

/**
 * 📥 **جلب الامتحانات التي تم توليدها بواسطة الذكاء الاصطناعي**
 */
exports.getGeneratedExams = async (req, res) => {
  try {
    const { grade, term, subject } = req.query;

    if (!grade || !term || !subject) {
      return res
        .status(400)
        .json({ message: "❌ يرجى تحديد الصف، الفصل، والمادة." });
    }

    console.log(`🔹 [AI Exam] جلب الامتحانات لـ ${grade}, ${term}, ${subject}`);

    // البحث في قاعدة البيانات عن الامتحانات المخزنة لهذا الصف والفصل والمادة
    const exams = await AiGeneratedExam.find({ grade, term, subject }).sort({
      createdAt: -1,
    });

    if (!exams.length) {
      return res
        .status(404)
        .json({ message: "⚠️ لا توجد امتحانات متاحة لهذه المادة حتى الآن." });
    }

    res.status(200).json({
      message: "✅ تم جلب الامتحانات بنجاح",
      exams,
    });
  } catch (error) {
    console.error("❌ [AI Exam] خطأ أثناء جلب الامتحانات:", error);
    res.status(500).json({ message: "❌ حدث خطأ أثناء جلب الامتحانات", error });
  }
};
