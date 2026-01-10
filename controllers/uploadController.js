const AWS = require("aws-sdk");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");
const mammoth = require("mammoth");
const xlsx = require("xlsx");
const Question = require("../models/Question");
const Exam = require("../models/Exam");

// ✅ إعداد AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// ✅ إعداد تخزين الملفات باستخدام Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

// ✅ تحليل ملف PDF
const extractTextFromPDF = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
};

// ✅ تحليل صورة واستخراج النص باستخدام OCR
const extractTextFromImage = async (filePath) => {
  const {
    data: { text },
  } = await Tesseract.recognize(filePath, "eng");
  return text;
};

// ✅ استخراج النصوص من ملفات Word
const extractTextFromWord = async (filePath) => {
  const buffer = fs.readFileSync(filePath);
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
};

// ✅ استخراج النصوص من ملفات Excel
const extractTextFromExcel = async (filePath) => {
  const workbook = xlsx.readFile(filePath);
  let extractedText = "";
  workbook.SheetNames.forEach((sheet) => {
    extractedText += xlsx.utils.sheet_to_csv(workbook.Sheets[sheet]);
  });
  return extractedText;
};

// ✅ تحليل الملف المرفوع واستخراج الأسئلة وتخزينها
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "❌ يرجى رفع ملف صالح." });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    let extractedText = "";

    if (fileExtension === ".pdf") {
      extractedText = await extractTextFromPDF(filePath);
    } else if ([".jpg", ".jpeg", ".png"].includes(fileExtension)) {
      extractedText = await extractTextFromImage(filePath);
    } else if (fileExtension === ".docx") {
      extractedText = await extractTextFromWord(filePath);
    } else if ([".xls", ".xlsx"].includes(fileExtension)) {
      extractedText = await extractTextFromExcel(filePath);
    } else {
      return res.status(400).json({ message: "❌ نوع الملف غير مدعوم." });
    }

    // ✅ تقسيم النصوص إلى أسئلة
    const questions = extractedText
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((q) => ({
        questionText: q,
        options: ["اختيار 1", "اختيار 2", "اختيار 3", "اختيار 4"],
        correctAnswer: "اختيار 1",
        difficultyLevel: "متوسط",
      }));

    // ✅ إنشاء امتحان جديد
    const exam = new Exam({
      title: fileKey,
      subject: subject || "مادة غير محددة",
      grade: grade || 12,
      term: term || "غير محدد",
      examType: "ai",
      createdBy: teacherId, // ✅ أهم نقطة: ربط المعلم الحقيقي
      questions: [],
    });
    

    await exam.save();

    for (const questionData of questions) {
      const question = new Question({ ...questionData, exam: exam._id });
      await question.save();
      exam.questions.push(question._id);
    }

    await exam.save();

    res.status(200).json({
      message: "✅ تم تحليل الملف بنجاح وتخزين الأسئلة",
      examId: exam._id,
      questionsCount: questions.length,
    });

    // ✅ حذف الملف بعد التحليل (اختياري)
    fs.unlinkSync(filePath);
  } catch (error) {
    console.error("❌ خطأ في تحليل الملف:", error);
    res.status(500).json({ message: "❌ حدث خطأ أثناء معالجة الملف.", error });
  }
};

// ✅ تحليل وتحميل ملف من AWS S3
exports.processFileFromS3 = async (req, res) => {
  try {
    const { fileKey, teacherId, subject, grade, term } = req.body;

    if (!fileKey) {
      return res
        .status(400)
        .json({ message: "❌ يرجى توفير مفتاح الملف من S3." });
    }

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey,
    };

    const fileData = await s3.getObject(params).promise();
    const fileBuffer = fileData.Body;
    const fileExtension = path.extname(fileKey).toLowerCase();
    let extractedText = "";

    if (fileExtension === ".pdf") {
      extractedText = await pdfParse(fileBuffer);
    } else if ([".jpg", ".jpeg", ".png"].includes(fileExtension)) {
      const {
        data: { text },
      } = await Tesseract.recognize(fileBuffer, "eng");
      extractedText = text;
    } else if (fileExtension === ".docx") {
      const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
      extractedText = value;
    } else if ([".xls", ".xlsx"].includes(fileExtension)) {
      const workbook = xlsx.read(fileBuffer, { type: "buffer" });
      extractedText = xlsx.utils.sheet_to_csv(
        workbook.Sheets[workbook.SheetNames[0]]
      );
    } else {
      return res.status(400).json({ message: "❌ نوع الملف غير مدعوم." });
    }

    // ✅ تحليل الأسئلة تلقائيًا
    const questions = extractedText
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((text) => ({
        questionText: text,
        options: ["اختيار 1", "اختيار 2", "اختيار 3", "اختيار 4"],
        correctAnswer: "اختيار 1",
        difficultyLevel: "متوسط",
      }));

    // ✅ حفظ الأسئلة في قاعدة البيانات
    await Question.insertMany(questions);

    res.status(200).json({
      message: "✅ تم تحليل الملف من S3 بنجاح",
      extractedQuestions: questions,
    });
  } catch (error) {
    console.error("❌ خطأ في تحليل الملف من S3:", error);
    res
      .status(500)
      .json({ message: "❌ حدث خطأ أثناء معالجة الملف من S3.", error });
  }
};

// ✅ حذف ملف مرفوع
exports.deleteFile = (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, "../uploads", filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return res.status(200).json({ message: "✅ تم حذف الملف بنجاح!" });
  } else {
    return res.status(404).json({ message: "❌ الملف غير موجود!" });
  }
};

exports.upload = upload;
