const OpenAI = require("openai");
require("dotenv").config();
//const { generateAIQuestions } = require("../utils/aiQuestionGenerator");
const generateAIQuestions = require("../utils/aiQuestionGenerator");
const Question = require("../models/Question");

// 🛠️ إعداد OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 🎯 توليد خيارات للإجابة مع توزيع الإجابة الصحيحة عشوائيًا
 * @param {string} correctAnswer - الإجابة الصحيحة
 * @param {string} questionText - نص السؤال لتوليد خيارات منطقية
 * @returns {Array} قائمة بالخيارات (4 خيارات تشمل الإجابة الصحيحة)
 */
exports.generateOptions = (correctAnswer, questionText) => {
  if (
    !correctAnswer ||
    typeof correctAnswer !== "string" ||
    correctAnswer.trim() === ""
  ) {
    console.warn("⚠️ [Options Generator] الإجابة الصحيحة غير صالحة.");
    return [];
  }

  console.log(`🔹 [Options Generator] توليد خيارات لسؤال: ${questionText}`);

  let incorrectOptions = new Set(); // استخدام Set لمنع التكرار

  // ✅ توليد خيارات بناءً على نوع الإجابة الصحيحة
  if (!isNaN(correctAnswer)) {
    // 📌 إذا كانت الإجابة الصحيحة رقمًا، يتم توليد خيارات قريبة ومنطقية
    const correctNum = Number(correctAnswer);
    while (incorrectOptions.size < 3) {
      let variation = correctNum + (Math.floor(Math.random() * 5) - 2); // أرقام قريبة
      if (variation !== correctNum && variation > 0) {
        incorrectOptions.add(variation.toString());
      }
    }
  } else {
    // 📌 إذا كانت الإجابة نصية، توليد خيارات ذات صلة بالسؤال
    const distractorsBank = {
      التسامح: ["الغضب", "الحقد", "الانتقام"],
      الصبر: ["الاستعجال", "الجزع", "التوتر"],
      الكرم: ["البخل", "الشح", "الأنانية"],
      العلم: ["الجهل", "الغفلة", "النسيان"],
      الصدق: ["الكذب", "النفاق", "الرياء"],
      الإيمان: ["الكفر", "الشك", "النفاق"],
      الأخلاق: ["الفساد", "الإهمال", "الكذب"],
      التعاون: ["الأنانية", "العزلة", "الكسل"],
      الماء: ["الهواء", "التراب", "النار"],
      الشمس: ["القمر", "النجوم", "الضوء"],
      السيارة: ["الدراجة", "الحافلة", "الطائرة"],
    };

    // ✅ اختيار مرادفات أو مضادات إذا كانت متوفرة
    if (distractorsBank[correctAnswer]) {
      incorrectOptions = new Set(distractorsBank[correctAnswer]);
    } else {
      // ✅ إذا لم تكن الإجابة موجودة في البنك، نستخدم الذكاء الاصطناعي أو نولد خيارات عشوائية
      let randomWords = ["غير صحيح 1", "غير صحيح 2", "غير صحيح 3"];

      if (questionText.includes("لون")) {
        randomWords = ["أحمر", "أخضر", "أزرق"];
      } else if (questionText.includes("مدينة")) {
        randomWords = ["القاهرة", "دمشق", "بغداد"];
      } else if (questionText.includes("حيوان")) {
        randomWords = ["قط", "كلب", "حصان"];
      }

      incorrectOptions = new Set(randomWords);
    }
  }

  // ✅ التأكد من وجود 3 خيارات فقط وعدم تكرار الإجابة الصحيحة
  let options = Array.from(incorrectOptions).slice(0, 3);
  options.push(correctAnswer); // ✅ إضافة الإجابة الصحيحة

  // 🔀 خلط ترتيب الخيارات عشوائيًا بحيث لا تكون الإجابة الصحيحة في نفس المكان دائمًا
  options = shuffleOptions(options);

  console.log(`✅ [Options Generator] خيارات السؤال: ${options}`);
  return options;
};

/**
 * ✅ **توليد أسئلة جديدة باستخدام الذكاء الاصطناعي**
 * @param {Array} existingQuestions - قائمة الأسئلة المتاحة لتحليلها
 * @param {number} numQuestions - عدد الأسئلة المطلوبة
 * @param {string} subject - المادة الدراسية
 * @param {string} grade - الصف الدراسي
 * @param {string} term - الفصل الدراسي
 * @returns {Promise<Array>} قائمة بالأسئلة المُنشأة
 */
exports.generateAIQuestions = async (
  existingQuestions,
  numQuestions = 10,
  subject,
  grade,
  term
) => {
  try {
    // ✅ التحقق من القيم المدخلة وضمان عدم تمرير قيم غير صالحة
    if (!Array.isArray(existingQuestions) || existingQuestions.length === 0) {
      console.warn("⚠️ [AI Generator] لا توجد أسئلة متاحة لتحليلها.");
      return [];
    }

    const validSubject = subject?.trim() || "غير محدد";
    const validGrade = grade?.trim() || "غير محدد";
    const validTerm = term?.trim() || "غير محدد";

    console.log(
      `🔹 [AI Generator] تحليل ${existingQuestions.length} سؤالًا لتوليد ${numQuestions} أسئلة جديدة...`
    );

    // 🔹 تحويل الأسئلة المتاحة إلى نص قابل للتحليل
    const formattedQuestions = existingQuestions
      .map(
        (q, index) => `${index + 1}. ${q.questionText || "❌ سؤال غير متاح"}`
      )
      .join("\n");

    // 📝 تعليمات الذكاء الاصطناعي لإنشاء الأسئلة الجديدة
    const prompt = `
    لديك مجموعة من الأسئلة المأخوذة من امتحانات مدرسية وكتب تعليمية. قم بتحليل الأنماط وإنشاء ${numQuestions} أسئلة جديدة مشابهة ولكن غير مكررة.

    **يجب أن تكون الأسئلة ضمن هذه المادة والصف الدراسي والفصل الدراسي:**
    - المادة: ${validSubject}
    - الصف: ${validGrade}
    - الفصل: ${validTerm}

    **الأسئلة المتاحة لتحليلها:**
    ${formattedQuestions}

    **التنسيق المطلوب (JSON فقط بدون أي تفسيرات أخرى):**
   [
  {
    "questionText": "ما هو حاصل ضرب 7 × 8؟",
    "correctAnswer": "56",
    "options": ["56", "49", "64", "48"],
    "questionType": "mcq",
    "difficulty": "متوسط",
    "source": "AI",
    "subject": "${subject}",
    "grade": "${grade}",
    "term": "${term}"
  }
]


⚠️ تأكد من أن:
- كل سؤال يحتوي على إجابة صحيحة (\`correctAnswer\`) واضحة.
- لا توجد أسئلة تحتوي على "غير محدد" أو "undefined".
- يجب أن يكون نوع السؤال إما "mcq"، "truefalse"، أو "short answer".
- يجب أن يكون الإخراج بصيغة JSON صالح بدون أي تعليقات أو نصوص إضافية!
`;

    // 🔥 طلب OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "system", content: prompt }],
      max_tokens: 2500,
      temperature: 0.7,
    });

    let rawText = response.choices[0].message.content.trim();

    // 🔍 تنظيف النص المستلم من OpenAI
    rawText = rawText.replace(/```json|```/g, "").trim();

    console.log("🔹 JSON المستلم من OpenAI:", rawText);

    try {
      let generatedQuestions = JSON.parse(rawText);

      // تأكد أن البيانات المستلمة عبارة عن مصفوفة
      if (!Array.isArray(generatedQuestions)) {
        throw new Error("البيانات المستلمة ليست مصفوفة JSON صحيحة.");
      }

      return generatedQuestions;
    } catch (error) {
      console.error("❌ [AI Generator] خطأ أثناء تحليل JSON:", error);
      return [];
    }
  } catch (error) {
    console.error("❌ [AI Generator] خطأ في توليد الأسئلة:", error);
    return [];
  }
};

/**
 * 🎯 جلب الأسئلة الحالية من قاعدة البيانات
 * @param {string} subject - المادة الدراسية
 * @param {string} grade - الصف الدراسي
 * @param {string} term - الفصل الدراسي
 * @param {number} limit - عدد الأسئلة المطلوب جلبها (افتراضي: 10)
 * @returns {Promise<Array>} قائمة بالأسئلة المخزنة في قاعدة البيانات
 */
exports.fetchExistingQuestions = async (subject, grade, term, limit = 10) => {
  try {
    console.log(`📡 [Database] جلب ${limit} أسئلة من قاعدة البيانات...`);

    // ✅ التحقق من صحة القيم وتمرير قيم افتراضية عند الحاجة
    const validSubject =
      subject && typeof subject === "string" && subject.trim() !== ""
        ? subject.trim()
        : null;
    const validGrade =
      grade && typeof grade === "string" && grade.trim() !== ""
        ? grade.trim()
        : null;
    const validTerm =
      term && typeof term === "string" && term.trim() !== ""
        ? term.trim()
        : null;

    // ✅ إنشاء شرط البحث الديناميكي لتجنب البحث بمدخلات غير صالحة
    let query = {};
    if (validSubject) query.subject = validSubject;
    if (validGrade) query.grade = validGrade;
    if (validTerm) query.term = validTerm;

    console.log(`🔍 [Database] البحث باستخدام الفلاتر:`, query);

    // 🛠️ البحث عن الأسئلة في قاعدة البيانات بناءً على الفلاتر المحددة
    const questions = await Question.find(query).limit(limit).lean(); // تحويل النتائج إلى كائنات JavaScript عادية

    if (!questions || questions.length === 0) {
      console.warn("⚠️ [Database] لم يتم العثور على أسئلة مطابقة.");
      return [];
    }

    console.log(`✅ [Database] تم العثور على ${questions.length} أسئلة.`);
    return questions;
  } catch (error) {
    console.error("❌ [Database] خطأ أثناء جلب الأسئلة:", error);
    return [];
  }
};

/**
 * 🎯 التحقق من صحة الأسئلة وتصفيتها
 * @param {Array} questions - قائمة الأسئلة للتحقق منها
 * @returns {Array} قائمة بالأسئلة الصحيحة فقط بعد التحقق منها
 */
exports.validateQuestions = (questions) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    console.warn("⚠️ [Validation] لا توجد أسئلة للتحقق منها.");
    return [];
  }

  console.log(`🔍 [Validation] التحقق من صحة ${questions.length} سؤالًا...`);

  // الأنواع المسموح بها للأسئلة
  const validQuestionTypes = ["mcq", "truefalse", "short answer"];

  // تصفية الأسئلة غير الصالحة
  const validQuestions = questions.filter((question) => {
    if (
      !question.questionText || // السؤال يجب أن يكون له نص
      !question.correctAnswer || // يجب أن يكون هناك إجابة صحيحة
      typeof question.correctAnswer !== "string" || // الإجابة الصحيحة يجب أن تكون نصًا
      question.correctAnswer.trim() === "" || // التأكد من عدم وجود إجابة فارغة
      !validQuestionTypes.includes(question.questionType) || // نوع السؤال يجب أن يكون ضمن الأنواع المسموح بها
      ["غير محدد", "undefined", "غير معروف", "null", "بدون إجابة"].includes(
        question.correctAnswer.toLowerCase()
      ) || // تجنب الأسئلة التي تحتوي على إجابات غير صحيحة
      (question.questionType === "mcq" &&
        (!Array.isArray(question.options) ||
          question.options.length !== 4 ||
          !question.options.includes(question.correctAnswer))) // يجب أن يحتوي MCQ على 4 خيارات وأن تكون الإجابة الصحيحة ضمنها
    ) {
      console.warn("🚨 [Validation] سؤال غير صالح، تم تجاهله:", question);
      return false;
    }

    return true;
  });

  console.log(
    `✅ [Validation] تم التحقق من صحة ${validQuestions.length} أسئلة.`
  );
  return validQuestions;
};

/**
 * 🛠️ دالة خلط عشوائي باستخدام خوارزمية Fisher-Yates Shuffle
 * @param {Array} array - مصفوفة ليتم خلطها
 * @returns {Array} - المصفوفة بعد الخلط العشوائي
 */
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};
/**
 * 🎲 خلط ترتيب الخيارات عشوائيًا مع ضمان توزيع الإجابة الصحيحة بشكل عادل
 * @param {Array} options - قائمة الخيارات (يجب أن تحتوي على الإجابة الصحيحة)
 * @returns {Array} قائمة الخيارات بعد خلطها
 */
exports.shuffleOptions = (options) => {
  if (!Array.isArray(options) || options.length !== 4) {
    console.warn("⚠️ [Shuffle Options] عدد الخيارات غير صالح. يجب أن تكون 4.");
    return options;
  }

  console.log(`🔄 [Shuffle Options] قبل الخلط: ${options}`);

  // ✅ تنفيذ خوارزمية Fisher-Yates Shuffle لضمان التوزيع العشوائي العادل
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  // ✅ التأكد من أن الإجابة الصحيحة ليست دائمًا في نفس الموقع
  const correctAnswer = options.find((option) => option.isCorrect);
  const correctIndex = options.indexOf(correctAnswer);

  // 📌 إذا كانت الإجابة الصحيحة في الموضع الأخير بشكل متكرر، نحركها للأمام عشوائيًا
  if (correctIndex === options.length - 1) {
    const swapIndex = Math.floor(Math.random() * 3); // أي موقع بين 0 و 2
    [options[correctIndex], options[swapIndex]] = [
      options[swapIndex],
      options[correctIndex],
    ];
  }

  console.log(`✅ [Shuffle Options] بعد الخلط: ${options}`);
  return options;
};

/**
 * 🛠️ حفظ الأسئلة في قاعدة البيانات
 * @param {Array} questions - قائمة الأسئلة التي سيتم حفظها
 * @returns {Promise<void>}
 */
exports.saveQuestionsToDatabase = async (questions) => {
  try {
    if (!Array.isArray(questions) || questions.length === 0) {
      console.warn("⚠️ [Database] لا توجد أسئلة لحفظها.");
      return;
    }

    console.log(
      `💾 [Database] جاري حفظ ${questions.length} سؤالًا في قاعدة البيانات...`
    );

    for (const question of questions) {
      // التأكد من أن السؤال يحتوي على البيانات الأساسية
      if (
        !question.questionText ||
        !question.correctAnswer ||
        !question.questionType
      ) {
        console.warn("⚠️ [Database] سؤال غير مكتمل، تم تجاهله:", question);
        continue;
      }

      // التحقق من أن الأسئلة من النوع الصحيح (MCQ، True/False، Short Answer)
      const validTypes = ["mcq", "truefalse", "short answer"];
      if (!validTypes.includes(question.questionType)) {
        console.warn(
          "⚠️ [Database] نوع السؤال غير مدعوم، تم تجاهله:",
          question
        );
        continue;
      }

      // حفظ السؤال في قاعدة البيانات أو تحديثه إذا كان موجودًا بالفعل
      await Question.updateOne(
        { questionText: question.questionText }, // البحث عن السؤال إذا كان موجودًا مسبقًا
        { $set: question }, // تحديث البيانات أو إضافتها
        { upsert: true } // إدراج السؤال إذا لم يكن موجودًا مسبقًا
      );
    }

    console.log(`✅ [Database] تم حفظ جميع الأسئلة بنجاح.`);
  } catch (error) {
    console.error(
      "❌ [Database] خطأ أثناء حفظ الأسئلة في قاعدة البيانات:",
      error
    );
  }
};
