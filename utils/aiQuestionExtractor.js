const natural = require('natural'); // ✅ مكتبة لتحليل النصوص
const nlp = require('compromise');  // ✅ مكتبة لتحليل الكيانات
const Question = require("../models/Question"); // ✅ ربط مع نموذج الأسئلة في قاعدة البيانات

// ✅ استخراج الأسئلة من نص معين
const extractQuestions = (text) => {
    const questions = [];

    // 🧠 1. أسئلة الاختيار من متعدد (MCQs)
    const mcqPattern = /(?:اختر|حدد|أيٌّ من التالي|أي مما يلي|ما هو)\s*(.*?)\?\s*([\s\S]*?)(?:\n|$)/g;
    let match;
    while ((match = mcqPattern.exec(text)) !== null) {
        const questionText = match[1].trim();
        const options = match[2].split(/[\n,؛-]/).map(opt => opt.trim()).filter(opt => opt);
        questions.push({ type: "اختيار من متعدد", questionText, options });
    }

    // 🔗 2. أسئلة المطابقة (Matching)
    const matchingPattern = /(?:طابق|قم بمطابقة)\s*(.*?)\s*مع\s*(.*?)\s*:\s*([\s\S]*?)(?:\n|$)/g;
    while ((match = matchingPattern.exec(text)) !== null) {
        const questionText = match[1].trim();
        const pairs = match[3].split(/[\n,؛-]/).map(pair => pair.trim()).filter(pair => pair.includes("-"));
        questions.push({ type: "مطابقة", questionText, pairs });
    }

    // 📊 3. أسئلة الإجابة القصيرة (Short Answer)
    const shortAnswerPattern = /(?:أكمل|اكتب|فسر|علل)\s*(.*?)\?/g;
    while ((match = shortAnswerPattern.exec(text)) !== null) {
        questions.push({ type: "إجابة قصيرة", questionText: match[1].trim() });
    }

    // 📝 4. أسئلة المقال (Essay Questions)
    const essayPattern = /(?:ناقش|حلل|وضح|اكتب مقالًا عن)\s*(.*?)\./g;
    while ((match = essayPattern.exec(text)) !== null) {
        questions.push({ type: "مقال", questionText: match[1].trim() });
    }

    // 📍 5. أسئلة ترتيب الأحداث (Event Sequencing)
    const orderingPattern = /(?:رتب الأحداث|رتب الخطوات)\s*(.*?)\s*بالترتيب\s*([\s\S]*?)(?:\n|$)/g;
    while ((match = orderingPattern.exec(text)) !== null) {
        const items = match[2].split(/[\n,؛-]/).map(item => item.trim()).filter(item => item);
        questions.push({ type: "ترتيب", questionText: match[1].trim(), items });
    }

    // 🧩 6. أسئلة تحليل الكود (Code Analysis)
    const codePattern = /(?:ما هو ناتج الكود التالي|اشرح الكود التالي)\s*```([\s\S]*?)```/gs;
    while ((match = codePattern.exec(text)) !== null) {
        questions.push({ type: "تحليل كود", questionText: "اشرح الكود التالي", code: match[1].trim() });
    }

    // ✅ 7. أسئلة صح أو خطأ (True/False)
    const tfPattern = /(.*?)(?:صح أم خطأ|True or False):?\s*(صح|خطأ|True|False)/gi;
    while ((match = tfPattern.exec(text)) !== null) {
        questions.push({
            type: "صح أم خطأ",
            questionText: match[1].trim(),
            correctAnswer: match[2].toLowerCase()
        });
    }

    // ✅ 8. أسئلة ملء الفراغ (Fill in the Blanks)
    const fillBlanksPattern = /(.*?)\s*(___+|…+|\[.*?\])/g;
    while ((match = fillBlanksPattern.exec(text)) !== null) {
        questions.push({
            type: "ملء الفراغ",
            questionText: match[1].trim(),
            blank: match[2].trim()
        });
    }

    return questions;
};

module.exports = { extractQuestions };
