const AWS = require("aws-sdk");
const {
  parsePDF,
  parseDOCX,
  parseExcel,
  parseImage,
} = require("../utils/fileParser");
const BookContent = require("../models/BookContent");
const { generateAIQuestions } = require("../utils/aiQuestionGenerator");

// 🛠️ إعداد AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

/**
 * 📌 1. رفع كتاب إلى S3 عند استلامه من المستخدم
 */
exports.uploadBook = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "❌ لم يتم استلام أي ملف للرفع." });
    }

    const filePath = decodeURIComponent(req.file.key); // ✅ التأكد من أن الاسم يُخزن بشكل صحيح

    res.json({ success: true, message: "✅ تم رفع الكتاب بنجاح!", filePath });
  } catch (error) {
    console.error("❌ خطأ أثناء رفع الكتاب:", error);
    res.status(500).json({ success: false, message: "❌ فشل في رفع الكتاب" });
  }
};

/**
 * 📌 2. جلب قائمة الكتب المخزنة في S3
 */
exports.listBooksFromS3 = async (req, res) => {
  try {
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Prefix: "ai/books/",
    };

    const data = await s3.listObjectsV2(params).promise();
    const books = data.Contents.map((item) => {
      const fileName = decodeURIComponent(item.Key.split("/").pop()); // ✅ فك التشفير عند الجلب

      return {
        fileName: fileName, // ✅ لا تعديل إضافي
        filePath: item.Key,
        size: item.Size,
        lastModified: item.LastModified,
      };
    });

    res.json({ success: true, books });
  } catch (error) {
    console.error("❌ خطأ في جلب الملفات من S3:", error);
    res
      .status(500)
      .json({ success: false, message: "❌ فشل في جلب الملفات من S3" });
  }
};

/**
 * 📌 3. تحليل كتاب تلقائيًا عند رفعه
 */
exports.analyzeBookFromS3 = async (req, res) => {
  const { filePath } = req.body;
  if (!filePath)
    return res
      .status(400)
      .json({ success: false, message: "❌ يجب إرسال مسار الملف" });

  try {
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: filePath,
    };

    const fileData = await s3.getObject(params).promise();
    const fileBuffer = fileData.Body;
    const fileExtension = filePath.split(".").pop().toLowerCase();
    let extractedText = "";

    const supportedFormats = ["pdf", "docx", "xlsx", "jpg", "jpeg", "png"];
    if (!supportedFormats.includes(fileExtension)) {
      return res
        .status(400)
        .json({ success: false, message: "❌ صيغة الملف غير مدعومة" });
    }

    switch (fileExtension) {
      case "pdf":
        extractedText = await parsePDF(fileBuffer);
        break;
      case "docx":
        extractedText = await parseDOCX(fileBuffer);
        break;
      case "xlsx":
        extractedText = await parseExcel(fileBuffer);
        break;
      case "jpg":
      case "jpeg":
      case "png":
        extractedText = await parseImage(fileBuffer);
        break;
    }

    if (!extractedText) {
      return res.status(500).json({
        success: false,
        message: "❌ فشل في استخراج النص من الملف.",
      });
    }

    const fileName = decodeURIComponent(filePath.split("/").pop()); // ✅ استرجاع الاسم بعد فك التشفير

    const bookEntry = new BookContent({
      fileName: fileName,
      content: extractedText,
    });
    await bookEntry.save();

    const generatedQuestions = await generateAIQuestions(extractedText);

    res.json({
      success: true,
      message: "✅ تم تحليل الكتاب وتوليد الأسئلة بنجاح!",
      content: extractedText,
      questions: generatedQuestions,
    });
  } catch (error) {
    console.error("❌ خطأ في تحليل الكتاب:", error);
    res
      .status(500)
      .json({ success: false, message: "❌ فشل في تحليل محتوى الكتاب" });
  }
};

/**
 * 📌 4. توليد الأسئلة من جميع الكتب المحللة
 */
exports.generateQuestionsFromBooks = async (req, res) => {
  try {
    const books = await BookContent.find();
    if (!books.length)
      return res
        .status(404)
        .json({ success: false, message: "❌ لا يوجد محتوى محلل للكتب" });

    let allQuestions = [];
    for (const book of books) {
      const questions = await generateAIQuestions(book.content);
      allQuestions.push({ book: book.fileName, questions });
    }

    res.json({ success: true, generatedQuestions: allQuestions });
  } catch (error) {
    console.error("❌ خطأ في توليد الأسئلة:", error);
    res
      .status(500)
      .json({ success: false, message: "❌ فشل في توليد الأسئلة من الكتب" });
  }
};
