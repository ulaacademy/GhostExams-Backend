const express = require("express");
const router = express.Router();
const bookController = require("../controllers/bookController");
const upload = require("../middleware/multerMiddleware");

// ✅ 1️⃣ رفع كتاب إلى AWS S3
router.post("/upload", upload.single("bookFile"), bookController.uploadBook);

// ✅ 2️⃣ استرجاع جميع الكتب من S3
router.get("/list", bookController.listBooksFromS3);

// ✅ 3️⃣ تحليل كتاب معين بعد رفعه
router.post("/analyze", bookController.analyzeBookFromS3);

// ✅ 4️⃣ توليد الأسئلة من جميع الكتب المحللة
router.get("/generate-questions", bookController.generateQuestionsFromBooks);

module.exports = router;
