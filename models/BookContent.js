const mongoose = require("mongoose");

const BookContentSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
    trim: true, // ✅ إزالة المسافات الزائدة
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  grade: {
    type: String,
    required: false, // ✅ يمكن أن يكون فارغًا إذا لم يكن مطلوبًا
  },
  term: {
    type: String,
    required: false,
  },
  subject: {
    type: String,
    required: false,
  },
  content: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ✅ تأكيد دعم UTF-8 عند حفظ البيانات أو استرجاعها
BookContentSchema.pre("save", function (next) {
  try {
    this.fileName = decodeURIComponent(this.fileName); // ✅ فك تشفير الأسماء العربية
    this.content = Buffer.from(this.content, "utf-8").toString(); // ✅ تأكيد تخزين النصوص بصيغة UTF-8
  } catch (error) {
    console.error("❌ خطأ في معالجة UTF-8:", error);
  }
  next();
});

// ✅ تحويل البيانات عند الاسترجاع لدعم UTF-8 بشكل صحيح
BookContentSchema.post("find", function (docs) {
  docs.forEach((doc) => {
    doc.fileName = decodeURIComponent(doc.fileName);
    doc.content = Buffer.from(doc.content, "utf-8").toString();
  });
});

module.exports = mongoose.model("BookContent", BookContentSchema);
