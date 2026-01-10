const TeacherCustomExam = require("../models/TeacherCustomExam");
const TeacherExamResult = require("../models/TeacherExamResult");

exports.submitTeacherExamResult = async (req, res) => {
  try {
    const { studentId, examId, score, teacherId, totalQuestions } = req.body;

    if (!studentId || !examId || score === undefined) {
      return res.status(400).json({ message: "❌ studentId, examId, و score مطلوبة." });
    }

    // ✅ نحاول نجيب teacherId من الامتحان إذا لم يتم إرساله
    const exam = await TeacherCustomExam.findById(examId);
    if (!exam) {
      return res
        .status(404)
        .json({ message: "❌ لم يتم العثور على الامتحان." });
    }

    // ✅ استخدام teacherId من الامتحان إذا لم يتم إرساله
    const finalTeacherId = teacherId || exam.teacherId;
    const finalTotalQuestions = totalQuestions || exam.questions?.length || 0;

    const newResult = new TeacherExamResult({
      studentId,
      examId,
      score,
      teacherId: finalTeacherId,
      totalQuestions: finalTotalQuestions,
    });

          await newResult.save();

          res
            .status(201)
            .json({ 
              message: "✅ تم تسجيل نتيجة الامتحان بنجاح", 
              result: newResult 
            });
  } catch (error) {
    console.error("❌ خطأ أثناء تسجيل نتيجة امتحان المعلم:", error);
    res.status(500).json({ message: "❌ فشل في تسجيل النتيجة", error: error.message });
  }
};

// ✅ جلب تقارير طالب معين حسب المعلم
exports.getStudentReportForTeacher = async (req, res) => {
  try {
    const { teacherId, studentId } = req.params;

    if (!teacherId || !studentId) {
      return res.status(400).json({ message: "❌ يجب إرسال teacherId و studentId" });
    }

    const results = await TeacherExamResult.find({ teacherId, studentId })
      .populate("examId", "examName subject grade term") // يجلب تفاصيل الامتحان
      .populate("studentId", "name grade email"); // ✅ هذا السطر مهم

    res.status(200).json({ results });
  } catch (error) {
    console.error("❌ فشل في جلب تقرير الطالب:", error);
    res.status(500).json({ message: "❌ خطأ داخلي" });
  }
};
