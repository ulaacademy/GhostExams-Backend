const Books = require("../models/Books");
const { getFileFromS3 } = require("../utils/s3Utils");
const { parseFile } = require("../utils/fileParser");
const Tesseract = require("tesseract.js");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const xlsx = require("xlsx");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const Question = require("../models/Question"); // ✅ استيراد نموذج الأسئلة

const getBooksDashboard = async (req, res) => {
  try {
    const booksId = req.params.id;
    const books = await Books.findById(booksId);
    if (!books) return res.status(404).json({ message: "المدرسة غير موجود" });

    res.json({
      createdExams: books.exams || [],
      feedback: [
        "طلابك بحاجة لتحسين في الوحدة 2.",
        "مستوى الطلاب في اللغة الإنجليزية جيد.",
      ],
    });
  } catch (error) {
    res.status(500).json({ message: "خطأ في تحميل بيانات المعلم", error });
  }
};
const analyzeExamFile = async (req, res) => {
  try {
    const { file } = req.query;

    if (!file) {
      return res.status(400).json({ message: "❌ يجب تحديد مسار الملف." });
    }

    console.log(`📂 تحليل الملف: ${file}`);

    const bucketName = process.env.S3_BUCKET_NAME;
    const fileContent = await getFileFromS3(bucketName, file);

    if (!fileContent) {
      return res.status(404).json({ message: "❌ لم يتم العثور على الملف." });
    }

    let extractedText = "";

    // ✅ معالجة ملفات PDF وتحليل كل الصفحات والجداول
    if (file.endsWith(".pdf")) {
      const pdfData = await pdfParse(fileContent);
      extractedText = pdfData.text.trim();

      if (
        !extractedText ||
        extractedText.length < 5 ||
        /[\ufffd]/.test(extractedText)
      ) {
        console.log(
          "⚠️ النص المستخرج فارغ أو يحتوي على رموز غير مفهومة، يتم استخدام OCR لكل الصفحات..."
        );

        const tempPdfPath = path.join(__dirname, "temp.pdf");
        const tempImagePath = path.join(__dirname, "temp");

        fs.writeFileSync(tempPdfPath, fileContent);

        const popplerCommand = `pdftoppm -png ${tempPdfPath} ${tempImagePath}`;
        exec(popplerCommand, async (error) => {
          if (error) {
            console.error("❌ خطأ أثناء تحويل PDF إلى صور:", error);
            return res
              .status(500)
              .json({ message: "❌ فشل في استخراج النص من ملف PDF." });
          }

          console.log("📸 تم تحويل PDF إلى صور، يتم تشغيل OCR لكل صفحة...");

          let ocrText = "";
          let pageIndex = 1;
          while (fs.existsSync(`${tempImagePath}-${pageIndex}.png`)) {
            console.log(`📑 تشغيل OCR على الصفحة ${pageIndex}...`);
            const {
              data: { text },
            } = await Tesseract.recognize(
              `${tempImagePath}-${pageIndex}.png`,
              "ara+eng"
            );
            ocrText += text.trim() + "\n";
            pageIndex++;
          }

          fs.unlinkSync(tempPdfPath);
          pageIndex = 1;
          while (fs.existsSync(`${tempImagePath}-${pageIndex}.png`)) {
            fs.unlinkSync(`${tempImagePath}-${pageIndex}.png`);
            pageIndex++;
          }

          console.log("📑 النص المستخرج من جميع الصفحات:", ocrText);
          return saveQuestionsToDB(res, ocrText, file);
        });

        return;
      }
    }

    // ✅ معالجة ملفات Word (DOCX) وتحليل الجداول والقوائم
    else if (file.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer: fileContent });
      extractedText = result.value.trim();
    }

    // ✅ معالجة ملفات Excel (XLSX) وتحليل الجداول
    else if (file.endsWith(".xlsx")) {
      const workbook = xlsx.read(fileContent, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const sheetData = xlsx.utils.sheet_to_json(sheet, { defval: "" });

      if (!sheetData || sheetData.length === 0) {
        return res
          .status(400)
          .json({ message: "⚠️ ملف الإكسل فارغ أو غير صالح." });
      }

      let formattedText = "";

      sheetData.forEach((row) => {
        // ✅ دعم الأعمدة بالعربي والإنجليزي
        const question = row["السؤال"] || row["Question"];
        const optionA = row["الخيار أ"] || row["Option A"];
        const optionB = row["الخيار ب"] || row["Option B"];
        const optionC = row["الخيار ج"] || row["Option C"];
        const optionD = row["الخيار د"] || row["Option D"];
        const correctAnswer = row["الإجابة الصحيحة"] || row["Correct Answer"];

        if (
          question &&
          optionA &&
          optionB &&
          optionC &&
          optionD &&
          correctAnswer
        ) {
          formattedText += `${question}\n`;
          formattedText += `${optionA}\n`;
          formattedText += `${optionB}\n`;
          formattedText += `${optionC}\n`;
          formattedText += `${optionD}\n`;
          formattedText += `الإجابة الصحيحة: ${correctAnswer.trim()}\n\n`;
        }
      });

      extractedText = formattedText.trim();
      return saveQuestionsToDB(res, extractedText, file); // ✅ تخزين في الأسئلة
    }

    // ✅ معالجة ملفات الصور (JPG, PNG) باستخدام OCR
    else if (
      file.endsWith(".jpg") ||
      file.endsWith(".jpeg") ||
      file.endsWith(".png")
    ) {
      console.log("📸 تشغيل OCR على الصورة...");
      const {
        data: { text },
      } = await Tesseract.recognize(fileContent, "ara+eng");
      extractedText = text.trim();
    }

    // ✅ رفض أنواع الملفات غير المدعومة
    else {
      return res.status(400).json({ message: "❌ نوع الملف غير مدعوم." });
    }

    console.log("📑 النص المستخرج:", extractedText);
    return saveQuestionsToDB(res, extractedText, file);
  } catch (error) {
    console.error("❌ خطأ أثناء تحليل الملف:", error);
    res.status(500).json({
      message: "❌ فشل في تحليل الملف",
      error: error.message || error,
    });
  }
};
// ✅ **دالة تخزين الأسئلة في قاعدة البيانات**
const OpenAI = require("openai"); // ✅ تأكد من استدعاء مكتبة OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); // ✅ استخدام مفتاح API

const saveQuestionsToDB = async (res, extractedText, file) => {
  try {
    if (!extractedText || extractedText.length < 5) {
      return res
        .status(400)
        .json({ message: "⚠️ لم يتم استخراج أي بيانات صالحة." });
    }

    console.log("📥 يتم الآن تخزين الأسئلة في قاعدة البيانات...");

    const fileParts = file.split("/");
    const grade = fileParts[1] || "غير محدد";
    const term = fileParts[2] || "غير محدد";
    const subject = fileParts[3] || "غير محدد";
    const unit = "غير محدد"; // يمكن تحديثه لاحقًا عند توفر معلومات إضافية

    const lines = extractedText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return res
        .status(400)
        .json({ message: "⚠️ لا يوجد أي نصوص صالحة للتخزين." });
    }

    const questionsArray = [];
    let currentQuestion = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // ✅ التحقق إذا السطر هو سؤال
      if (/^\d+[-.)]/.test(line) || /[?؟\u061F:…]$/.test(line)) {
        if (currentQuestion && currentQuestion.correctAnswer) {
          questionsArray.push(currentQuestion);
        }

        currentQuestion = {
          questionText: line,
          options: [],
          correctAnswer: "",
          explanation: "",
          subject,
          grade,
          term,
          unit,
          source: "books", // ← غير حسب القسم (books أو school أو غيره)
          generatedByAI: false,
        };
      } else if (currentQuestion) {
        if (line.startsWith("الإجابة الصحيحة:")) {
          currentQuestion.correctAnswer = line
            .replace("الإجابة الصحيحة:", "")
            .trim();
        } else {
          currentQuestion.options.push(line);
        }
      }
    }

    if (currentQuestion && currentQuestion.correctAnswer) {
      questionsArray.push(currentQuestion);
    }

    if (questionsArray.length === 0) {
      return res
        .status(400)
        .json({ message: "⚠️ لم يتم العثور على أسئلة صالحة." });
    }

    const storedQuestions = await Question.insertMany(questionsArray);

    console.log(
      `✅ تم تخزين ${storedQuestions.length} سؤال في قاعدة البيانات.`
    );

    return res.status(200).json({
      message: `✅ تم تخزين ${storedQuestions.length} سؤال بنجاح`,
      storedQuestions,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء تخزين الأسئلة:", error);
    return res.status(500).json({ message: "❌ فشل في تخزين الأسئلة", error });
  }
};

// ✅ تصدير جميع الدوال بشكل صحيح
module.exports = { analyzeExamFile, getBooksDashboard, saveQuestionsToDB };
