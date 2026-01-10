const mongoose = require("mongoose");
const ExamLog = require("../models/ExamLog");
const User = require("../models/User"); // لاستيراد بيانات الطالب
const Question = require("../models/Question"); // لاستيراد بنك الأسئلة
const { fetchAIAnswer } = require("../services/aiService");
const { ValidationError, NotFoundError } = require("../utils/AppError");
const { asyncHandler } = require("../middleware/errorHandler");

// ✅ إنشاء سؤال جديد
const createQuestion = asyncHandler(async (req, res) => {
  const {
    questionText,
    options,
    correctAnswer,
    source,
    subject,
    grade,
    term,
    unit,
  } = req.body;

  // ✅ التحقق من الحقول المطلوبة
  if (!questionText || !options || !correctAnswer) {
    throw new ValidationError("جميع الحقول مطلوبة (نص السؤال، الخيارات، الإجابة الصحيحة)");
  }

  // ✅ إذا كان المستخدم معلم، قم بتعيين createdBy
  const teacherId = req.user?.id || req.user?._id || req.body?.teacherId;
  const isTeacher = req.user?.role === 'teacher' || req.body?.source === 'teacher';
  
  const newQuestion = new Question({
    questionText,
    options,
    correctAnswer,
    source: source || (isTeacher ? 'teacher' : source),
    subject,
    grade,
    term,
    unit,
    ...(isTeacher && teacherId ? { createdBy: teacherId } : {})
  });

  await newQuestion.save();

  res.status(201).json({
    success: true,
    message: "تم إنشاء السؤال بنجاح",
    question: newQuestion,
  });
});

// ✅ جلب جميع الأسئلة
const getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find();
    res
      .status(200)
      .json({ message: "✅ تم جلب جميع الأسئلة بنجاح", questions });
  } catch (error) {
    console.error("❌ خطأ في جلب الأسئلة:", error);
    res.status(500).json({ message: "❌ فشل في جلب الأسئلة", error });
  }
};

// ✅ جلب سؤال معين عبر الـ ID
const getQuestionById = async (req, res) => {
  try {
    const questionId = req.params.id;
    const question = await Question.findById(questionId);
    console.log(
      question ? question.correctAnswer : "❌ لم يتم العثور على إجابة صحيحة."
    );
    if (!question) {
      return res.status(404).json({ message: "❌ السؤال غير موجود" });
    }
    res.status(200).json(question);
  } catch (error) {
    res.status(500).json({ message: "❌ خطأ في جلب السؤال", error });
  }
};

// ✅ حذف سؤال معين
const deleteQuestion = async (req, res) => {
  try {
    const questionId = req.params.id;
    await Question.findByIdAndDelete(questionId);
    res.status(200).json({ message: "✅ تم حذف السؤال بنجاح" });
  } catch (error) {
    res.status(500).json({ message: "❌ خطأ في حذف السؤال", error });
  }
};

// ✅ جلب جميع أسئلة المعلمين
const getTeacherQuestions = async (req, res) => {
  try {
    const questions = await Question.find({ source: "teacher" });

    if (!questions.length) {
      return res
        .status(404)
        .json({ message: "❌ لا توجد أسئلة متاحة في بنك أسئلة المعلمين." });
    }

    res.status(200).json({
      message: "✅ تم جلب جميع أسئلة المعلمين بنجاح",
      questions,
    });
  } catch (error) {
    console.error("❌ خطأ في جلب أسئلة المعلمين:", error);
    res.status(500).json({ message: "❌ فشل في جلب الأسئلة", error });
  }
};

// ✅ جلب أسئلة المعلمين حسب الفلترة (الصف، الفصل، المادة)
const getTeacherQuestionsByFilters = async (req, res) => {
  try {
    const { grade, term, subject } = req.query;

    if (!grade || !term || !subject) {
      return res.status(400).json({
        message: "❌ يجب تحديد الصف، الفصل، والمادة.",
      });
    }

    console.log(`📡 جلب أسئلة المعلمين لـ: ${grade}, ${term}, ${subject}`);

    let questions = await Question.find({
      grade: grade,
      term: term,
      subject: subject,
      source: "teacher",
    });

    if (!questions.length) {
      return res.status(404).json({ message: "⚠️ لا توجد أسئلة متاحة." });
    }

    // ✅ تحديث الأسئلة التي لا تحتوي على `correctAnswer`
    questions = questions.map((question) => {
      if (!question.correctAnswer || question.correctAnswer.trim() === "") {
        console.log(`⚠️ السؤال بدون إجابة صحيحة: ${question._id}`);
        return {
          ...question._doc,
          correctAnswer: question.options?.length
            ? question.options[0]
            : "❌ غير متوفر",
        };
      }
      return question;
    });

    console.log(`✅ عدد الأسئلة المسترجعة بعد التحقق: ${questions.length}`);

    res.status(200).json({
      message: "✅ تم جلب الأسئلة بنجاح",
      questions,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء جلب الأسئلة:", error);
    res.status(500).json({
      message: "❌ فشل في جلب الأسئلة",
      error: error.message || error,
    });
  }
};

// ✅ جلب جميع أسئلة المدرسة
const getSchoolQuestions = async (req, res) => {
  try {
    const questions = await Question.find({ source: "school" });

    if (!questions.length) {
      return res
        .status(404)
        .json({ message: "❌ لا توجد أسئلة متاحة في بنك أسئلة المدرسة." });
    }

    res.status(200).json({
      message: "✅ تم جلب جميع أسئلة المدرسة بنجاح",
      questions,
    });
  } catch (error) {
    console.error("❌ خطأ في جلب أسئلة المدرسة:", error);
    res.status(500).json({ message: "❌ فشل في جلب الأسئلة", error });
  }
};

// ✅ جلب أسئلة المدرسة حسب الفلترة (الصف، الفصل، المادة)
const getSchoolQuestionsByFilters = async (req, res) => {
  try {
    const { grade, term, subject } = req.query;

    if (!grade || !term || !subject) {
      return res.status(400).json({
        message: "❌ يجب تحديد الصف، الفصل، والمادة.",
      });
    }

    console.log(`📡 جلب أسئلة المدرسة لـ: ${grade}, ${term}, ${subject}`);

    let questions = await Question.find({
      grade: grade,
      term: term,
      subject: subject,
      source: "school",
    });

    if (!questions.length) {
      return res.status(404).json({ message: "⚠️ لا توجد أسئلة متاحة." });
    }

    // ✅ تحديث الأسئلة التي لا تحتوي على `correctAnswer`
    questions = questions.map((question) => {
      if (!question.correctAnswer || question.correctAnswer.trim() === "") {
        console.log(`⚠️ السؤال بدون إجابة صحيحة: ${question._id}`);
        return {
          ...question._doc,
          correctAnswer: question.options?.length
            ? question.options[0]
            : "❌ غير متوفر",
        };
      }
      return question;
    });

    console.log(`✅ عدد الأسئلة المسترجعة بعد التحقق: ${questions.length}`);

    res.status(200).json({
      message: "✅ تم جلب الأسئلة بنجاح",
      questions,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء جلب الأسئلة:", error);
    res.status(500).json({
      message: "❌ فشل في جلب الأسئلة",
      error: error.message || error,
    });
  }
};

// ✅ جلب جميع أسئلة المدرسة
const getBooksQuestions = async (req, res) => {
  try {
    const questions = await Question.find({ source: "books" });

    if (!questions.length) {
      return res
        .status(404)
        .json({ message: "❌ لا توجد أسئلة متاحة في بنك أسئلة المدرسة." });
    }

    res.status(200).json({
      message: "✅ تم جلب جميع أسئلة المدرسة بنجاح",
      questions,
    });
  } catch (error) {
    console.error("❌ خطأ في جلب أسئلة المدرسة:", error);
    res.status(500).json({ message: "❌ فشل في جلب الأسئلة", error });
  }
};

// ✅ جلب أسئلة المدرسة حسب الفلترة (الصف، الفصل، المادة)
const getBooksQuestionsByFilters = async (req, res) => {
  try {
    const { grade, term, subject } = req.query;

    if (!grade || !term || !subject) {
      return res.status(400).json({
        message: "❌ يجب تحديد الصف، الفصل، والمادة.",
      });
    }

    console.log(`📡 جلب أسئلة المدرسة لـ: ${grade}, ${term}, ${subject}`);

    let questions = await Question.find({
      grade: grade,
      term: term,
      subject: subject,
      source: "books",
    });

    if (!questions.length) {
      return res.status(404).json({ message: "⚠️ لا توجد أسئلة متاحة." });
    }

    // ✅ تحديث الأسئلة التي لا تحتوي على `correctAnswer`
    questions = questions.map((question) => {
      if (!question.correctAnswer || question.correctAnswer.trim() === "") {
        console.log(`⚠️ السؤال بدون إجابة صحيحة: ${question._id}`);
        return {
          ...question._doc,
          correctAnswer: question.options?.length
            ? question.options[0]
            : "❌ غير متوفر",
        };
      }
      return question;
    });

    console.log(`✅ عدد الأسئلة المسترجعة بعد التحقق: ${questions.length}`);

    res.status(200).json({
      message: "✅ تم جلب الأسئلة بنجاح",
      questions,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء جلب الأسئلة:", error);
    res.status(500).json({
      message: "❌ فشل في جلب الأسئلة",
      error: error.message || error,
    });
  }
};

// ✅ دالة حذف جميع الأسئلة من قاعدة البيانات
const deleteAllQuestions = async (req, res) => {
  try {
    const result = await Question.deleteMany({});
    res.status(200).json({
      message: `✅ تم حذف ${result.deletedCount} سؤال بنجاح.`,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء حذف جميع الأسئلة:", error);
    res.status(500).json({
      message: "❌ فشل في حذف جميع الأسئلة",
      error: error.message || error,
    });
  }
};

const getExamQuestions = async (req, res) => {
  try {
    const { grade, term, subject, type, userId } = req.query;

    if (!grade || !term || !subject || !type || !userId) {
      return res.status(400).json({ message: "❌ جميع الحقول مطلوبة." });
    }

    // ✅ التأكد من أن userId هو ObjectId صالح
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "❌ userId غير صالح." });
    }

    console.log(`📡 جلب بيانات المستخدم ID: ${userId}`);

    // ✅ جلب بيانات المستخدم
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "❌ المستخدم غير موجود." });
    }

    const isSubscribed = user.isSubscribed || false;
    const questionLimit = isSubscribed ? 10 : 3;

    console.log(
      `🔍 حالة الاشتراك: ${
        isSubscribed ? "مشترك" : "غير مشترك"
      }، الحد الأقصى للأسئلة: ${questionLimit}`
    );

    // ✅ التأكد من عدد الامتحانات اليومية
    const today = new Date().toISOString().split("T")[0];
    const previousExams = await ExamLog.findOne({
      userId,
      subject,
      date: today,
    });

    if (!isSubscribed && previousExams && previousExams.examCount >= 3) {
      return res.status(403).json({
        message: "❌ لقد وصلت إلى الحد الأقصى للامتحانات المجانية اليوم.",
      });
    }

    console.log(`📡 جلب ${questionLimit} أسئلة عشوائية من قاعدة البيانات`);

    // ✅ جلب الأسئلة عشوائيًا من قاعدة البيانات
    let questions = await Question.aggregate([
      { $match: { grade, term, subject, source: type } },
      { $sample: { size: questionLimit } },
    ]);

    if (!questions.length) {
      return res
        .status(404)
        .json({ message: "❌ لا توجد أسئلة متاحة لهذه المادة." });
    }

    console.log(
      `📡 تم جلب ${questions.length} أسئلة، جاري التحقق من الإجابات...`
    );

    // ✅ التحقق مما إذا كانت الإجابة الصحيحة غير موجودة أو فارغة، وطلبها من الذكاء الاصطناعي
    for (let i = 0; i < questions.length; i++) {
      if (
        !questions[i].correctAnswer ||
        questions[i].correctAnswer.trim() === ""
      ) {
        console.log(
          `🚀 طلب إجابة من الذكاء الاصطناعي للسؤال: ${questions[i].questionText}`
        );
        try {
          const aiResponse = await fetchAIAnswer(questions[i].questionText);
          questions[i].correctAnswer =
            aiResponse?.correctAnswer || "❌ لم يتم العثور على إجابة";

          // ✅ تحديث قاعدة البيانات بإجابة الذكاء الاصطناعي
          await Question.findByIdAndUpdate(questions[i]._id, {
            correctAnswer: questions[i].correctAnswer,
          });
        } catch (aiError) {
          console.error(
            "❌ خطأ أثناء جلب الإجابة من الذكاء الاصطناعي:",
            aiError
          );
        }
      }
    }

    // ✅ تسجيل الامتحان لمنع التكرار اليومي
    if (!previousExams) {
      await ExamLog.create({ userId, subject, date: today, examCount: 1 });
      console.log("✅ تم تسجيل امتحان جديد لهذا المستخدم.");
    } else {
      await ExamLog.updateOne(
        { userId, subject, date: today },
        { $inc: { examCount: 1 } }
      );
      console.log(
        `✅ تحديث عدد الامتحانات لهذا المستخدم إلى ${
          previousExams.examCount + 1
        }.`
      );
    }

    res.status(200).json({ message: "✅ تم جلب الأسئلة بنجاح", questions });
  } catch (error) {
    console.error("❌ خطأ أثناء جلب الأسئلة:", error);
    res.status(500).json({ message: "❌ فشل في جلب الأسئلة", error });
  }
};

const likeQuestion = async (req, res) => {
  try {
    const { questionId } = req.body;

    if (!questionId) {
      return res.status(400).json({ error: "❌ السؤال غير محدد!" });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ error: "❌ السؤال غير موجود!" });
    }

    question.likes = (question.likes || 0) + 1; // ✅ زيادة عدد الإعجابات
    await question.save();

    res.json({ likes: question.likes });
  } catch (error) {
    console.error("❌ خطأ في تسجيل الإعجاب:", error);
    res.status(500).json({ error: "❌ حدث خطأ أثناء تسجيل الإعجاب." });
  }
};

module.exports = {
  getAllQuestions,
  getQuestionById,
  createQuestion,
  deleteQuestion,
  deleteAllQuestions,
  getTeacherQuestions,
  getTeacherQuestionsByFilters,
  getSchoolQuestions,
  getSchoolQuestionsByFilters,
  getBooksQuestions,
  getBooksQuestionsByFilters,
  getExamQuestions, // ✅ تأكد من وجود هذه الدالة إذا كنت تستخدمها في `questionRoutes.js`
  likeQuestion,
};
