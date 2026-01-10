// backend/controllers/ghostExamController.js

const Exam = require("../models/Exam");
const Question = require("../models/Question");
const { ghostTeacherId } = require("../config/ghostTeacher");
const mongoose = require("mongoose");

/**
 * ✅ إنشاء امتحان Ghost جديد (من قبل Admin)
 */
exports.createGhostExam = async (req, res) => {
  try {
    // ✅ Debug: Log user information
    console.log("🔍 req.user:", req.user);
    console.log("🔍 req.user?.role:", req.user?.role);
    console.log("🔍 req.user?.id:", req.user?.id);
    console.log("🔍 req.user?.userId:", req.user?.userId);
    
    // ✅ التحقق من أن المستخدم admin
    if (!req.user) {
      return res.status(401).json({ 
        message: "❌ يجب تسجيل الدخول أولاً." 
      });
    }
    
    if (req.user.role !== "admin") {
      console.log("❌ Access denied. User role:", req.user.role);
      return res.status(403).json({ 
        message: "❌ هذا الإجراء متاح للمسؤولين فقط.",
        userRole: req.user.role 
      });
    }

    const {
      title,
      subject,
      grade,
      term,
      duration,
      maxScore,
      questions,
    } = req.body;

    if (
      !title ||
      !subject ||
      !grade ||
      !term ||
      !duration ||
      !questions ||
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      return res.status(400).json({ 
        message: "❌ جميع الحقول مطلوبة، بما في ذلك الأسئلة." 
      });
    }

    // ✅ إنشاء الامتحان مع ربطه بالمعلم الافتراضي (Ghost Teacher)
    const newExam = new Exam({
      title,
      subject,
      grade: Number(grade),
      term,
      examType: "ghost",
      source: "manual",
      createdBy: new mongoose.Types.ObjectId(ghostTeacherId),
      duration: Number(duration),
      maxScore: maxScore ? Number(maxScore) : questions.length,
      questions: [],
    });

    await newExam.save();

    // ✅ إنشاء الأسئلة وربطها بالامتحان
    const savedQuestions = await Promise.all(
      questions.map(async (q) => {
        const newQuestion = new Question({
          questionText: q.questionText,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || "لا يوجد شرح",
          difficultyLevel: q.difficultyLevel || "متوسط",
          tags: q.tags || [],
          exam: newExam._id,
          source: "manual", // ✅ مصدر السؤال (يدوي لأن Admin ينشئه)
          subject: subject, // ✅ المادة الدراسية
          grade: `grade-${grade}`, // ✅ الصف الدراسي (بتنسيق grade-X)
          term: term, // ✅ الفصل الدراسي
        });
        await newQuestion.save();
        return newQuestion._id;
      })
    );

    newExam.questions = savedQuestions;
    await newExam.save();

    // ✅ جلب الامتحان بعد الحفظ للتأكد من جميع الحقول محفوظة
    const savedExam = await Exam.findById(newExam._id)
      .populate("questions")
      .lean();

    res.status(201).json({
      message: "✅ تم إنشاء امتحان Ghost Examinations بنجاح",
      exam: savedExam,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء إنشاء امتحان Ghost:", error);
    res.status(500).json({ 
      message: "❌ فشل في إنشاء الامتحان", 
      error: error.message 
    });
  }
};

/**
 * ✅ جلب جميع امتحانات Ghost Examinations
 */
exports.getGhostExams = async (req, res) => {
  try {
    const exams = await Exam.find({ examType: "ghost" })
      .populate("questions")
      .sort({ createdAt: -1 });
    
    res.status(200).json(exams);
  } catch (error) {
    console.error("❌ خطأ أثناء جلب امتحانات Ghost:", error);
    res.status(500).json({ 
      message: "❌ فشل في جلب الامتحانات", 
      error: error.message 
    });
  }
};

/**
 * ✅ جلب امتحان Ghost محدد بالـ ID
 */
exports.getGhostExamById = async (req, res) => {
  try {
    const { examId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ message: "❌ examId غير صالح." });
    }

    const exam = await Exam.findOne({ 
      _id: examId, 
      examType: "ghost" 
    }).populate("questions");

    if (!exam) {
      return res.status(404).json({ 
        message: "❌ الامتحان غير موجود." 
      });
    }

    res.status(200).json({ exam });
  } catch (error) {
    console.error("❌ خطأ أثناء جلب الامتحان:", error);
    res.status(500).json({ 
      message: "❌ فشل في جلب الامتحان", 
      error: error.message 
    });
  }
};

/**
 * ✅ تحديث امتحان Ghost
 */
exports.updateGhostExam = async (req, res) => {
  try {
    // ✅ التحقق من أن المستخدم admin
    if (req.user?.role !== "admin") {
      return res.status(403).json({ 
        message: "❌ هذا الإجراء متاح للمسؤولين فقط." 
      });
    }

    const { examId } = req.params;
    const {
      title,
      subject,
      grade,
      term,
      duration,
      maxScore,
      questions,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ message: "❌ examId غير صالح." });
    }

    const exam = await Exam.findOne({ 
      _id: examId, 
      examType: "ghost" 
    });

    if (!exam) {
      return res.status(404).json({ 
        message: "❌ الامتحان غير موجود." 
      });
    }

    // ✅ تحديث بيانات الامتحان
    if (title) exam.title = title;
    if (subject) exam.subject = subject;
    if (grade) exam.grade = Number(grade);
    if (term) exam.term = term;
    if (duration) exam.duration = Number(duration);
    if (maxScore) exam.maxScore = Number(maxScore);

    // ✅ إذا تم تحديث الأسئلة، احذف القديمة وأنشئ جديدة
    if (questions && Array.isArray(questions) && questions.length > 0) {
      // حذف الأسئلة القديمة
      await Question.deleteMany({ exam: exam._id });

      // إنشاء الأسئلة الجديدة
      const savedQuestions = await Promise.all(
        questions.map(async (q) => {
          const newQuestion = new Question({
            questionText: q.questionText,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || "لا يوجد شرح",
            difficultyLevel: q.difficultyLevel || "متوسط",
            tags: q.tags || [],
            exam: exam._id,
            source: "manual", // ✅ مصدر السؤال (يدوي لأن Admin ينشئه)
            subject: exam.subject || subject, // ✅ المادة الدراسية
            grade: `grade-${exam.grade || grade}`, // ✅ الصف الدراسي
            term: exam.term || term, // ✅ الفصل الدراسي
          });
          await newQuestion.save();
          return newQuestion._id;
        })
      );

      exam.questions = savedQuestions;
    }

    await exam.save();

    // ✅ جلب الامتحان بعد التحديث للتأكد من جميع الحقول محدثة
    const updatedExam = await Exam.findById(exam._id)
      .populate("questions")
      .lean();

    res.status(200).json({
      message: "✅ تم تحديث الامتحان بنجاح",
      exam: updatedExam,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء تحديث الامتحان:", error);
    res.status(500).json({ 
      message: "❌ فشل في تحديث الامتحان", 
      error: error.message 
    });
  }
};

/**
 * ✅ حذف امتحان Ghost
 */
exports.deleteGhostExam = async (req, res) => {
  try {
    // ✅ التحقق من أن المستخدم admin
    if (req.user?.role !== "admin") {
      return res.status(403).json({ 
        message: "❌ هذا الإجراء متاح للمسؤولين فقط." 
      });
    }

    const { examId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ message: "❌ examId غير صالح." });
    }

    const exam = await Exam.findOne({ 
      _id: examId, 
      examType: "ghost" 
    });

    if (!exam) {
      return res.status(404).json({ 
        message: "❌ الامتحان غير موجود." 
      });
    }

    // ✅ حذف الأسئلة المرتبطة
    await Question.deleteMany({ exam: examId });
    
    // ✅ حذف الامتحان
    await Exam.findByIdAndDelete(examId);

    res.status(200).json({ 
      message: "✅ تم حذف الامتحان بنجاح" 
    });
  } catch (error) {
    console.error("❌ خطأ أثناء حذف الامتحان:", error);
    res.status(500).json({ 
      message: "❌ فشل في حذف الامتحان", 
      error: error.message 
    });
  }
};

