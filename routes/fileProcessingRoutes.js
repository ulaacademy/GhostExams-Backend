const express = require("express");
const multer = require("multer");
const fileProcessingController = require("../controllers/fileProcessingController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ✅ تحليل ملفات PDF
router.post("/process-pdf", upload.single("file"), fileProcessingController.processPDF);

// ✅ تحليل ملفات Word
router.post("/process-word", upload.single("file"), fileProcessingController.processWord);

// ✅ تحليل ملفات Excel
router.post("/process-excel", upload.single("file"), fileProcessingController.processExcel);

// ✅ معالجة الصور (OCR)
router.post("/process-image", upload.single("file"), fileProcessingController.processImage);

// ✅ تحليل ملف من AWS S3 مباشرة
router.post("/process-s3", fileProcessingController.processFileFromS3);

// ✅ تحليل ملف مرفوع محليًا
router.post("/process-uploaded", upload.single("file"), fileProcessingController.processUploadedFile);

// ✅ تحليل وتحميل عدة ملفات دفعة واحدة
router.post("/process-multiple", upload.array("files", 5), fileProcessingController.processMultipleFiles);

// ✅ تحليل ملف وتحويله إلى أسئلة وحفظها تلقائيًا
router.post("/process-and-save", upload.single("file"), fileProcessingController.processAndSaveQuestions);

// ✅ استيراد أسئلة من ملف Excel وحفظها في قاعدة البيانات
router.post(
  "/import-excel-questions",
  authMiddleware,
  upload.single("file"),
  fileProcessingController.importQuestionsFromExcel
);

module.exports = router;
