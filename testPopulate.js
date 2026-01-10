const mongoose = require("mongoose");
const Question = require("./models/Question"); // ✅ تأكد من صحة المسار
require("dotenv").config(); // تحميل متغيرات .env

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Exam = require("./models/Exam"); // استبدل `path_to_exam_model` بالمسار الصحيح لنموذج `Exam`

async function testPopulate() {
  try {
    const exam = await Exam.findById("679a988867b0766beb9d2eaa").populate({
      path: "questions",
      model: "Question",
    });

    console.log("📌 نتيجة populate:", exam);
    mongoose.connection.close(); // إغلاق الاتصال بعد تنفيذ الاختبار
  } catch (error) {
    console.error("❌ خطأ أثناء جلب البيانات:", error);
  }
}

testPopulate();
