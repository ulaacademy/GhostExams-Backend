const express = require("express");
const router = express.Router();
const Question = require("../models/Question");
const Exam = require("../models/Exam");

// ✅ إنشاء امتحان عشوائي
router.post("/generate", async (req, res) => {
    try {
        const { grade, subject, unit, numOfQuestions, difficultyLevel } = req.body;

        if (!grade || !subject || !unit || !numOfQuestions) {
            return res.status(400).json({ message: "❌ جميع الحقول مطلوبة: الصف، المادة، الوحدة، وعدد الأسئلة." });
        }

        // ✅ البحث عن الأسئلة بناءً على المعايير المحددة
        const query = {
            grade,
            subject,
            unit,
            isValidated: true // ✅ استخدام الأسئلة التي تم التحقق منها فقط
        };

        if (difficultyLevel) {
            query.difficultyLevel = difficultyLevel;
        }

        const questions = await Question.find(query).limit(numOfQuestions);

        if (questions.length < numOfQuestions) {
            return res.status(400).json({ message: "❌ لا توجد أسئلة كافية لتوليد الامتحان." });
        }

        // ✅ إنشاء امتحان جديد
        const newExam = new Exam({
            title: `امتحان عشوائي - ${subject}`,
            grade,
            subject,
            unit,
            questions: questions.map(q => q._id),
            createdAt: new Date(),
        });

        await newExam.save();

        res.status(201).json({ message: "✅ تم إنشاء الامتحان بنجاح", exam: newExam });
    } catch (error) {
        console.error("❌ خطأ أثناء إنشاء الامتحان:", error);
        res.status(500).json({ message: "❌ حدث خطأ أثناء إنشاء الامتحان.", error: error.message });
    }
});

module.exports = router;
