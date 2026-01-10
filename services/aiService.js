require("dotenv").config();
console.log("📡 مفتاح API من .env:", process.env.OPENAI_API_KEY);

const axios = require("axios");

// ✅ استدعاء متغيرات البيئة
const AI_API_URL =
  process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ✅ التحقق من أن مفتاح API موجود قبل تنفيذ أي طلب
if (!OPENAI_API_KEY) {
  console.error("❌ خطأ: مفتاح API غير موجود. تأكد من إضافته في ملف .env");
  process.exit(1); // إيقاف التنفيذ إذا لم يكن المفتاح موجودًا
}

/**
 * ✅ جلب شرح السؤال فقط باستخدام الذكاء الاصطناعي
 * @param {string} questionText - نص السؤال المطلوب شرحه
 * @returns {Promise<{ explanation: string }>} - شرح السؤال
 */
const fetchAIExplanation = async (questionText) => {
  try {
    console.log(`🚀 استدعاء الذكاء الاصطناعي لجلب الشرح للسؤال: "${questionText}"`);

    const response = await axios.post(
      AI_API_URL,
      {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "أنت مساعد تعليمي يقدم شروحات مفصلة للأسئلة.",
          },
          { role: "user", content: `اشرح السؤال التالي بطريقة مفصلة: \n\n"${questionText}".` },
        ],
        max_tokens: 250,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        validateStatus: function (status) {
          return status < 500; // Resolve only if status code is less than 500
        },
      }
    );

    if (!response || !response.status || response.status !== 200) {
      console.error("❌ OpenAI API Error:", {
        status: response?.status,
        statusText: response?.statusText,
        data: response?.data
      });
      
      if (response?.status === 401) {
        throw new Error("❌ Invalid OpenAI API key. Please check your OPENAI_API_KEY in .env file.");
      }
      
      throw new Error(`❌ فشل في جلب شرح السؤال من الذكاء الاصطناعي. Status: ${response?.status}`);
    }

    const explanation = response.data.choices[0]?.message?.content?.trim() || "❌ لم يتم العثور على شرح.";
    console.log("✅ تم جلب الشرح بنجاح:", explanation);

    return { explanation };
  } catch (error) {
    console.error("❌ خطأ أثناء جلب شرح السؤال:", error);
    
    // Enhanced error logging
    if (error.response) {
      console.error("❌ Response error:", {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      console.error("❌ Request error: No response received", error.message);
    } else {
      console.error("❌ Error:", error.message);
    }
    
    return { explanation: "❌ حدث خطأ أثناء جلب الشرح." };
  }
};

module.exports = { fetchAIExplanation };
