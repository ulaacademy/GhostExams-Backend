const AWS = require("aws-sdk");
const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");
const mammoth = require("mammoth");
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");
const Question = require("../models/Question");
const TeacherCustomExam = require("../models/TeacherCustomExam");

const normalizeArabicCharacters = (value = "") =>
  value
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");

const sanitizeText = (value = "") => {
  if (value === null || value === undefined) return "";

  let text = typeof value === "string" ? value : String(value);

  // ✅ حافظ على علامات الترقيم والشرطات كما هي
  // فقط نظّف أشياء "غير مرئية" أو أحرف تحكم بتخرب العرض
  text = text.replace(/\u00A0/g, " "); // NBSP
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, ""); // zero-width
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ""); // control chars

  return text.trim();
};








const normalizeForComparison = (value = "") =>
  sanitizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u064B-\u065F]/g, ""); // remove Arabic diacritics

const pickFirstNonEmpty = (...values) => {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== "" && String(value).trim() !== "") {
      return value;
    }
  }
  return undefined;
};

const HEADER_ALIASES = {
  question: [
    "question",
    "questions",
    "سؤال",
    "السؤال",
    "نص السؤال",
    "السؤال؟",
  ],
  "option a": [
    "option a",
    "option 1",
    "option1",
    "choice a",
    "الخيار ا",
    "الخيار أ",
    "الخيار الاول",
    "الخيار الأول",
    "اختيار ا",
    "اختيار أ",
  ],
  "option b": [
    "option b",
    "option 2",
    "option2",
    "choice b",
    "الخيار ب",
    "الخيار الثاني",
    "اختيار ب",
  ],
  "option c": [
    "option c",
    "option 3",
    "option3",
    "choice c",
    "الخيار ج",
    "الخيار الثالث",
    "اختيار ج",
  ],
  "option d": [
    "option d",
    "option 4",
    "option4",
    "choice d",
    "الخيار د",
    "الخيار الرابع",
    "اختيار د",
  ],
  "correct answer": [
    "correct answer",
    "answer",
    "correct",
    "الإجابة الصحيحة",
    "الاجابة الصحيحة",
    "الإجابة",
    "الاجابة",
    "الحل الصحيح",
  ],
};

const getCanonicalHeader = (headerLookup, canonicalName) => {
  const aliases = HEADER_ALIASES[canonicalName] || [];

  for (const alias of aliases) {
    const normalizedAlias = normalizeForComparison(alias);
    if (headerLookup[normalizedAlias]) {
      return headerLookup[normalizedAlias];
    }
  }

  return null;
};

// ✅ إعداد AWS S3
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

// ✅ تحليل ملف PDF
exports.processPDF = async (req, res) => {
    try {
        const fileBuffer = req.file.buffer;
        const data = await pdfParse(fileBuffer);
        res.json({ message: "✅ تحليل PDF ناجح", text: data.text });
    } catch (error) {
        res.status(500).json({ message: "❌ خطأ في تحليل PDF", error });
    }
};

// ✅ تحليل صورة OCR
exports.processImage = async (req, res) => {
    try {
        const { data: { text } } = await Tesseract.recognize(req.file.buffer, "eng");
        res.json({ message: "✅ تحليل صورة ناجح", text });
    } catch (error) {
        res.status(500).json({ message: "❌ خطأ في تحليل الصورة", error });
    }
};

// ✅ تحليل ملف Word
exports.processWord = async (req, res) => {
    try {
        const buffer = req.file.buffer;
        const { value } = await mammoth.extractRawText({ buffer });
        res.json({ message: "✅ تحليل Word ناجح", text: value });
    } catch (error) {
        res.status(500).json({ message: "❌ خطأ في تحليل Word", error });
    }
};

// ✅ تحليل ملف Excel
exports.processExcel = async (req, res) => {
    try {
        const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
        let extractedText = "";
        workbook.SheetNames.forEach(sheet => {
            extractedText += xlsx.utils.sheet_to_csv(workbook.Sheets[sheet]);
        });
        res.json({ message: "✅ تحليل Excel ناجح", text: extractedText });
    } catch (error) {
        res.status(500).json({ message: "❌ خطأ في تحليل Excel", error });
    }
};

// ✅ استيراد الأسئلة من ملف Excel وحفظها في قاعدة البيانات
exports.importQuestionsFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "❌ لم يتم رفع أي ملف." });
    }

    // ✅ التحقق من وجود عنوان الامتحان (مطلوب)
    const examTitle = req.body.examTitle || req.body.examName || req.body.title;
    if (!examTitle || !examTitle.trim()) {
      return res.status(400).json({ 
        message: "❌ عنوان الامتحان مطلوب. يرجى إدخال عنوان للامتحان." 
      });
    }

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return res.status(400).json({ message: "❌ الملف لا يحتوي على أي أوراق عمل." });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    if (!rows.length) {
      return res.status(400).json({ message: "❌ الملف لا يحتوي على بيانات أسئلة." });
    }

    const headerLookup = Object.keys(rows[0] || {}).reduce((acc, header) => {
      const normalizedHeader = normalizeForComparison(header);
      if (normalizedHeader) {
        acc[normalizedHeader] = header;
      }
      return acc;
    }, {});

    const resolveHeader = (canonicalName) => getCanonicalHeader(headerLookup, canonicalName);

    const requiredHeaders = ["question", "correct answer"];
    const missingHeaders = requiredHeaders.filter(
      (key) => !resolveHeader(key)
    );

    if (missingHeaders.length) {
      return res.status(400).json({
        message: "❌ تنسيق رؤوس الأعمدة غير صحيح.",
        details: `الحقول المفقودة: ${missingHeaders.join(", ")}`,
      });
    }

    const mapField = (row, canonical) => {
      const headerKey = resolveHeader(canonical);
      return headerKey ? sanitizeText(row[headerKey]) : "";
    };

    const optionalHeaders = ["option a", "option b", "option c", "option d"];
    const resolvedOptionHeaders = optionalHeaders
      .map((key) => ({
        canonical: key,
        actual: resolveHeader(key),
      }))
      .filter((entry) => entry.actual);

    if (!resolvedOptionHeaders.length) {
      return res.status(400).json({
        message: "❌ يجب أن يحتوي الملف على الأعمدة: Option A, Option B, Option C, Option D.",
      });
    }

    const normalizeAnswer = (value) => normalizeForComparison(value);

    const metadata = {
      grade: sanitizeText(req.body.grade) || undefined,
      term: sanitizeText(req.body.term) || undefined,
      subject: sanitizeText(req.body.subject) || undefined,
      unit: sanitizeText(req.body.unit) || undefined,
      difficultyLevel: sanitizeText(req.body.difficultyLevel) || undefined,
    };

    const createdBy =
      req.user?.role === "teacher" && req.user?.id ? req.user.id : undefined;

    const questionsToInsert = [];
    const rowErrors = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 2; // احتساب صف العناوين
      const questionText = mapField(row, "question");
      const correctAnswerRaw = mapField(row, "correct answer");

      if (!questionText) {
        rowErrors.push({ row: rowNumber, reason: "🔴 نص السؤال مفقود." });
        return;
      }

      if (!correctAnswerRaw) {
        rowErrors.push({
          row: rowNumber,
          reason: "🔴 الإجابة الصحيحة مفقودة.",
        });
        return;
      }

      const options = resolvedOptionHeaders
        .map((header) => sanitizeText(row[header.actual]))
        .filter((option) => option && option.length > 0);

      if (options.length < 2) {
        rowErrors.push({
          row: rowNumber,
          reason: "🔴 يجب أن يحتوي السؤال على خيارين على الأقل.",
        });
        return;
      }

      const normalizedOptions = options.map((option) => ({
        original: option,
        normalized: normalizeAnswer(option),
      }));

      const normalizedCorrectAnswer = normalizeAnswer(correctAnswerRaw);
      const matchedOption = normalizedOptions.find(
        (option) => option.normalized === normalizedCorrectAnswer
      );

      if (!matchedOption) {
        rowErrors.push({
          row: rowNumber,
          reason: "🔴 الإجابة الصحيحة لا تطابق أيًا من الخيارات.",
        });
        return;
      }

      const questionDocument = {
        questionText,
        options: normalizedOptions.map((option) => option.original),
        correctAnswer: matchedOption.original,
        source: "Excel",
        isValidated: false,
        ...metadata,
      };

      if (createdBy) {
        questionDocument.createdBy = createdBy;
      }

      questionsToInsert.push(questionDocument);
    });

    if (!questionsToInsert.length) {
      return res.status(400).json({
        message: "❌ لم يتم استيراد أي أسئلة بسبب أخطاء في البيانات.",
        errors: rowErrors,
      });
    }

    const insertedQuestions = await Question.insertMany(questionsToInsert);

    let createdExam = null;
    // ✅ الحصول على teacherId من المستخدم المصادق عليه فقط
    const isTeacher = req.user?.role === "teacher";
    const teacherId = isTeacher ? (req.user.id || req.user._id) : null;

    if (teacherId) {
      // ✅ استخدام عنوان الامتحان المطلوب من المستخدم
      const rawExamName = examTitle.trim();

      const rawSubject = pickFirstNonEmpty(req.body.subject, metadata.subject);
      const rawGrade = pickFirstNonEmpty(req.body.grade, metadata.grade);
      const rawTerm = pickFirstNonEmpty(req.body.term, metadata.term);

      const durationRaw =
        req.body.duration ??
        req.body.examDuration ??
        req.body.timeLimit ??
        req.body.timer;

      let parsedDuration = Number(durationRaw);
      if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
        parsedDuration = Math.max(questionsToInsert.length * 2, 10);
      }

      const examPayload = {
        teacherId,
        examName:
          rawExamName || `امتحان Excel ${new Date().toISOString().slice(0, 10)}`,
        subject: rawSubject || "غير محدد",
        grade: rawGrade || "غير محدد",
        term: rawTerm || "غير محدد",
        duration: parsedDuration,
        questions: questionsToInsert.map((question) => ({
          questionText: question.questionText,
          options: question.options,
          correctAnswer: question.correctAnswer,
        })),
      };

      createdExam = await TeacherCustomExam.create(examPayload);

      // ✅ زيادة عداد الامتحانات للمعلم
      const Teacher = require("../models/Teacher");
      await Teacher.findByIdAndUpdate(teacherId, {
        $inc: { "currentUsage.examsCount": 1 }
      });
    }

    res.status(201).json({
      message: "✅ تم استيراد الأسئلة من Excel وحفظها بنجاح.",
      insertedCount: insertedQuestions.length,
      skippedRows: rowErrors,
      exam: createdExam,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء استيراد الأسئلة من Excel:", error);
    res.status(500).json({
      message: "❌ حدث خطأ أثناء استيراد الأسئلة من Excel.",
      error: error.message || error,
    });
  }
};

// ✅ تحليل ملف من AWS S3 مباشرة
exports.processFileFromS3 = async (req, res) => {
    try {
        const { fileKey } = req.body;
        if (!fileKey) {
            return res.status(400).json({ message: "❌ يجب توفير مفتاح الملف من S3." });
        }

        const params = { Bucket: process.env.S3_BUCKET_NAME, Key: fileKey };
        const fileData = await s3.getObject(params).promise();
        res.json({ message: "✅ تم تحميل الملف من S3 بنجاح", data: fileData.Body.toString() });
    } catch (error) {
        res.status(500).json({ message: "❌ خطأ في تحميل الملف من S3", error });
    }
};

// ✅ تحليل ملف مرفوع محليًا
exports.processUploadedFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "❌ لم يتم رفع أي ملف." });
        }

        const filePath = req.file.path;
        const fileExtension = path.extname(req.file.originalname).toLowerCase();
        let extractedText = "";

        if (fileExtension === ".pdf") {
            extractedText = await pdfParse(fs.readFileSync(filePath)).then(data => data.text);
        } else if ([".jpg", ".jpeg", ".png"].includes(fileExtension)) {
            extractedText = await Tesseract.recognize(filePath, "eng").then(({ data }) => data.text);
        } else if (fileExtension === ".docx") {
            extractedText = await mammoth.extractRawText({ path: filePath }).then(({ value }) => value);
        } else if ([".xls", ".xlsx"].includes(fileExtension)) {
            const workbook = xlsx.readFile(filePath);
            extractedText = xlsx.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
        } else {
            return res.status(400).json({ message: "❌ نوع الملف غير مدعوم." });
        }

        res.json({ message: "✅ تم تحليل الملف بنجاح", text: extractedText });

    } catch (error) {
        res.status(500).json({ message: "❌ خطأ في تحليل الملف المرفوع", error });
    }
};

// ✅ تحليل وتحميل عدة ملفات دفعة واحدة
exports.processMultipleFiles = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "❌ لم يتم رفع أي ملفات." });
        }

        const results = await Promise.all(req.files.map(async (file) => {
            const filePath = file.path;
            const fileExtension = path.extname(file.originalname).toLowerCase();
            let extractedText = "";

            if (fileExtension === ".pdf") {
                extractedText = await pdfParse(fs.readFileSync(filePath)).then(data => data.text);
            } else if ([".jpg", ".jpeg", ".png"].includes(fileExtension)) {
                extractedText = await Tesseract.recognize(filePath, "eng").then(({ data }) => data.text);
            } else if (fileExtension === ".docx") {
                extractedText = await mammoth.extractRawText({ path: filePath }).then(({ value }) => value);
            } else if ([".xls", ".xlsx"].includes(fileExtension)) {
                const workbook = xlsx.readFile(filePath);
                extractedText = xlsx.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
            } else {
                extractedText = "❌ نوع الملف غير مدعوم.";
            }

            return { filename: file.originalname, text: extractedText };
        }));

        res.json({ message: "✅ تم تحليل جميع الملفات بنجاح", results });

    } catch (error) {
        res.status(500).json({ message: "❌ خطأ في تحليل الملفات", error });
    }
};

// ✅ تحليل ملف وتحويله إلى أسئلة وحفظها تلقائيًا
exports.processAndSaveQuestions = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "❌ لم يتم رفع أي ملف." });
        }

        const text = await pdfParse(req.file.buffer).then(data => data.text);
        const questions = text.split("\n").filter(line => line.trim() !== "").map(question => ({
            questionText: question,
            source: "PDF",
            options: [],
            correctAnswer: "",
            isValidated: false
        }));

        await Question.insertMany(questions);

        res.json({ message: "✅ تم تحليل الأسئلة وحفظها بنجاح", questions });

    } catch (error) {
        res.status(500).json({ message: "❌ خطأ في تحليل وحفظ الأسئلة", error });
    }
};
