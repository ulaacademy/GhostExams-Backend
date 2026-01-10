const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Tesseract = require("tesseract.js");

const router = express.Router();

// ✅ إعداد Multer لتخزين الملفات مع أسماء مميزة
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // ✅ حفظ الملفات في مجلد uploads
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // ✅ استخدام اسم فريد مع امتداد الملف
  },
});

const upload = multer({ storage });

// ✅ API لتحليل الصور أو ملفات PDF باستخدام Tesseract
router.post("/analyze", upload.single("file"), async (req, res) => {
  try {
    // ✅ التحقق من وجود الملف
    if (!req.file) {
      return res.status(400).json({ message: "❌ لم يتم تحميل أي ملف!" });
    }

    const filePath = path.join(__dirname, "../uploads", req.file.filename);

    console.log("✅ جاري تحليل الملف:", filePath);

    // ✅ استخدام Tesseract لتحليل النصوص (دعم اللغة العربية والإنجليزية)
    const result = await Tesseract.recognize(filePath, "ara+eng", {
      logger: (m) => console.log(m), // ✅ لمراقبة تقدم التحليل في التيرمنال
    });

    // ✅ حذف الملف بعد التحليل لتوفير المساحة
    fs.unlinkSync(filePath);

    res.json({
      message: "✅ تم استخراج النصوص بنجاح!",
      text: result.data.text,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء تحليل الملف:", error);
    res.status(500).json({
      message: "❌ حدث خطأ أثناء تحليل الملف",
      error: error.message,
    });
  }
});

// ✅ API للتحقق من حالة OCR
router.get("/status", (req, res) => {
  res.json({ status: "✅ OCR API is working!" });
});

module.exports = router;
