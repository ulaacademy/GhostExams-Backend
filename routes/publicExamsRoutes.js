// routes/publicExamsRoutes.js
const express = require("express");
const router = express.Router();
const TeacherCustomExam = require("../models/TeacherCustomExam");

// ✅ GET /api/public/exams?subject=arabic&term=1&grade=2009
router.get("/public/exams", async (req, res) => {
  try {
    const { subject, term, grade } = req.query;

    const query = { isActive: true };

    // ✅ SUBJECT (Regex مرن جدًا)
    if (subject) {
      const s = String(subject).trim();

      // إن كان slug
      const map = {
        arabic: /(عربي|اللغة\s*العربية|لغة\s*عربية|arabic)/i,
        english: /(انجليزي|إنجليزي|اللغة\s*الإنجليزية|لغة\s*انجليزية|english)/i,
        islamic:
          /(دين|اسلامية|إسلامية|تربية\s*اسلامية|التربية\s*اسلامية|تربية\s*إسلامية|التربية\s*الإسلامية|islamic)/i,
        "jordan-history":
          /(تاريخ|تاريخ\s*الاردن|تاريخ\s*الأردن|jordan|history)/i,
      };

      const key = s.toLowerCase();
      query.subject = map[key]
        ? { $regex: map[key] }
        : { $regex: new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") };
    }

    // ✅ TERM (Regex مرن جدًا)
    if (term) {
      const t = String(term).trim();
      if (t === "1")
        query.term = {
          $regex:
            /(1|اول|أول|الفصل\s*الأول|الفصل\s*الاول|فصل\s*اول|فصل\s*أول)/i,
        };
      else if (t === "2")
        query.term = { $regex: /(2|ثاني|الثاني|الفصل\s*الثاني|فصل\s*ثاني)/i };
      else
        query.term = {
          $regex: new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
        };
    }

    // ✅ GRADE (Regex مرن جدًا)
    if (grade) {
      const g = String(grade).trim();
      if (g === "2009")
        query.grade = {
          $regex: /(2009|توجيهي\s*2009|11|حادي\s*عشر|الحادي\s*عشر)/i,
        };
      else
        query.grade = {
          $regex: new RegExp(g.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
        };
    }

    const exams = await TeacherCustomExam.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const data = exams.map((e) => ({
      _id: e._id,
      examName: e.examName,
      subject: e.subject,
      grade: e.grade,
      term: e.term,
      duration: e.duration,
      questionsCount: Array.isArray(e.questions) ? e.questions.length : 0,
      createdAt: e.createdAt,
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error("❌ public exams error:", err);
    return res
      .status(500)
      .json({ success: false, message: "حدث خطأ أثناء جلب الامتحانات العامة" });
  }
});

// ✅ GET /api/public/exams/:examId  => معلومات فقط (بدون أسئلة)
router.get("/public/exams/:examId", async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await TeacherCustomExam.findOne({
      _id: examId,
      isActive: true,
    })
      .select("examName subject grade term duration teacherId createdAt questions") // نحتاج عدد الأسئلة فقط
      .populate("teacherId", "name subjects profileImage")
      .lean();

    if (!exam) {
      return res.status(404).json({ success: false, message: "Exam not found" });
    }

    // ✅ رجّع معلومات خفيفة فقط (بدون محتوى الأسئلة)
    return res.json({
      success: true,
      data: {
        _id: exam._id,
        examName: exam.examName,
        subject: exam.subject,
        grade: exam.grade,
        term: exam.term,
        duration: exam.duration,
        questionsCount: Array.isArray(exam.questions) ? exam.questions.length : 0,
        teacher: exam.teacherId
          ? {
              _id: exam.teacherId._id,
              name: exam.teacherId.name,
              subjects: exam.teacherId.subjects,
              profileImage: exam.teacherId.profileImage,
            }
          : null,
        createdAt: exam.createdAt,
      },
    });
  } catch (err) {
    console.error("❌ public exam details error:", err);
    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب بيانات الامتحان",
    });
  }
});


module.exports = router;
