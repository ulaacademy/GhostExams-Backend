const { S3Client } = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3");
require("dotenv").config();

// ✅ إعداد AWS S3
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ✅ ضبط Multer لرفع الملفات إلى S3 بدون تعديل على الأسماء
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    contentType: function (req, file, cb) {
      cb(null, `${file.mimetype}; charset=utf-8`); // ✅ دعم UTF-8 عند التخزين
    },
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, `ai/books/${file.originalname}`); // ✅ تخزين الاسم كما هو دون أي تعديل
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // ✅ الحد الأقصى لحجم الملف 50MB
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/png",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "❌ صيغة الملف غير مدعومة! يُسمح فقط بـ PDF, DOCX, XLSX, JPG, PNG."
        )
      );
    }
  },
});

// ✅ تصدير `upload.single("bookFile")` مباشرة
module.exports = upload;
