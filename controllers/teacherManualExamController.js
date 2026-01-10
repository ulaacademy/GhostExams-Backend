const TeacherManualExam = require("../models/TeacherManualExam");
const Teacher = require("../models/Teacher");

// 🟢 إنشاء امتحان يدوي جديد
const createTeacherManualExam = async (req, res) => {
  try {
    console.log("🎯 req.user في امتحان المانيوال:", req.user);

    // ✅ تحقق من أن التوكن مفعل ويمرر teacherId
    const teacherId = req.user?.id;
    if (!teacherId) {
      return res
        .status(400)
        .json({ message: "❌ لا يمكن تحديد المعلم، تأكد من التوكن." });
    }
    const { title, subject, grade, term, duration, questions } = req.body;

    const newExam = new TeacherManualExam({
      teacherId, // ✅ تعيين المعلم من التوكن فقط
      title,
      subject,
      grade,
      term,
      duration,
      questions,
    });

    await newExam.save();

    // ✅ زيادة عداد الامتحانات للمعلم
    await Teacher.findByIdAndUpdate(teacherId, {
      $inc: { "currentUsage.examsCount": 1 }
    });

    res
      .status(201)
      .json({ message: "✅ تم إنشاء الامتحان بنجاح", exam: newExam });
  } catch (error) {
    console.error("❌ خطأ أثناء إنشاء الامتحان:", error);
    res.status(500).json({ message: "❌ فشل في إنشاء الامتحان", error });
  }
};

// 🟢 جلب جميع الامتحانات الخاصة بمعلم معيّن
const getTeacherManualExams = async (req, res) => {
  try {
    const { teacherId } = req.query;
    const exams = await TeacherManualExam.find({ teacherId });
    res.status(200).json({ exams });
  } catch (error) {
    console.error("❌ خطأ في جلب الامتحانات:", error);
    res.status(500).json({ message: "❌ فشل في جلب الامتحانات", error });
  }
};

module.exports = {
  createTeacherManualExam,
  getTeacherManualExams,
};
