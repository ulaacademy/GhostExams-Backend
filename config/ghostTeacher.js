// backend/config/ghostTeacher.js
module.exports = {
  // ✅ المعلم الافتراضي اللي بينضاف تلقائيًا للطالب (فقط للاستثناء من العداد)
  ghostTeacherId: "6925950db9f708163dd423a7",

  // ✅ الأربع معلمين اللي بدنا نعتبرهم Ghost Teachers (للخطط teacherType = "ghost")
  ghostTeachersIds: [
    "695c379a76bfebc62783b4a5", // Ghost History 2009
    "6945cbc643cff502c6460873", // GHOST ISLAMIC 2009
    "6945bfcd43cff502c645f5ee", // GHOST ARABIC 2009
    "6945bd19f63cff3e4bd2d854", // GHOST ENGLISH 2009
  ],
};
