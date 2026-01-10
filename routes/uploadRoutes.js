const express = require("express");
const router = express.Router();
const upload = require("../middleware/multerMiddleware");
const bookController = require("../controllers/bookController");

// ✅ 1. رفع كتاب إلى AWS S3
router.post("/upload", upload.single("bookFile"), bookController.uploadBook);

// ✅ 2. استرجاع جميع الكتب من AWS S3
router.get("/list", bookController.listBooksFromS3);

// ✅ 3. تحليل كتاب معين بعد رفعه
router.post("/analyze", bookController.analyzeBookFromS3);

// ✅ 4. استخراج الأسئلة من جميع الكتب
router.get("/generate-questions", bookController.generateQuestionsFromBooks);

module.exports = router;
