const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const fs = require("fs");
const AWS = require("aws-sdk");
const textToSpeech = require("@google-cloud/text-to-speech");
const examGenerationRoutes = require("./routes/examGenerationRoutes");
const questionRoutes = require("./routes/questionRoutes");
const authRoutes = require("./routes/authRoutes");
const answersRoutes = require("./routes/answers");
const aiController = require("./controllers/aiController");
const studentPerformanceRoutes = require("./routes/studentPerformanceRoutes");
const { scheduleAIExamGeneration } = require("./utils/aiExamScheduler");
const ministryExamRoutes = require("./routes/ministryExamRoutes");
const s3Routes = require("./routes/s3Routes");

// ⬇️ فوق، استيراد الراوتر
const teacherDashboardRoutes = require("./routes/teacherDashboardRoutes");
const teacherStudentsRoutes = require("./routes/teacherStudentsRoutes");
const teacherExamResultRoutes = require("./routes/teacherExamResultRoutes");
const customExamRoutes = require("./routes/customExamRoutes");

// ✅ استيراد المسارات والـ Middleware
const aiExamRoutes = require("./routes/aiExamRoutes");
const authMiddleware = require("./middleware/authMiddleware");
const bookRoutes = require("./routes/bookRoutes");
const Student = require("./models/Student");
const examRoutes = require("./routes/examRoutes");

const subscriptionRoutes = require("./routes/subscriptionRoutes");
const webhookRoutes = require("./routes/webhook");
const planRoutes = require("./routes/planRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const shareRoutes = require("./routes/shareRoutes");
const studentPlanRoutes = require("./routes/studentPlanRoutes");

const examAttemptRoutes = require("./routes/examAttemptRoutes");
const studentSubscriptionRoutes = require("./routes/studentSubscriptionRoutes");

const publicExamsRoutes = require("./routes/publicExamsRoutes");


// ✅ التحقق من تحميل المسارات
console.log("📡 تحميل مسارات API...");
console.log("📡 تحميل examRoutes.js...");

const app = express();

// ✅ Serve uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// ✅ **إعداد CORS في المكان الصحيح: مباشرة بعد `app`**
// السماح لأي Origin مع دعم الكريدنشيلز بأمان عبر عكس الـ Origin القادم
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
// دعم طلبات الـ Preflight لجميع المسارات
app.options("*", cors());

// ✅ عرض المتغيرات المهمة عند بدء التشغيل
console.log("🔐 JWT_SECRET:", process.env.JWT_SECRET);
console.log("📂 MONGO_URI:", process.env.MONGO_URI);
console.log("📂 AWS S3 BUCKET:", process.env.S3_BUCKET_NAME);

// ✅ إعداد الميدل وير
app.use("/api/webhook", webhookRoutes);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Subscription routes moved to line 193 to use /api/subscriptions (plural)
app.use("/api/plans", planRoutes);
app.use("/api/analytics", analyticsRoutes);

const morgan = require("morgan");
app.use(morgan("dev"));

// ✅ تأكد من وجود مجلد للرفع
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

// ✅ الاتصال بقاعدة بيانات MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected Successfully!"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ✅ إعداد AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
const bucketName = process.env.S3_BUCKET_NAME;

// ✅ فحص حالة الخادم
app.get("/api/status", (req, res) => {
  res.json({ status: "✅ Server is running", time: new Date().toISOString() });
});

// ✅ جلب قائمة الملفات من AWS S3
app.get("/api/files/list", async (req, res) => {
  try {
    const params = { Bucket: bucketName };
    const data = await s3.listObjectsV2(params).promise();

    if (!data.Contents.length) {
      return res.status(404).json({ message: "❌ لا توجد ملفات في S3" });
    }

    const files = data.Contents.map((file) => decodeURIComponent(file.Key));
    res.json({ files });
  } catch (err) {
    console.error("❌ خطأ أثناء جلب الملفات من S3:", err);
    res
      .status(500)
      .json({ message: "❌ حدث خطأ أثناء جلب الملفات", error: err.message });
  }
});

// ✅ خدمة تحويل النص إلى كلام باستخدام Google TTS
const ttsClient = new textToSpeech.TextToSpeechClient({
  keyFilename: path.join(__dirname, "config", "ula-tts-key.json"),
});

app.post("/api/tts", async (req, res) => {
  try {
    const {
      text,
      languageCode = "ar-XA",
      voiceName = "ar-XA-Wavenet-B",
      speakingRate = 1.0,
    } = req.body;

    if (!text) {
      return res
        .status(400)
        .json({ message: "❌ يرجى إدخال نص للتحويل إلى صوت" });
    }

    const request = {
      input: { text },
      voice: { languageCode, name: voiceName },
      audioConfig: { audioEncoding: "MP3", speakingRate },
    };

    const [response] = await ttsClient.synthesizeSpeech(request);

    res.setHeader("Content-Type", "audio/mpeg");
    res.send(response.audioContent);
  } catch (err) {
    console.error("❌ خطأ أثناء تحويل النص إلى صوت:", err);
    res.status(500).json({
      message: "❌ حدث خطأ أثناء تحويل النص إلى صوت",
      error: err.message,
    });
  }
});

// ✅ **تسجيل جميع المسارات المطلوبة**
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/student", require("./routes/studentRoutes"));
app.use("/api/teacher-exams", require("./routes/teacherRoutes"));
app.use("/api/school-exams", require("./routes/schoolRoutes"));
app.use("/api/books-exams", require("./routes/booksRoutes"));
app.use("/api/teacher", teacherDashboardRoutes);
app.use("/api/teacher", require("./routes/teacherReportsRoutes")); // ✅ تقارير المعلم
app.use("/api/teacher-dashboard", require("./routes/teacherDashboardRoutes"));

app.use("/api/s3", s3Routes);

console.log("✅ API `exams` جاهزة لاستقبال الطلبات...");
app.use("/api/exams", (req, res, next) => {
  console.log(
    `📡 طلب جديد وصل إلى /api/exams -> المسار: ${req.path}, الطريقة: ${req.method}`
  );
  next();
});

app.use("/api/exams", examRoutes);
//app.use("/api/exam", examRoutes);

//app.use("/api/exam", require("./routes/examRoutes"));
console.log("📡 المسارات المحملة:");
console.log(app._router.stack.filter((r) => r.route).map((r) => r.route.path));
app.use("/api/coupons", require("./routes/couponRoutes"));
app.use("/api/questions", require("./routes/questionRoutes"));
app.use("/api/subscriptions", require("./routes/subscriptionRoutes"));
app.use("/api/share", shareRoutes);
app.use("/api/uploads", require("./routes/uploadRoutes"));
app.use("/api/files", require("./routes/fileProcessingRoutes"));
app.use("/api/exam-generation", require("./routes/examGenerationRoutes"));
app.use("/api/random-exams", require("./routes/randomExamRoutes"));
app.use("/api/student-performance", studentPerformanceRoutes);
app.use("/api/answers", answersRoutes);
//app.use("/api", require("./routes/ministryExamRoutes"));
app.use("/api/exams/ministry", require("./routes/ministryExamRoutes"));
app.use("/api/ministry-exams", require("./routes/ministryExamRoutes"));
// ⬇️ تحت مع باقي الراوترات
app.use("/api/teacher-students", require("./routes/teacherStudentsRoutes"));
app.use("/api/teacher-exam-results", teacherExamResultRoutes);
app.use("/api/teacher-results", require("./routes/teacherExamResultRoutes"));
app.use("/api/exam-attempts", examAttemptRoutes);
app.use("/api/student-plans", studentPlanRoutes);
app.use("/api/student-subscriptions", studentSubscriptionRoutes);
app.use("/api", publicExamsRoutes);

app.use("/api/exams/custom-exams", customExamRoutes);

// ✅ إضافة API الشرح الجديد
app.post("/api/exam/generate-explanation", aiController.generateExplanation);
app.use("/api/ocr", require("./routes/ocrRoutes"));
app.use(
  "/api/questions-extraction",
  require("./routes/questionExtractionRoutes")
);
app.use("/api/ai-exams", aiExamRoutes);
app.use("/api/ai", aiExamRoutes);
// app.use("/api", questionRoutes);

// ✅ **تسجيل مسارات الكتب**
app.use("/api/books", bookRoutes);

// ✅ **التحقق من الوصول إلى المسارات المحمية**
app.use("/api/protected", authMiddleware, (req, res) => {
  res.json({
    message: "✅ لديك صلاحية الوصول إلى هذه الصفحة المحمية!",
    user: req.user,
  });
});

// ✅ Admin routes
app.use("/api/admin", require("./routes/adminRoutes"));

// ✅ **Debug endpoint to test authentication**
app.get("/api/debug/auth", authMiddleware, (req, res) => {
  res.json({
    message: "✅ Authentication successful",
    user: {
      id: req.user.id,
      role: req.user.role,
      name: req.user.name || req.user.fullName,
    },
    timestamp: new Date().toISOString(),
  });
});

// ✅ **Global Error Handler - MUST be after all routes**
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

// ✅ Handle 404 errors (route not found)
app.use(notFoundHandler);

// ✅ Global error handler (catches all errors)
app.use(errorHandler);

// ✅ **تشغيل الخادم على البورت الصحيح**
const PORT = process.env.PORT || 3000;
console.log("🚀 Reached end of server.js file, ready to start server...");
app.listen(PORT, () => {
  console.log("🚀 Server is running on port " + PORT);
  console.log(
    "📚 API Books Route: http://localhost:" + PORT + "/api/books/all"
  );
});

// ✅ تشغيل نظام جدولة الامتحانات الذكية تلقائيًا عند بدء السيرفر
scheduleAIExamGeneration();
console.log(
  "⏳ [Scheduler] تم جدولة توليد الامتحانات الذكية تلقائيًا عند بدء التشغيل."
);
