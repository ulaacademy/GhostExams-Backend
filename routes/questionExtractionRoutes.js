// ✅ questionExtractionRoutes.js
const express = require("express");
const { extractQuestions } = require("../utils/questionExtraction"); // ✅ الخوارزمية اليدوية
const { PythonShell } = require("python-shell"); // ✅ لاستدعاء سكربت Python
const path = require("path");
const { getExamFromS3 } = require("../services/s3"); // ✅ استدعاء وظائف S3

const router = express.Router();

// ✅ فحص صحة الاتصال بالـ API
router.get("/test", (req, res) => {
    res.status(200).json({ message: "✅ API يعمل بشكل صحيح!" });
});

// ✅ API لتحليل النصوص واستخراج الأسئلة (يدوي + ذكاء اصطناعي)
router.post("/extract", async (req, res) => {
    try {
        const { text, useAI = false } = req.body; // ✅ دعم خيار استخدام الذكاء الاصطناعي

        console.log("📥 [REQUEST RECEIVED]:", req.body);  // ✅ سجل الطلب المستلم

        // ✅ التحقق من وجود النص المدخل
        if (!text || typeof text !== 'string' || text.trim() === '') {
            console.log("❌ [VALIDATION FAILED]: No valid text provided.");
            return res.status(400).json({ message: "❌ يرجى إدخال نص صالح للتحليل." });
        }

        console.log(useAI ? "🤖 [AI MODE]: Starting AI text analysis..." : "🔍 [MANUAL MODE]: Using manual extraction algorithm...");

        if (useAI) {
            // ✅ إعدادات استدعاء نموذج الذكاء الاصطناعي
            const options = {
                mode: "json", // ✅ التعامل مع البيانات بتنسيق JSON
                pythonPath: "py",  // ✅ تأكد من صحة المسار
                scriptPath: path.join(__dirname, "../utils"), // ✅ مسار سكربت Python
                pythonOptions: ["-u"], // ✅ منع تخزين الكاش
                encoding: "utf-8", // ✅ ضبط الترميز على UTF-8
                args: [JSON.stringify({ text: text })] // ✅ تمرير البيانات كوسيط (Argument)
            };

            console.log("🚀 [PYTHON CALL]: Running Python script with args:", options.args);

            const pyshell = new PythonShell("run_model.py", options);

            pyshell.on("message", (message) => {
                console.log("📥 [PYTHON RESPONSE]:", message);
                res.status(200).json({
                    message: "✅ تم تحليل النص بنجاح باستخدام الذكاء الاصطناعي.",
                    data: message
                });
            });

            pyshell.end((err, code, signal) => {
                if (err) {
                    console.error("❌ [PYTHON ERROR]:", err);
                    return res.status(500).json({
                        message: "❌ حدث خطأ أثناء تحليل النص باستخدام الذكاء الاصطناعي.",
                        error: err.message
                    });
                }
                console.log(`✅ [PYTHON ENDED]: Process exited with code ${code} and signal ${signal}`);
            });

        } else {
            // ✅ استخدام الخوارزمية اليدوية التقليدية
            console.log("🔍 [MANUAL EXTRACTION]: Starting manual question extraction...");
            const questions = extractQuestions(text);

            if (questions.length === 0) {
                console.log("⚠️ [NO QUESTIONS FOUND]: No questions extracted.");
                return res.status(404).json({ message: "❌ لم يتم العثور على أي أسئلة في النص المدخل." });
            }

            console.log("✅ [EXTRACTION SUCCESS]: Questions extracted successfully.");
            return res.status(200).json({
                message: "✅ تم استخراج الأسئلة بنجاح باستخدام الخوارزمية التقليدية.",
                count: questions.length,
                questions
            });
        }

    } catch (error) {
        console.error("❌ [GENERAL ERROR]:", error);
        res.status(500).json({
            message: "❌ حدث خطأ أثناء استخراج الأسئلة.",
            error: error.message
        });
    }
});

// ✅ API لجلب الامتحانات من AWS S3
router.get("/fetch-exam", async (req, res) => {
    try {
        const { section, grade, term, subject, examName } = req.query;

        if (!section || !grade || !term || !subject || !examName) {
            return res.status(400).json({ message: "❌ جميع المعلمات مطلوبة." });
        }

        const examData = await getExamFromS3(section, grade, term, subject, examName);
        res.status(200).json({
            message: "✅ تم جلب الامتحان بنجاح.",
            data: examData
        });
    } catch (error) {
        console.error("❌ [FETCH EXAM ERROR]:", error);
        res.status(500).json({
            message: "❌ حدث خطأ أثناء جلب الامتحان من S3.",
            error: error.message
        });
    }
});

module.exports = router;
