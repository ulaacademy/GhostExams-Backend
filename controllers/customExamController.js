// backend/controllers/customExamController.js
const TeacherCustomExam = require("../models/TeacherCustomExam");

// ✅ إنشاء امتحان
exports.createCustomExam = async (req, res) => {
  try {
    const exam = await TeacherCustomExam.create(req.body);
    return res.status(201).json({ exam });
  } catch (error) {
    console.error("❌ createCustomExam error:", error);
    return res.status(500).json({ message: "❌ فشل إنشاء الامتحان", error });
  }
};

// ✅ جلب امتحان بالـ id
exports.getCustomExamById = async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await TeacherCustomExam.findById(examId);
    if (!exam)
      return res.status(404).json({ message: "❌ الامتحان غير موجود." });
    return res.status(200).json({ exam });
  } catch (error) {
    console.error("❌ getCustomExamById error:", error);
    return res.status(500).json({ message: "❌ فشل جلب الامتحان", error });
  }
};

// ✅ تعديل بيانات الامتحان (اسم/مادة/صف/فصل/مدة)
exports.updateCustomExam = async (req, res) => {
  try {
    const { examId } = req.params;

    const allowed = ["examName", "subject", "grade", "term", "duration"];
    const updates = {};
    for (const key of allowed) {
      if (typeof req.body[key] !== "undefined") updates[key] = req.body[key];
    }

    const exam = await TeacherCustomExam.findByIdAndUpdate(examId, updates, {
      new: true,
    });

    if (!exam)
      return res.status(404).json({ message: "❌ الامتحان غير موجود." });
    return res.status(200).json({ exam });
  } catch (error) {
    console.error("❌ updateCustomExam error:", error);
    return res.status(500).json({ message: "❌ فشل تعديل الامتحان", error });
  }
};

// ✅ تفعيل/إخفاء الامتحان
exports.setCustomExamActive = async (req, res) => {
  try {
    const { examId } = req.params;
    const { isActive } = req.body;

    const exam = await TeacherCustomExam.findByIdAndUpdate(
      examId,
      { isActive: !!isActive },
      { new: true }
    );

    if (!exam)
      return res.status(404).json({ message: "❌ الامتحان غير موجود." });
    return res.status(200).json({ exam });
  } catch (error) {
    console.error("❌ setCustomExamActive error:", error);
    return res.status(500).json({ message: "❌ فشل تغيير الحالة", error });
  }
};

// ✅ إضافة سؤال
exports.addQuestionToCustomExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const { questionText, options, correctAnswer } = req.body;

    const exam = await TeacherCustomExam.findById(examId);
    if (!exam)
      return res.status(404).json({ message: "❌ الامتحان غير موجود." });

    exam.questions.push({
      questionText,
      options: Array.isArray(options) ? options : [],
      correctAnswer,
    });

    await exam.save();
    return res.status(200).json({ exam });
  } catch (error) {
    console.error("❌ addQuestionToCustomExam error:", error);
    return res.status(500).json({ message: "❌ فشل إضافة السؤال", error });
  }
};

// ✅ تعديل سؤال
exports.updateQuestionInCustomExam = async (req, res) => {
  try {
    const { examId, questionId } = req.params;

    const exam = await TeacherCustomExam.findById(examId);
    if (!exam)
      return res.status(404).json({ message: "❌ الامتحان غير موجود." });

    const q = exam.questions.id(questionId);
    if (!q) return res.status(404).json({ message: "❌ السؤال غير موجود." });

    if (typeof req.body.questionText !== "undefined")
      q.questionText = req.body.questionText;
    if (typeof req.body.correctAnswer !== "undefined")
      q.correctAnswer = req.body.correctAnswer;
    if (typeof req.body.options !== "undefined")
      q.options = Array.isArray(req.body.options) ? req.body.options : [];

    await exam.save();
    return res.status(200).json({ exam });
  } catch (error) {
    console.error("❌ updateQuestionInCustomExam error:", error);
    return res.status(500).json({ message: "❌ فشل تعديل السؤال", error });
  }
};

// ✅ حذف سؤال
exports.deleteQuestionFromCustomExam = async (req, res) => {
  try {
    const { examId, questionId } = req.params;

    const exam = await TeacherCustomExam.findById(examId);
    if (!exam)
      return res.status(404).json({ message: "❌ الامتحان غير موجود." });

    const q = exam.questions.id(questionId);
    if (!q) return res.status(404).json({ message: "❌ السؤال غير موجود." });

    q.deleteOne();
    await exam.save();
    return res.status(200).json({ exam });
  } catch (error) {
    console.error("❌ deleteQuestionFromCustomExam error:", error);
    return res.status(500).json({ message: "❌ فشل حذف السؤال", error });
  }
};

// ✅ حذف امتحان كامل
exports.deleteCustomExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await TeacherCustomExam.findByIdAndDelete(examId);
    if (!exam)
      return res.status(404).json({ message: "❌ الامتحان غير موجود." });
    return res.status(200).json({ message: "✅ تم حذف الامتحان" });
  } catch (error) {
    console.error("❌ deleteCustomExam error:", error);
    return res.status(500).json({ message: "❌ فشل حذف الامتحان", error });
  }
};
