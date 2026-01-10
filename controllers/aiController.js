const axios = require("axios");
require("dotenv").config();
console.log(
  "🔑 OpenAI API Key:",
  process.env.OPENAI_API_KEY ? "✅ متوفر" : "❌ مفقود"
);

/**
 * ✅ دالة جديدة لجلب الشرح فقط دون تدخل الذكاء الاصطناعي في تصحيح الإجابات
 */
exports.generateExplanation = async (req, res) => {
  try {
    console.log("✅ API generate-explanation استُدعي!");
    const { questionText } = req.body;
    console.log("📥 البيانات المستقبلة:", req.body);
    if (!questionText) {
      console.error("❌ السؤال مفقود في الطلب.");
      return res.status(400).json({ error: "❌ السؤال مطلوب للحصول على شرح!" });
    }

    console.log("📡 استدعاء الذكاء الاصطناعي لجلب شرح السؤال:", questionText);

    // Check if OpenAI API key exists
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ OpenAI API Key is missing!");
      return res.status(500).json({ 
        error: "❌ OpenAI API Key is not configured. Please add OPENAI_API_KEY to .env file." 
      });
    }

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "أنت مساعد ذكي تشرح الأسئلة بطريقة مبسطة.",
          },
          {
            role: "user",
            content: `اشرح السؤال التالي بطريقة مفصلة:\n\n"${questionText}".`,
          },
        ],
        max_tokens: 250,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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
        return res.status(500).json({ 
          error: "❌ Invalid OpenAI API key. Please check your OPENAI_API_KEY in .env file." 
        });
      }
      
      throw new Error(`❌ فشل في جلب شرح السؤال من الذكاء الاصطناعي. Status: ${response?.status}`);
    }

    console.log("✅ استجابة OpenAI:", response.data);

    const explanation =
      response.data.choices[0]?.message?.content?.trim() ||
      "❌ لم يتم العثور على شرح.";

    console.log("✅ تم جلب الشرح بنجاح:", explanation);

    return res.json({ explanation });
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
    
    return res.status(500).json({ 
      error: "❌ حدث خطأ أثناء جلب شرح السؤال.",
      details: error.message 
    });
  }
};
