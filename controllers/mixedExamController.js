const mongoose = require("mongoose");
const Question = require("../models/Question");
const Exam = require("../models/Exam");

exports.generateMixedAIExam = async (req, res) => {
  try {
    const { grade, term, subject, userId } = req.body;

    if (!grade || !term || !subject || !userId) {
      return res.status(400).json({ message: "❌ جميع الحقول مطلوبة." });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "❌ userId غير صالح." });
    }

    console.log(
      `📡 [Mixed AI Exam] توليد امتحان جديد للصف ${grade} - الفصل ${term} - المادة ${subject}`
    );

    // ✅ تنسيق `grade` و `term` ليطابق البيانات المخزنة
    const formattedGrade = grade.startsWith("grade-")
      ? grade
      : `grade-${grade}`;
    const formattedTerm = term.startsWith("term-")
      ? term
      : `term-${term.replace(/\D/g, "")}`;

    console.log(
      `🔍 [Mixed AI Exam] البحث عن الأسئلة في قاعدة البيانات: { grade: "${formattedGrade}", term: "${formattedTerm}", subject: "${subject}" }`
    );

    // ✅ تقسيم عدد الأسئلة لكل مصدر
    const numQuestions = 10;
    const numTeacherQuestions = Math.floor(numQuestions * 0.33);
    const numSchoolQuestions = Math.floor(numQuestions * 0.33);
    const numBookQuestions =
      numQuestions - (numTeacherQuestions + numSchoolQuestions); // 34%

    console.log(
      `📡 [Mixed AI Exam] جلب أسئلة: معلمين: ${numTeacherQuestions}, مدرسة: ${numSchoolQuestions}, كتب: ${numBookQuestions}`
    );

    // ✅ جلب الأسئلة من 3 مصادر
    const teacherQuestions = await fetchQuestions(
      "teacher",
      formattedGrade,
      formattedTerm,
      subject,
      numTeacherQuestions
    );
    const schoolQuestions = await fetchQuestions(
      "school",
      formattedGrade,
      formattedTerm,
      subject,
      numSchoolQuestions
    );
    const bookQuestions = await fetchQuestions(
      "books",
      formattedGrade,
      formattedTerm,
      subject,
      numBookQuestions
    );

    // ✅ دمج الأسئلة المختارة
    const allQuestions = [
      ...teacherQuestions,
      ...schoolQuestions,
      ...bookQuestions,
    ];

    console.log(
      `✅ [Mixed AI Exam] تم جمع ${allQuestions.length} سؤالًا بنجاح!`
    );

    if (allQuestions.length < numQuestions) {
      return res.status(400).json({
        message: `⚠️ لم يتم العثور على عدد كافٍ من الأسئلة! المتوفر فقط ${allQuestions.length}`,
      });
    }

    // ✅ إنشاء الامتحان الجديد في قاعدة البيانات
    const newExam = new Exam({
      title: `امتحان مختلط ${subject} - ${grade} - ${term}`,
      subject,
      grade: Number(grade),
      createdBy: new mongoose.Types.ObjectId(userId),
      examType: "mixed",
      source: "mixed",
      questions: allQuestions.map((q) => new mongoose.Types.ObjectId(q._id)),
    });

    console.log("📡 [Mixed AI Exam] حفظ الامتحان في قاعدة البيانات...");
    await newExam.save();
    console.log(
      `📌 [Mixed AI Exam] تم إنشاء الامتحان بنجاح، ID: ${newExam._id}`
    );

    // ✅ جلب الامتحان بعد الحفظ للتأكد من صحة البيانات
    const savedExam = await Exam.findById(newExam._id);
    if (!savedExam) {
      return res
        .status(500)
        .json({ message: "❌ فشل في حفظ الامتحان في قاعدة البيانات." });
    }

    res.status(201).json({
      message: "✅ تم إنشاء الامتحان المختلط بنجاح",
      exam: {
        _id: newExam._id,
        title: newExam.title,
        subject: newExam.subject,
        grade: newExam.grade,
        questions: newExam.questions,
      },
    });
  } catch (error) {
    console.error("❌ [Mixed AI Exam] خطأ أثناء توليد الامتحان:", error);
    res.status(500).json({
      message: "❌ فشل في توليد الامتحان",
      error: error?.message || "❌ لا يوجد تفاصيل عن الخطأ",
    });
  }
};

/**
 * ✅ دالة جلب الأسئلة من مصدر معين
 */
const fetchQuestions = async (source, grade, term, subject, limit) => {
  try {
    console.log(
      `📡 [Fetch Questions] البحث عن ${limit} سؤال من مصدر: ${source}`
    );

    const questions = await Question.aggregate([
      { $match: { source, grade, term, subject } },
      { $sample: { size: limit } },
    ]);

    console.log(
      `✅ [Fetch Questions] تم العثور على ${questions.length} سؤال من مصدر: ${source}`
    );
    return questions;
  } catch (error) {
    console.error(
      `❌ [Fetch Questions] خطأ أثناء جلب الأسئلة من ${source}:`,
      error
    );
    return [];
  }
};

/**
 * ✅ جلب جميع الامتحانات المختلطة
 * @route GET /api/exams/mixed
 */
exports.getMixedExams = async (req, res) => {
  try {
    console.log("📡 [Mixed Exams] جلب جميع الامتحانات المختلطة...");

    // ✅ البحث عن جميع الامتحانات التي مصدرها "mixed"
    const mixedExams = await Exam.find({ source: "mixed" });

    if (!mixedExams || mixedExams.length === 0) {
      return res
        .status(404)
        .json({ message: "❌ لا توجد امتحانات مختلطة متاحة." });
    }

    console.log(
      `✅ [Mixed Exams] تم العثور على ${mixedExams.length} امتحانات مختلطة.`
    );
    return res.status(200).json({ exams: mixedExams });
  } catch (error) {
    console.error("❌ [Mixed Exams] خطأ أثناء جلب الامتحانات:", error);
    return res
      .status(500)
      .json({ message: "❌ حدث خطأ أثناء جلب الامتحانات." });
  }
};

/**
 * ✅ جلب امتحان مختلط بناءً على ID
 * @route GET /api/exams/get-exam/mixed/:examId
 */
exports.getMixedExamById = async (req, res) => {
  try {
    const { examId } = req.params;

    console.log(`📡 [Mixed Exam] جلب امتحان مختلط ID: ${examId}`);

    // ✅ البحث عن الامتحان المختلط حسب ID
    const mixedExam = await Exam.findById(examId).populate("questions");

    if (!mixedExam) {
      return res
        .status(404)
        .json({ message: "❌ لم يتم العثور على الامتحان المختلط." });
    }

    console.log("✅ [Mixed Exam] تم العثور على الامتحان:", mixedExam);
    return res.status(200).json({ exam: mixedExam });
  } catch (error) {
    console.error("❌ [Mixed Exam] خطأ أثناء جلب الامتحان:", error);
    return res.status(500).json({ message: "❌ حدث خطأ أثناء جلب الامتحان." });
  }
};
