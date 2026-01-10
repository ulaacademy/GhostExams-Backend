const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const xlsx = require("xlsx");
const Tesseract = require("tesseract.js");
const sharp = require("sharp");

// *1️⃣ تحليل ملفات PDF*
exports.parsePDF = async (fileBuffer) => {
  try {
    const data = await pdfParse(fileBuffer);
    return data.text;
  } catch (error) {
    console.error("❌ خطأ في تحليل ملف PDF:", error);
    return "";
  }
};

// *2️⃣ تحليل ملفات DOCX (وورد)*
exports.parseDOCX = async (fileBuffer) => {
  try {
    const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
    return value;
  } catch (error) {
    console.error("❌ خطأ في تحليل ملف DOCX:", error);
    return "";
  }
};

// *3️⃣ تحليل ملفات Excel (استخراج البيانات من الجداول)*
exports.parseExcel = async (fileBuffer) => {
  try {
    const workbook = xlsx.read(fileBuffer, { type: "buffer" });
    let extractedText = "";

    workbook.SheetNames.forEach((sheet) => {
      const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheet], {
        header: 1,
      });
      sheetData.forEach((row) => {
        extractedText += row.join(" ") + "\n";
      });
    });

    return extractedText;
  } catch (error) {
    console.error("❌ خطأ في تحليل ملف Excel:", error);
    return "";
  }
};

// *4️⃣ تحليل الصور باستخدام OCR (تحليل النصوص من الصور)*
exports.parseImage = async (fileBuffer) => {
  try {
    // تحسين جودة الصورة قبل تحليل النص
    const processedImage = await sharp(fileBuffer)
      .resize(1500)
      .grayscale()
      .toBuffer();

    const {
      data: { text },
    } = await Tesseract.recognize(processedImage, "ara+eng"); // يدعم العربية والإنجليزية
    return text.trim();
  } catch (error) {
    console.error("❌ خطأ في تحليل الصورة باستخدام OCR:", error);
    return "";
  }
};

// ✅ دالة تحليل الملفات بناءً على نوعها
const parseFile = async (fileBuffer, fileType) => {
  try {
    let extractedText = "";

    if (fileType.endsWith(".pdf")) {
      extractedText = (await pdfParse(fileBuffer)).text;
    } else if (fileType.endsWith(".docx")) {
      extractedText = (await mammoth.extractRawText({ buffer: fileBuffer }))
        .value;
    } else if (fileType.endsWith(".xlsx")) {
      const workbook = xlsx.read(fileBuffer, { type: "buffer" });
      extractedText = JSON.stringify(workbook.Sheets);
    } else if (fileType.endsWith(".jpg") || fileType.endsWith(".png")) {
      const {
        data: { text },
      } = await Tesseract.recognize(fileBuffer);
      extractedText = text;
    } else {
      throw new Error("❌ نوع الملف غير مدعوم.");
    }

    return extractedText;
  } catch (error) {
    console.error("❌ خطأ أثناء تحليل الملف:", error);
    throw error;
  }
};

// ✅ تصدير الدالة
module.exports = { parseFile };
