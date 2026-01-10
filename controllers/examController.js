const examController = {};

const mongoose = require("mongoose");
const { ObjectId } = require("mongoose").Types; // ✅ التأكد من استيراد ObjectId بشكل صحيح
const Question = require("../models/Question"); // ✅ استيراد نموذج الأسئلة
const Exam = require("../models/Exam"); // ✅ تأكد من استيراد نموذج الامتحانات
const ExamResult = require("../models/ExamResult");
const MinistryExamSession = require("../models/MinistryExamSession");
const answersController = require("./answersController");
const StudentAnswer = require("../models/StudentAnswer");
const TeacherExamResult = require("../models/TeacherExamResult");

examController.createExam = async (req, res) => {
  try {
    const { title, subject, grade, createdBy, examType, questions } = req.body;

    if (
      !title ||
      !subject ||
      !grade ||
      !createdBy ||
      !examType ||
      !questions ||
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      return res.status(400).json({
        message: "❌ جميع الحقول مطلوبة، بما في ذلك نوع الامتحان والأسئلة",
      });
    }
    if (!mongoose.Types.ObjectId.isValid(createdBy)) {
      // ✅ تحقق من صحة ObjectId
      return res
        .status(400)
        .json({ message: "❌ `createdBy` يجب أن يكون ObjectId صحيحًا" });
    }

    const newExam = new Exam({
      title,
      subject,
      grade,
      createdBy: new mongoose.Types.ObjectId(createdBy), // ✅ هذا هو الصحيح
      examType,
      questions: [],
    });

    await newExam.save();

    const savedQuestions = await Promise.all(
      questions.map(async (q) => {
        const newQuestion = new Question({
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || "لا يوجد شرح",
          difficultyLevel: q.difficultyLevel || "متوسط",
          tags: q.tags || [],
          exam: newExam._id,
        });
        await newQuestion.save();
        return newQuestion._id;
      })
    );

    newExam.questions = savedQuestions;
    await newExam.save();

    res.status(201).json({
      message: "✅ تم إنشاء الامتحان وإضافة الأسئلة بنجاح",
      exam: newExam,
    });
  } catch (error) {
    res.status(500).json({ message: "❌ خطأ في إنشاء الامتحان", error });
  }
};

examController.getAllExams = async (req, res) => {
  try {
    const exams = await Exam.find().populate("questions");
    res.status(200).json(exams);
  } catch (error) {
    res.status(500).json({ message: "❌ خطأ في جلب الامتحانات", error });
  }
};

examController.getAIExams = async (req, res) => {
  try {
    const exams = await Exam.find({ examType: "AI" }).populate("questions");
    res.status(200).json(exams);
  } catch (error) {
    res
      .status(500)
      .json({ message: "❌ خطأ في جلب امتحانات الذكاء الاصطناعي", error });
  }
};

examController.getTeacherExams = async (req, res) => {
  try {
    const exams = await Exam.find({ examType: "teacher" }).populate(
      "questions"
    );
    res.status(200).json(exams);
  } catch (error) {
    res.status(500).json({ message: "❌ خطأ في جلب امتحانات المعلمين", error });
  }
};

examController.getSchoolExams = async (req, res) => {
  try {
    const exams = await Exam.find({ examType: "school" }).populate("questions");
    res.status(200).json(exams);
  } catch (error) {
    res
      .status(500)
      .json({ message: "❌ خطأ في جلب الامتحانات المدرسية", error });
  }
};

examController.getBooksExams = async (req, res) => {
  try {
    const exams = await Exam.find({ examType: "books" }).populate("questions");
    res.status(200).json(exams);
  } catch (error) {
    res
      .status(500)
      .json({ message: "❌ خطأ في جلب الامتحانات المدرسية", error });
  }
};

examController.getGhostExams = async (req, res) => {
  try {
    const exams = await Exam.find({ examType: "ghost" }).populate("questions");
    res.status(200).json(exams);
  } catch (error) {
    res
      .status(500)
      .json({ message: "❌ خطأ في جلب امتحانات Ghost Examinations", error });
  }
};

examController.submitExam = async (req, res) => {
  try {
    console.log("📡 البيانات المستلمة عند إنهاء الامتحان:", req.body);
    console.log("📡 استلام طلب تسجيل إجابة أو إنهاء الامتحان...");

    const {
      examId,
      userId,
      questionId,
      selectedAnswer,
      score, // ✅ تأكد من استخراج `score`
      isFinalSubmission,
      date,
    } = req.body;

    // ✅ تحقق أن `score` يحتوي على قيمة صحيحة قبل الاستخدام
    if (typeof score !== "number" || isNaN(score)) {
      console.error("❌ خطأ: `score` المستلم ليس رقمًا صحيحًا!", score);
      return res.status(400).json({ error: "❌ `score` غير صالح!" });
    }
    console.log("✅ `score` المستلم بنجاح:", score);

    // ✅ **التحقق من صحة المدخلات الأساسية**
    if (!examId || !userId) {
      return res.status(400).json({ error: "❌ جميع الحقول الأساسية مطلوبة!" });
    }

    if (!isFinalSubmission) {
      console.log("📌 يتم إنهاء الامتحان الآن...");
      // ✅ **تصحيح السؤال وحفظه في StudentAnswer**
      if (!questionId || !selectedAnswer) {
        return res.status(400).json({ error: "❌ السؤال والإجابة مطلوبة!" });
      }

      console.log("📌 معالجة إجابة السؤال...");
      const question = await Question.findById(questionId);
      if (!question || !question.correctAnswer) {
        return res
          .status(404)
          .json({ error: "❌ لم يتم العثور على الإجابة الصحيحة!" });
      }
      console.log("🔍 البيانات المستلمة في السيرفر:", req.body);
      console.log("🔍 score المستلم في السيرفر:", req.body.score);

      // ✅ **دالة تنظيف النصوص**
      const normalizeText = (text) =>
        text
          ?.trim()
          .toLowerCase()
          .replace(/\s+/g, " ") // إزالة المسافات الزائدة
          .replace(/[.,!?،؛ـ]/g, "") // إزالة علامات الترقيم
          .replace(/^الإجابة الصحيحة هي:\s*/, "") // إزالة النص الزائد
          .normalize("NFD") // إزالة التشكيل والأحرف غير المرئية
          .replace(/[\u064B-\u065F]/g, ""); // إزالة الحركات والتشكيل في العربية

      // ✅ **تنظيف الإجابات قبل المقارنة**
      const cleanedSelectedAnswer = normalizeText(selectedAnswer);
      const cleanedCorrectAnswer = normalizeText(question.correctAnswer);

      console.log("🔍 مقارنة الإجابات بعد التنظيف:");
      console.log(
        "✅ selectedAnswer بعد التنظيف:",
        `"${cleanedSelectedAnswer}"`
      );
      console.log("✅ correctAnswer بعد التنظيف:", `"${cleanedCorrectAnswer}"`);

      // ✅ **تحديد هل الإجابة صحيحة بعد التنظيف**
      let isCorrect = cleanedSelectedAnswer === cleanedCorrectAnswer;

      console.log("🔍 هل الإجابة صحيحة؟", isCorrect);

      // ✅ **إضافة درجة السؤال بناءً على صحة الإجابة**
      const calculatedScore = isCorrect ? 1 : 0;

      // ✅ **حفظ الإجابة في StudentAnswer**
      const studentAnswer = new StudentAnswer({
        userId,
        examId,
        questionId,
        selectedAnswer,
        isCorrect,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation || "✔️ إجابة صحيحة!",
        score: calculatedScore, // ✅ تأكد من استخدام `calculatedScore` هنا
      });

      await studentAnswer.save();
      console.log("✅ تم تسجيل إجابة السؤال بنجاح!");

      return res.status(200).json({
        message: "✅ تم تسجيل الإجابة بنجاح",
        correct: isCorrect,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        score: calculatedScore, // ✅ إرسال الـ score في الاستجابة
      });
    }

    // ✅ **عند إنهاء الامتحان، حساب النتيجة النهائية وتخزينها في ExamResults**
    console.log("📌 إنهاء الامتحان وحساب النتيجة النهائية...");

    const studentAnswers = await StudentAnswer.find({ examId, userId });
    if (!studentAnswers || studentAnswers.length === 0) {
      return res
        .status(404)
        .json({ error: "❌ لا توجد إجابات محفوظة لهذا الامتحان!" });
    }

    const totalQuestions = studentAnswers.length;
    const correctAnswersCount = studentAnswers.filter(
      (ans) => ans.isCorrect
    ).length;
    const finalScore = Math.round((correctAnswersCount / totalQuestions) * 10);

    const newResult = new ExamResult({
      examId,
      userId,
      score: finalScore,
      totalQuestions,
      date: date || new Date(),
    });

    await newResult.save();
    console.log("✅ تم تسجيل النتيجة النهائية بنجاح!");

    return res.status(200).json({
      message: "✅ تم تسجيل النتيجة النهائية بنجاح",
      score: finalScore,
      totalQuestions,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء معالجة الطلب:", error);
    return res.status(500).json({ error: "❌ حدث خطأ أثناء معالجة الطلب" });
  }
};

examController.getUserExamResults = async (req, res) => {
  try {
    let { userId } = req.params;
    console.log("📡 جلب آخر 4 نتائج (TeacherExamResult) للطالب:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "❌ userId غير صالح." });
    }

    const studentId = new mongoose.Types.ObjectId(userId);

    const results = await TeacherExamResult.find({ studentId })
      .sort({ submittedAt: -1, date: -1 })
      .limit(4)
      .populate({
        path: "examId",
        select: "examName subject grade term duration createdAt",
      })
      .populate({
        path: "teacherId",
        select: "name email",
      })
      .lean();

    if (!results || results.length === 0) {
      return res.status(404).json({
        message: "⚠️ لا توجد نتائج لك الان ..قدم امتحانك الاول مجانا ",
      });
    }

    return res.status(200).json({ results });
  } catch (error) {
    console.error("❌ getUserExamResults error:", error);
    return res.status(500).json({
      message: "❌ فشل في جلب نتائج الامتحانات",
      error: error.message,
    });
  }
};

examController.getLatestExamResult = async (req, res) => {
  try {
    let { userId } = req.params;
    console.log("📡 جلب آخر نتيجة (TeacherExamResult) للطالب:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "❌ userId غير صالح." });
    }

    const studentId = new mongoose.Types.ObjectId(userId);

    const latestResult = await TeacherExamResult.findOne({ studentId })
      .sort({ submittedAt: -1, date: -1 })
      .populate({
        path: "examId",
        select: "examName subject grade term duration createdAt",
      })
      .populate({
        path: "teacherId",
        select: "name email",
      })
      .lean();

    if (!latestResult) {
      return res.status(404).json({
        message: "⚠️ لا توجد نتائج لك الان ..قدم امتحانك الاول مجانا ",
      });
    }

    return res.status(200).json({ latestResult });
  } catch (error) {
    console.error("❌ getLatestExamResult error:", error);
    return res.status(500).json({
      message: "❌ فشل في جلب نتيجة الامتحان الأخيرة",
      error: error.message,
    });
  }
};

examController.getExamById = async (req, res) => {
  try {
    console.log(
      "📡 استقبال طلب جلب الامتحان لـ examId:",
      req.params.examId || req.params.id
    );

    const examId = req.params.examId || req.params.id || req.query.examId;
    console.log("🔍 البحث عن الامتحان باستخدام examId:", examId);
    const exam = await Exam.findById(examId).populate("questions");
    console.log("📌 الامتحان المسترجع:", exam);

    console.log("🔍 نتيجة البحث عن الامتحان:", exam);

    if (!exam) {
      return res.status(404).json({ message: "❌ الامتحان غير موجود." });
    }
    console.log("✅ تم جلب الامتحان بنجاح:", exam);

    res.status(200).json({ message: "✅ تم جلب الامتحان بنجاح", exam });
  } catch (error) {
    console.error("❌ خطأ أثناء جلب الامتحان:", error);
    res.status(500).json({ message: "❌ فشل في جلب الامتحان", error });
  }
};

examController.getExamQuestions = async (req, res) => {
  try {
    const { examId } = req.params;

    console.log(`📡 جلب بيانات الامتحان ID المستلم: ${examId}`);

    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ message: "❌ examId غير صالح." });
    }

    console.log(`📡 جلب بيانات الامتحان ID: ${examId}`);

    const exam = await Exam.findById(examId).populate({
      path: "questions",
      select: "questionText options correctAnswer", // ✅ جلب السؤال والاختيارات والإجابة الصحيحة فقط
    });

    if (!exam) {
      return res
        .status(404)
        .json({ message: "❌ لم يتم العثور على الامتحان." });
    }

    console.log("✅ تم جلب الامتحان بنجاح:", exam);

    res.status(200).json({ message: "✅ تم جلب الامتحان بنجاح", exam });
  } catch (error) {
    console.error("❌ خطأ أثناء جلب الامتحان:", error);
    res.status(500).json({ message: "❌ فشل في جلب الامتحان", error });
  }
};

examController.generateTeacherExam = async (req, res) => {
  try {
    const { grade, term, subject, userId } = req.body;

    if (!grade || !term || !subject || !userId) {
      return res.status(400).json({ message: "❌ جميع الحقول مطلوبة." });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "❌ userId غير صالح." });
    }

    console.log(
      `📡 توليد امتحان جديد للصف ${grade} - الفصل ${term} - المادة ${subject}`
    );

    // ✅ تعديل البحث عن الأسئلة بحيث يكون `grade` رقم وليس نص
    const formattedGrade = `grade-${grade}`;
    const formattedTerm = term.startsWith("term-")
      ? term
      : `term-${term.replace(/\D/g, "")}`;

    console.log(
      `🔎 البحث في قاعدة البيانات عن الأسئلة: { grade: "${formattedGrade}", term: "${formattedTerm}", subject: "${subject}" }`
    );

    const questions = await Question.aggregate([
      {
        $match: {
          grade: formattedGrade,
          term: formattedTerm,
          subject,
          source: "teacher",
        },
      },
      { $sample: { size: 10 } }, // ✅ توليد 10 أسئلة عشوائية
    ]);

    console.log(`📡 عدد الأسئلة المسترجعة: ${questions.length}`);

    if (questions.length === 0) {
      return res
        .status(404)
        .json({ message: "⚠️ لا توجد أسئلة متاحة لهذه المادة." });
    }
    const newExam = new Exam({
      title: `امتحان ${subject} - ${grade} - ${term}`,
      subject,
      grade: Number(grade), // ✅ تأكدنا أن `grade` يتم تخزينه كرقم
      createdBy: new mongoose.Types.ObjectId(userId), // ✅ حللنا مشكلة `ObjectId`
      examType: "teacher", // ✅ تأكدنا أن examType يطابق القيم المسموحة
      source: "manual", // ✅ تأكدنا أن source يطابق القيم المسموحة
      questions: questions.map((q) => new mongoose.Types.ObjectId(q._id)), // ✅ حللنا المشكلة هنا
    });

    console.log("📡 حفظ الامتحان في قاعدة البيانات...");
    await newExam.save();
    console.log(`📌 تم إنشاء الامتحان بنجاح، ID: ${newExam._id}`);

    // ✅ جلب الامتحان بعد الحفظ للتأكد من أنه موجود
    const savedExam = await Exam.findById(newExam._id);
    if (!savedExam) {
      return res
        .status(500)
        .json({ message: "❌ فشل في حفظ الامتحان في قاعدة البيانات." });
    }

    res.status(201).json({
      message: "✅ تم إنشاء الامتحان بنجاح",
      exam: {
        _id: newExam._id,
        title: newExam.title,
        subject: newExam.subject,
        grade: newExam.grade,
        questions: newExam.questions,
      },
    });
  } catch (error) {
    console.error("❌ خطأ أثناء توليد الامتحان:", error);
    res.status(500).json({
      message: "❌ فشل في توليد الامتحان",
      error: error?.message || "❌ لا يوجد تفاصيل عن الخطأ",
    });
  }
};

examController.generateSchoolExam = async (req, res) => {
  try {
    const { grade, term, subject, userId } = req.body;

    if (!grade || !term || !subject || !userId) {
      return res.status(400).json({ message: "❌ جميع الحقول مطلوبة." });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "❌ userId غير صالح." });
    }

    console.log(
      `📡 توليد امتحان جديد للصف ${grade} - الفصل ${term} - المادة ${subject}`
    );

    // ✅ تعديل البحث عن الأسئلة بحيث يكون `grade` رقم وليس نص
    const formattedGrade = `grade-${grade}`;
    const formattedTerm = term.startsWith("term-")
      ? term
      : `term-${term.replace(/\D/g, "")}`;

    console.log(
      `🔎 البحث في قاعدة البيانات عن الأسئلة: { grade: "${formattedGrade}", term: "${formattedTerm}", subject: "${subject}" }`
    );

    const questions = await Question.aggregate([
      {
        $match: {
          grade: formattedGrade,
          term: formattedTerm,
          subject,
          source: "school",
        },
      },
      { $sample: { size: 10 } }, // ✅ توليد 10 أسئلة عشوائية
    ]);

    console.log(`📡 عدد الأسئلة المسترجعة: ${questions.length}`);

    if (questions.length === 0) {
      return res
        .status(404)
        .json({ message: "⚠️ لا توجد أسئلة متاحة لهذه المادة." });
    }
    const newExam = new Exam({
      title: `امتحان ${subject} - ${grade} - ${term}`,
      subject,
      grade: Number(grade), // ✅ تأكدنا أن `grade` يتم تخزينه كرقم
      createdBy: new mongoose.Types.ObjectId(userId), // ✅ حللنا مشكلة `ObjectId`
      examType: "school", // ✅ تأكدنا أن examType يطابق القيم المسموحة
      source: "manual", // ✅ تأكدنا أن source يطابق القيم المسموحة
      questions: questions.map((q) => new mongoose.Types.ObjectId(q._id)), // ✅ حللنا المشكلة هنا
    });

    console.log("📡 حفظ الامتحان في قاعدة البيانات...");
    await newExam.save();
    console.log(`📌 تم إنشاء الامتحان بنجاح، ID: ${newExam._id}`);

    // ✅ جلب الامتحان بعد الحفظ للتأكد من أنه موجود
    const savedExam = await Exam.findById(newExam._id);
    if (!savedExam) {
      return res
        .status(500)
        .json({ message: "❌ فشل في حفظ الامتحان في قاعدة البيانات." });
    }

    res.status(201).json({
      message: "✅ تم إنشاء الامتحان بنجاح",
      exam: {
        _id: newExam._id,
        title: newExam.title,
        subject: newExam.subject,
        grade: newExam.grade,
        questions: newExam.questions,
      },
    });
  } catch (error) {
    console.error("❌ خطأ أثناء توليد الامتحان:", error);
    res.status(500).json({
      message: "❌ فشل في توليد الامتحان",
      error: error?.message || "❌ لا يوجد تفاصيل عن الخطأ",
    });
  }
};

examController.generateBooksExam = async (req, res) => {
  try {
    const { grade, term, subject, userId } = req.body;

    if (!grade || !term || !subject || !userId) {
      return res.status(400).json({ message: "❌ جميع الحقول مطلوبة." });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "❌ userId غير صالح." });
    }

    console.log(
      `📡 توليد امتحان جديد للصف ${grade} - الفصل ${term} - المادة ${subject}`
    );

    // ✅ تعديل البحث عن الأسئلة بحيث يكون `grade` رقم وليس نص
    const formattedGrade = `grade-${grade}`;
    const formattedTerm = term.startsWith("term-")
      ? term
      : `term-${term.replace(/\D/g, "")}`;

    console.log(
      `🔎 البحث في قاعدة البيانات عن الأسئلة: { grade: "${formattedGrade}", term: "${formattedTerm}", subject: "${subject}" }`
    );

    const questions = await Question.aggregate([
      {
        $match: {
          grade: formattedGrade,
          term: formattedTerm,
          subject,
          source: "books",
        },
      },
      { $sample: { size: 10 } }, // ✅ توليد 10 أسئلة عشوائية
    ]);

    console.log(`📡 عدد الأسئلة المسترجعة: ${questions.length}`);

    if (questions.length === 0) {
      return res
        .status(404)
        .json({ message: "⚠️ لا توجد أسئلة متاحة لهذه المادة." });
    }
    const newExam = new Exam({
      title: `امتحان ${subject} - ${grade} - ${term}`,
      subject,
      grade: Number(grade), // ✅ تأكدنا أن `grade` يتم تخزينه كرقم
      createdBy: new mongoose.Types.ObjectId(userId), // ✅ حللنا مشكلة `ObjectId`
      examType: "books", // ✅ تأكدنا أن examType يطابق القيم المسموحة
      source: "manual", // ✅ تأكدنا أن source يطابق القيم المسموحة
      questions: questions.map((q) => new mongoose.Types.ObjectId(q._id)), // ✅ حللنا المشكلة هنا
    });

    console.log("📡 حفظ الامتحان في قاعدة البيانات...");
    await newExam.save();
    console.log(`📌 تم إنشاء الامتحان بنجاح، ID: ${newExam._id}`);

    // ✅ جلب الامتحان بعد الحفظ للتأكد من أنه موجود
    const savedExam = await Exam.findById(newExam._id);
    if (!savedExam) {
      return res
        .status(500)
        .json({ message: "❌ فشل في حفظ الامتحان في قاعدة البيانات." });
    }

    res.status(201).json({
      message: "✅ تم إنشاء الامتحان بنجاح",
      exam: {
        _id: newExam._id,
        title: newExam.title,
        subject: newExam.subject,
        grade: newExam.grade,
        questions: newExam.questions,
      },
    });
  } catch (error) {
    console.error("❌ خطأ أثناء توليد الامتحان:", error);
    res.status(500).json({
      message: "❌ فشل في توليد الامتحان",
      error: error?.message || "❌ لا يوجد تفاصيل عن الخطأ",
    });
  }
};

examController.addQuestionToExam = async (req, res) => {
  try {
    const {
      questionText,
      options,
      correctAnswer,
      explanation,
      difficultyLevel,
      tags,
    } = req.body;
    const examId = req.params.examId;

    if (!questionText || !options || !correctAnswer) {
      return res.status(400).json({ message: "❌ جميع الحقول مطلوبة" });
    }

    const newQuestion = new Question({
      questionText,
      options,
      correctAnswer,
      explanation: explanation || "لا يوجد شرح",
      difficultyLevel: difficultyLevel || "متوسط",
      tags: tags || [],
      exam: examId,
    });

    await newQuestion.save();
    await Exam.findByIdAndUpdate(examId, {
      $push: { questions: newQuestion._id },
    });

    res
      .status(201)
      .json({ message: "✅ تمت إضافة السؤال بنجاح", question: newQuestion });
  } catch (error) {
    res.status(500).json({ message: "❌ خطأ في إضافة السؤال", error });
  }
};

examController.deleteExam = async (req, res) => {
  try {
    const examId = req.params.id;

    await Question.deleteMany({ exam: examId });
    await Exam.findByIdAndDelete(examId);

    res.status(200).json({ message: "✅ تم حذف الامتحان بنجاح" });
  } catch (error) {
    res.status(500).json({ message: "❌ خطأ في حذف الامتحان", error });
  }
};

// ✅ تأكد من تصدير جميع الوظائف دون حذف أي شيء
module.exports = examController;
