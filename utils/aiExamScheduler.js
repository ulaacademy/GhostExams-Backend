const schedule = require("node-schedule");
const AiGeneratedExam = require("../models/AiGeneratedExam");
const Question = require("../models/Question");
const { generateAIQuestions } = require("../utils/aiQuestionGenerator");

/**
 * 🔹 **تحليل الأسئلة وتوليد امتحانات ذكاء اصطناعي بشكل دوري**
 */
const analyzeAndGenerateAIExams = async () => {
    try {
        console.log("🚀 [Scheduler] بدء تحليل الأسئلة لتوليد الامتحانات الذكية...");

        // جلب جميع الصفوف والمراحل الدراسية المتاحة
        const uniqueSubjects = await Question.distinct("subject");
        const uniqueGrades = await Question.distinct("grade");
        const uniqueTerms = await Question.distinct("term");

        for (const subject of uniqueSubjects) {
            for (const grade of uniqueGrades) {
                for (const term of uniqueTerms) {
                    console.log(`🔹 [AI Exam] تحليل ${subject} - ${grade} - ${term}`);

                    // جلب جميع الأسئلة المتاحة لهذه الفئة
                    const existingQuestions = await Question.find({ grade, term, subject });

                    if (!existingQuestions.length) {
                        console.log(`⚠️ [AI Exam] لا توجد أسئلة متاحة لـ ${subject} - ${grade} - ${term}`);
                        continue;
                    }

                    // توليد 10 أسئلة جديدة عبر الذكاء الاصطناعي
                    const aiGeneratedQuestions = await generateAIQuestions(existingQuestions, 10);

                    // إنشاء امتحان جديد
                    const newExam = new AiGeneratedExam({
                        grade,
                        term,
                        subject,
                        questions: aiGeneratedQuestions,
                        createdAt: new Date()
                    });

                    // حفظ الامتحان في قاعدة البيانات
                    await newExam.save();
                    console.log(`✅ [AI Exam] تم إنشاء امتحان ذكاء اصطناعي لـ ${subject} - ${grade} - ${term}`);
                }
            }
        }

        console.log("✅ [Scheduler] تم الانتهاء من توليد الامتحانات الذكية.");

    } catch (error) {
        console.error("❌ [Scheduler] حدث خطأ أثناء تحليل الأسئلة وتوليد الامتحانات:", error);
    }
};

/**
 * ⏳ **جدولة المهمة اليومية لتشغيل التحليل وتوليد الامتحانات**
 */
const scheduleAIExamGeneration = () => {
    console.log("⏳ [Scheduler] جدولة مهمة توليد الامتحانات الذكية...");
    
    // تنفيذ المهمة يوميًا عند الساعة 2 صباحًا
    schedule.scheduleJob("0 2 * * *", () => {
        console.log("⏳ [Scheduler] بدء توليد الامتحانات الذكية تلقائيًا...");
        analyzeAndGenerateAIExams();
    });

    console.log("✅ [Scheduler] تم جدولة توليد الامتحانات الذكية يوميًا عند الساعة 2 صباحًا.");
};

// بدء الجدولة تلقائيًا عند تشغيل السيرفر
scheduleAIExamGeneration();

module.exports = { analyzeAndGenerateAIExams, scheduleAIExamGeneration };
