const OpenAI = require("openai");

// ✅ تهيئة OpenAI API
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * ✅ تحليل السؤال واستخراج الإجابة الصحيحة تلقائيًا باستخدام الذكاء الاصطناعي
 * @param {string} questionText - نص السؤال
 * @param {string[]} options - قائمة الخيارات المتاحة
 * @returns {Promise<{ correctAnswer: string, explanation: string }>} - الإجابة الصحيحة مع التحليل
 */
const determineCorrectAnswer = async (questionText, options) => {
  if (!questionText || options.length === 0) return { correctAnswer: "", explanation: "" };

  try {
    console.log(`🤖 تحليل الإجابة الصحيحة باستخدام الذكاء الاصطناعي: ${questionText}`);

    // ✅ إرسال الطلب إلى OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "أنت مساعد تعليمي متطور، تساعد في تحليل الأسئلة واختيار الإجابة الصحيحة مع تقديم تفسير لها." },
        { role: "user", content: `السؤال: "${questionText}"\nالخيارات: ${options.join(", ")}\nما هي الإجابة الصحيحة ولماذا؟` },
      ],
      max_tokens: 100,
    });

    const aiResponse = response.choices[0].message.content.trim();

    // ✅ فصل الإجابة الصحيحة عن التفسير
    let [correctAnswer, ...explanationParts] = aiResponse.split("\n");
    let explanation = explanationParts.join(" ").trim();

    return {
      correctAnswer: correctAnswer || "",
      explanation: explanation || "لا يوجد تحليل متاح حاليًا.",
    };
  } catch (error) {
    console.error("❌ خطأ في تحليل الإجابة الصحيحة:", error);
    return { correctAnswer: "", explanation: "لم يتمكن الذكاء الاصطناعي من تحديد الإجابة." };
  }
};

module.exports = { determineCorrectAnswer };
