// backend/config/ghostTeacher.js
module.exports = {
  // ✅ المعلم الافتراضي اللي بينضاف تلقائيًا للطالب (فقط للاستثناء من العداد)
  ghostTeacherId: "69d10a027f5781b88148972b",

  // ✅ الأربع معلمين اللي بدنا نعتبرهم Ghost Teachers (للخطط teacherType = "ghost")
  ghostTeachersIds: [
    "69d108397f5781b881489620", // Ghost History 2009
    "69d107ee7f5781b8814895e4", // GHOST ISLAMIC 2009
    "69d106137f5781b881489450", // GHOST ARABIC 2009
    "69d1072e7f5781b88148954a", // GHOST ENGLISH 2009
  ],
};
