const TeacherCustomExam = require("../models/TeacherCustomExam");

// ✅ Regex للفصل الأول/الثاني بكل الصيغ
function buildTermRegex(term) {
  const t = String(term || "").trim();

  // term = 1 / term-1
  if (t === "1" || t === "term-1") {
    return /(الفصل\s*)?(الأول|اول|أول|1|١)\b/i;
  }

  // term = 2 / term-2
  if (t === "2" || t === "term-2") {
    return /(الفصل\s*)?(الثاني|ثاني|2|٢)\b/i;
  }

  // إذا المستخدم بعت نص مباشر
  return new RegExp(t, "i");
}

// ✅ Regex للمادة (عربي/English/دين/تاريخ) مرن
function buildSubjectRegex(subject) {
  const s = String(subject || "").trim().toLowerCase();

  if (s === "arabic" || s.includes("arab")) {
    return /(arabic|عربي|اللغة\s*العربية)/i;
  }
  if (s === "english" || s.includes("eng")) {
    return /(english|إنجليزي|انجليزي|اللغة\s*الإنجليزية|اللغة\s*الانجليزية)/i;
  }
  if (s === "islamic" || s.includes("islam")) {
    return /(islamic|دين|اسلام|إسلام|التربية\s*الإسلامية|التربية\s*الاسلامية)/i;
  }
  if (s === "jordan-history" || s.includes("history")) {
    return /(jordan-history|تاريخ\s*الأردن|تاريخ\s*الاردن)/i;
  }

  // fallback
  return new RegExp(s, "i");
}

// ✅ grade عندك String: ممكن يكون "2009" أو "حادي عشر" أو "11"
function buildGradeRegex(grade) {
  const g = String(grade || "").trim();

  if (g === "2009") {
    return /(2009|11|حادي\s*عشر)\b/i;
  }

  return new RegExp(g, "i");
}

// ✅ GET /api/public/exams?subject=arabic&term=1&grade=2009
exports.getPublicExams = async (req, res) => {
  try {
    const { subject, term, grade } = req.query;

    const query = { isActive: true };

    if (subject) query.subject = { $regex: buildSubjectRegex(subject) };
    if (term) query.term = { $regex: buildTermRegex(term) };

    // ✅ مهم: خليه اختياري
    if (grade) query.grade = { $regex: buildGradeRegex(grade) };

    const exams = await TeacherCustomExam.find(query)
      .select("examName subject grade term duration isActive teacherId createdAt updatedAt questions")
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
      teacherId: e.teacherId,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error("❌ getPublicExams error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
