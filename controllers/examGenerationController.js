const ExamPattern = require("../models/ExamPattern");
const BookContent = require("../models/BookContent");
const QuestionBank = require("../models/QuestionBank");
const Exam = require("../models/Exam");
const { generateAIQuestions } = require("../utils/aiQuestionGenerator");
const mongoose = require("mongoose");

/**
 * 🔍 تحليل الامتحانات واستخراج الأنماط المتكررة
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

/**
 * 🎯 توليد امتحان ذكاء اصطناعي بناءً على تحليل الكتب والمناهج
 */
exports.generateAIExam = async (req, res) => {
  try {
    const { subject, grade, term } = req.body;

    if (!subject || !grade || !term) {
      return res
        .status(400)
        .json({ message: "❌ يجب تحديد الصف، الفصل، والمادة." });
    }

    const patterns = await ExamPattern.findOne({ subject, grade, term });
    if (!patterns) {
      return res
        .status(404)
        .json({ message: "⚠️ لا توجد أنماط لإنشاء امتحان." });
    }

    const books = await BookContent.find({ subject, grade, term });
    const bookText = books.map((book) => book.content).join(" ");

    const storedQuestions = await QuestionBank.find({ subject, grade, term });
    const aiGeneratedQuestions = await generateAIQuestions(
      bookText,
      patterns.patterns
    );

    const finalQuestions = [
      ...new Set([...aiGeneratedQuestions, ...storedQuestions]),
    ];

    res.status(200).json({
      message: "✅ تم إنشاء امتحان الذكاء الاصطناعي",
      questions: finalQuestions,
    });
  } catch (error) {
    console.error("❌ خطأ في توليد الامتحان:", error);
    res.status(500).json({ message: "❌ فشل في توليد الامتحان", error });
  }
};

/**
 * 🛠️ توليد امتحان ممزوج بنسبة (40% كتاب، 30% معلمين، 30% ذكاء اصطناعي)
 */
exports.generateMixedExam = async (req, res) => {
  try {
    const { subject, grade, term } = req.body;

    if (!subject || !grade || !term) {
      return res
        .status(400)
        .json({ message: "❌ يرجى تحديد الصف، الفصل، والمادة." });
    }

    const patterns = await ExamPattern.findOne({ subject, grade, term });
    if (!patterns) {
      return res
        .status(404)
        .json({ message: "⚠️ لا توجد بيانات لإنشاء امتحان." });
    }

    const bookQuestions = await BookContent.find({
      subject,
      grade,
      term,
    }).limit(10);
    const storedQuestions = await QuestionBank.find({
      subject,
      grade,
      term,
    }).limit(10);
    const aiGeneratedQuestions = await generateAIQuestions(
      bookQuestions.map((b) => b.content).join(" "),
      patterns.patterns
    );

    // 🔹 التحقق من صحة البيانات قبل الحفظ
    const validQuestions = [
      ...bookQuestions,
      ...storedQuestions,
      ...aiGeneratedQuestions,
    ].filter((q) => q.questionText && q.subject && q.grade && q.term);

    if (validQuestions.length === 0) {
      return res
        .status(400)
        .json({ message: "❌ لا توجد أسئلة صالحة لتوليد الامتحان." });
    }

    res.status(200).json({
      message: "✅ تم إنشاء امتحان ممزوج بنجاح",
      questions: validQuestions,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء توليد الامتحان:", error);
    res.status(500).json({ message: "❌ فشل في توليد الامتحان", error });
  }
};

/**
 * 💾 تخزين الامتحان المولد تلقائيًا في قاعدة البيانات
 */
exports.storeGeneratedExam = async (req, res) => {
  try {
    const { title, subject, grade, term, questions } = req.body;

    if (
      !title ||
      !subject ||
      !grade ||
      !term ||
      !questions ||
      questions.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "❌ جميع الحقول مطلوبة، بما في ذلك الأسئلة" });
    }

    const questionIds = [];
    for (const question of questions) {
      if (typeof question === "string") {
        // ✅ السؤال معرف مسبقًا، نضيفه مباشرةً
        questionIds.push(question);
      } else {
        // ✅ التحقق من أن السؤال يحتوي على الحقول المطلوبة
        if (!question.subject) question.subject = subject;
        if (!question.grade) question.grade = grade;
        if (!question.term) question.term = term;

        if (!question.subject || !question.grade || !question.term) {
          return res.status(400).json({
            message: "❌ جميع الأسئلة يجب أن تحتوي على subject و grade و term.",
          });
        }

        try {
          // ✅ إنشاء وحفظ السؤال الجديد في بنك الأسئلة
          const newQuestion = new QuestionBank(question);
          await newQuestion.save();
          questionIds.push(newQuestion._id);
        } catch (error) {
          console.error("❌ خطأ أثناء حفظ السؤال في بنك الأسئلة:", error);
          return res
            .status(500)
            .json({ message: "❌ فشل في حفظ السؤال", error });
        }
      }
    }

    // 📌 إنشاء الامتحان الجديد مع الأسئلة المعالجة
    const newExam = new Exam({
      title,
      subject,
      grade,
      term,
      examType: "ai",
      source: "AI", // ✅ تحديد مصدر الامتحان تلقائيًا
      questions: questionIds,
    });

    await newExam.save();
    res
      .status(201)
      .json({ message: "✅ تم حفظ الامتحان بنجاح", exam: newExam });
  } catch (error) {
    console.error("❌ خطأ أثناء حفظ الامتحان:", error);
    res.status(500).json({ message: "❌ فشل في حفظ الامتحان", error });
  }
};

/**
 * 📥 **جلب جميع الامتحانات المخزنة في قاعدة البيانات**
 */
exports.getAllExams = async (req, res) => {
  try {
    const exams = await Exam.find();
    res.status(200).json({ message: "✅ تم جلب جميع الامتحانات بنجاح", exams });
  } catch (error) {
    console.error("❌ خطأ في جلب الامتحانات:", error);
    res.status(500).json({ message: "❌ فشل في جلب الامتحانات", error });
  }
};

/**
 * ❌ حذف امتحان معين من قاعدة البيانات عبر الـ ID
 */
exports.deleteExam = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedExam = await Exam.findByIdAndDelete(id);

    if (!deletedExam) {
      return res.status(404).json({ message: "❌ الامتحان غير موجود." });
    }

    res.status(200).json({ message: "✅ تم حذف الامتحان بنجاح", deletedExam });
  } catch (error) {
    console.error("❌ خطأ أثناء حذف الامتحان:", error);
    res.status(500).json({ message: "❌ فشل في حذف الامتحان", error });
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

    const questions = await QuestionBank.find({
      subject,
      grade,
      term,
      generatedByAI: true,
    });

    if (!questions.length) {
      return res
        .status(404)
        .json({ message: "⚠️ لا توجد أسئلة متاحة لهذه المادة." });
    }

    res.status(200).json({ message: "✅ تم جلب الأسئلة بنجاح", questions });
  } catch (error) {
    console.error("❌ خطأ أثناء جلب الأسئلة:", error);
    res.status(500).json({ message: "❌ فشل في جلب الأسئلة", error });
  }
};

exports.getExamById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📡 جلب بيانات الامتحان ID: ${id}`);

    // ✅ تأكد من تحويل `id` إلى ObjectId فقط إذا كان صحيحًا
    const objectId = mongoose.Types.ObjectId.isValid(id)
      ? new mongoose.Types.ObjectId(id)
      : null;

    if (!objectId) {
      return res.status(400).json({ message: "❌ ID غير صالح" });
    }

    // ✅ جلب الامتحان وربطه بالأسئلة
    const exam = await Exam.findById(objectId).populate({
      path: "questions",
      model: "Question",
      strictPopulate: false, // السماح بجلب الأسئلة حتى لو كان هناك مشاكل
    });

    if (!exam) {
      console.log("⚠️ لم يتم العثور على الامتحان في قاعدة البيانات.");
      return res.status(404).json({ message: "❌ الامتحان غير موجود." });
    }

    console.log(
      "📌 بيانات الامتحان المسترجعة بالكامل:",
      JSON.stringify(exam, null, 2)
    );

    res.status(200).json({ message: "✅ تم جلب الامتحان بنجاح", exam });
  } catch (error) {
    console.error("❌ خطأ أثناء جلب الامتحان:", error);
    res.status(500).json({ message: "❌ فشل في جلب الامتحان", error });
  }
};

exports.getStudentSimulations = async (req, res) => {
  try {
    const { studentId } = req.query;

    if (!studentId) {
      return res.status(400).json({ message: "❌ يجب تحديد معرف الطالب." });
    }

    // تحويل studentId إلى ObjectId لتجنب CastError
    const studentObjectId = mongoose.Types.ObjectId.isValid(studentId)
      ? new mongoose.Types.ObjectId(studentId)
      : null;

    if (!studentObjectId) {
      return res.status(400).json({ message: "❌ معرف الطالب غير صالح." });
    }

    const simulations = await Exam.find({ createdBy: studentObjectId });

    if (!simulations.length) {
      return res
        .status(404)
        .json({ message: "⚠️ لا توجد محاكاة لهذا الطالب." });
    }

    res.status(200).json({ message: "✅ تم جلب المحاكاة بنجاح", simulations });
  } catch (error) {
    console.error("❌ خطأ في جلب الامتحان:", error);
    res.status(500).json({ message: "❌ فشل في جلب الامتحان", error });
  }
};

// ✅ جلب جميع امتحانات المدارس
exports.getAllSchoolExams = async (req, res) => {
  try {
    console.log("📡 جلب جميع امتحانات المدارس...");
    const exams = await Exam.find({ source: "school" }); // ✅ فقط امتحانات المدارس
    res.json(exams);
  } catch (error) {
    console.error("❌ خطأ أثناء جلب امتحانات المدارس:", error);
    res.status(500).json({ message: "❌ حدث خطأ أثناء جلب امتحانات المدارس." });
  }
};

// ✅ جلب جميع امتحانات المعلمين
exports.getAllTeacherExams = async (req, res) => {
  try {
    console.log("📡 جلب جميع امتحانات المعلمين...");
    const exams = await Exam.find({ source: "teacher" }); // ✅ فقط امتحانات المعلمين
    res.json(exams);
  } catch (error) {
    console.error("❌ خطأ أثناء جلب امتحانات المعلمين:", error);
    res
      .status(500)
      .json({ message: "❌ حدث خطأ أثناء جلب امتحانات المعلمين." });
  }
};

// ✅ جلب جميع امتحانات الكتب المدرسية
exports.getAllBooksExams = async (req, res) => {
  try {
    console.log("📡 جلب جميع امتحانات المدارس...");
    const exams = await Exam.find({ source: "books" }); // ✅ فقط امتحانات المدارس
    res.json(exams);
  } catch (error) {
    console.error("❌ خطأ أثناء جلب امتحانات المدارس:", error);
    res.status(500).json({ message: "❌ حدث خطأ أثناء جلب امتحانات المدارس." });
  }
};
