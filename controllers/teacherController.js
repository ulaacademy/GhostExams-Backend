const Teacher = require("../models/Teacher");
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
const TeacherCustomExam = require("../models/TeacherCustomExam"); // تأكد أنه في أعلى الملف

const getTeacherDashboard = async (req, res) => {
  try {
    const teacherId = req.params.id;
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: "المعلم غير موجود" });

    res.json({
      createdExams: teacher.exams || [],
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
    const file = decodeURIComponent(req.query.file);

    // ✅ خلي استخراج الـ grade, term, subject بناءً على شرط:
    let grade = "غير محدد";
    let term = "غير محدد";
    let subject = "غير محدد";
    let teacherId = req.query.teacherId || req.body.teacherId || null;

    // 🔥 إذا الملف جاي من teacher-uploaded-exams → المعلم، خذهم من الـ req.query أو req.body
    if (file.startsWith("teacher-uploaded-exams/")) {
      grade = req.query.grade || req.body.grade || "غير محدد";
      term = req.query.term || req.body.term || "غير محدد";
      subject = req.query.subject || req.body.subject || "غير محدد";
      teacherId = req.query.teacherId || req.body.teacherId || null;
    }

    console.log("📦 بيانات تحليل:", { grade, term, subject, teacherId });

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
    } else if (file.endsWith(".xlsx")) {
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
        // ✅ دعم كل الاحتمالات: عربي أو إنجليزي
        const question = row["السؤال"] || row["Question"];
        const optionA = row["الخيار أ"] || row["Option A"];
        const optionB = row["الخيار ب"] || row["Option B"];
        const optionC = row["الخيار ج"] || row["Option C"];
        const optionD = row["الخيار د"] || row["Option D"];
        const correctAnswer = row["الإجابة الصحيحة"] || row["Correct Answer"];

        if (question && optionA && optionB && optionC && optionD) {
          formattedText += `${question}\n`;
          formattedText += `${optionA}\n`;
          formattedText += `${optionB}\n`;
          formattedText += `${optionC}\n`;
          formattedText += `${optionD}\n`;

          if (correctAnswer) {
            formattedText += `الإجابة الصحيحة: ${correctAnswer}\n\n`;
          }
        }
      });

      extractedText = formattedText.trim();

      console.log("📑 النص المستخرج:", extractedText);

      // ✅ هنا عملية التفريق بين teacher و non-teacher
      if (file.startsWith("teacher-uploaded-exams/")) {
        const teacherId = req.query.teacherId || req.body.teacherId;
        if (!teacherId) {
          return res.status(400).json({ message: "❌ teacherId مفقود." });
        }

        return saveTeacherExamToDB(
          res,
          extractedText,
          file,
          grade,
          term,
          subject,
          teacherId
        );
      } else {
        return saveQuestionsToDB(res, extractedText, file);
      }
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

    // ✅ دائمًا خزّن في بنك الأسئلة (questions) خلال التحليل اليدوي
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

    // ✅ استخراج الصف، الفصل، المادة، الوحدة من مسار الملف
    const fileParts = file.split("/");
    const grade = fileParts[1] || "غير محدد";
    const term = fileParts[2] || "غير محدد";
    const subject = fileParts[3] || "غير محدد";
    const unit = "غير محدد"; // يمكن تحديثه لاحقًا عند توفر معلومات إضافية

    // ✅ تقسيم النص إلى أسئلة وخيارات
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
      let line = lines[i];

      // ✅ التحقق مما إذا كانت الجملة تمثل سؤالًا (يبدأ برقم أو ينتهي بـ "؟" أو ":" أو "...")
      if (/^\d+[-.)]/.test(line) || /[?؟\u061F:…]$/.test(line)) {
        if (currentQuestion && currentQuestion.questionText.trim().length > 5) {
          questionsArray.push(currentQuestion);
        }

        currentQuestion = {
          questionText: line,
          options: [],
          correctAnswer: "",
          explanation: "",
          subject: subject,
          grade: grade,
          term: term,
          unit: unit,
          source: "teacher",
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

    if (currentQuestion && currentQuestion.questionText.trim().length > 5) {
      questionsArray.push(currentQuestion);
    }

    if (questionsArray.length === 0) {
      return res
        .status(400)
        .json({ message: "⚠️ لم يتم العثور على أسئلة صالحة." });
    }

    let storedQuestions = [];

    // ✅ استخدام الذكاء الاصطناعي لتحديد الإجابة الصحيحة وتحليلها
    const determineCorrectAnswer = async (questionText, options) => {
      if (options.length === 0) return "";

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "أنت مساعد تعليمي، تحلل الأسئلة وتحدد الإجابة الصحيحة مع التفسير.",
            },
            {
              role: "user",
              content: `السؤال: "${questionText}"\nالخيارات: ${options.join(
                ", "
              )}\nما هي الإجابة الصحيحة ولماذا؟`,
            },
          ],
          max_tokens: 250,
        });

        return response.choices[0].message.content.trim();
      } catch (error) {
        console.error("❌ خطأ في تحليل الإجابة الصحيحة:", error);
        return "";
      }
    };

    // ✅ حفظ كل سؤال في قاعدة البيانات داخل async function
    const saveQuestion = async (questionData) => {
      if (
        !questionData.questionText ||
        questionData.questionText.trim().length < 5
      ) {
        console.warn("⚠️ تم تخطي سؤال فارغ.");
        return null;
      }

      const correctAnswer = questionData.correctAnswer || "";
      const explanation = ""; // بدون ذكاء صناعي نهائياً

      const newQuestion = new Question({
        questionText: questionData.questionText,
        options: questionData.options,
        correctAnswer: correctAnswer,
        explanation: explanation || "",
        subject: questionData.subject,
        grade: questionData.grade,
        term: questionData.term,
        unit: questionData.unit,
        source: "teacher",
        generatedByAI: false,
        difficultyLevel: "متوسط",
        isValidated: false,
        score: 1,
        createdAt: new Date(),
      });

      await newQuestion.save();
      return newQuestion;
    };

    for (const questionData of questionsArray) {
      const savedQuestion = await saveQuestion(questionData);
      if (savedQuestion) {
        storedQuestions.push(savedQuestion);
      }
    }

    console.log(
      `✅ تم تخزين ${storedQuestions.length} سؤال في قاعدة البيانات.`
    );

    res.status(200).json({
      message: `✅ تم تخزين ${storedQuestions.length} سؤال بنجاح`,
      storedQuestions,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء تخزين الأسئلة:", error);
    res.status(500).json({ message: "❌ فشل في تخزين الأسئلة", error });
  }
};

// ✅ دالة تخزين امتحان المعلم
// ✅ دالة تخزين امتحان المعلم بعد التعديل للتعامل مع extractedText أو questionsArray
const saveTeacherExamToDB = async (
  res,
  data,
  file,
  grade,
  term,
  subject,
  teacherId
) => {
  try {
    const examName = "امتحان مرفوع";
    const duration = 30;
    //const teacherId = "65f1b9f9e2e2300f55b2c401"; // ← مؤقتًا، لاحقًا نجيب من الجلسة

    // ✅ التحقق من وجود teacherId
    if (!teacherId) {
      return res.status(400).json({
        message: "❌ معرف المعلم مفقود. لا يمكن إنشاء الامتحان بدون معلم.",
      });
    }

    let questions = [];

    // ✅ إذا كان data عبارة عن مصفوفة أسئلة (جاءت من Excel)
    if (Array.isArray(data)) {
      questions = data;
    }
    // ✅ إذا كان data نص (جاء من PDF أو OCR أو DOCX)
    else if (typeof data === "string") {
      const lines = data
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      let currentQuestion = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (/^\d+[-.)]/.test(line) || /[\u061F؟:…]$/.test(line)) {
          if (currentQuestion && currentQuestion.correctAnswer) {
            questions.push(currentQuestion);
          }
          currentQuestion = {
            questionText: line,
            options: [],
            correctAnswer: "",
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
        questions.push(currentQuestion);
      }
    } else {
      return res
        .status(400)
        .json({ message: "❌ نوع البيانات غير مدعوم للتحليل." });
    }

    // ✅ تحقق إذا لم يكن هناك أسئلة
    if (questions.length === 0) {
      return res.status(400).json({ message: "⚠️ لا يوجد أسئلة صالحة للحفظ." });
    }

    // ✅ إنشاء الامتحان وتخزينه في القاعدة
    const newExam = new TeacherCustomExam({
      teacherId,
      examName,
      subject,
      grade,
      term,
      duration,
      questions,
    });

    await newExam.save();

    res.status(200).json({
      message: `✅ تم تخزين الامتحان بنجاح وفيه ${questions.length} سؤال.`,
      examId: newExam._id,
      questions: questions, // ✅ أضف هذه السطر لعرض الأسئلة بعد التخزين
    });
  } catch (error) {
    console.error("❌ فشل في تخزين امتحان المعلم:", error);
    res.status(500).json({ message: "❌ خطأ أثناء تخزين الامتحان", error });
  }
};

// ✅ تصدير جميع الدوال بشكل صحيح
module.exports = {
  analyzeExamFile,
  getTeacherDashboard,
  saveQuestionsToDB,
  saveTeacherExamToDB,
};
