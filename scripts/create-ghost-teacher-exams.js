require("dotenv").config();
const mongoose = require("mongoose");
const TeacherCustomExam = require("../models/TeacherCustomExam");
const Teacher = require("../models/Teacher");
const { ghostTeacherId } = require("../config/ghostTeacher");

async function connect() {
  if (mongoose.connection.readyState === 1) {
    console.log("✅ Already connected to MongoDB");
    return;
  }
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set in .env");
  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");
}

async function disconnect() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  }
}

async function createGhostTeacherExams() {
  try {
    await connect();

    // ✅ التحقق من وجود Ghost Teacher
    const ghostTeacher = await Teacher.findById(ghostTeacherId);
    if (!ghostTeacher) {
      console.error("❌ Ghost Teacher not found with ID:", ghostTeacherId);
      console.log("💡 Please ensure the Ghost Teacher exists in the database");
      process.exit(1);
    }

    console.log("✅ Found Ghost Teacher:", ghostTeacher.name);

    // ✅ التحقق من وجود امتحانات مسبقاً
    const existingExams = await TeacherCustomExam.find({ teacherId: ghostTeacherId });
    console.log(`📊 Found ${existingExams.length} existing exams for Ghost Teacher`);

    // ✅ إنشاء 3 امتحانات تجريبية
    const sampleExams = [
      {
        teacherId: ghostTeacherId,
        examName: "امتحان تجريبي - الرياضيات - الوحدة الأولى",
        subject: "الرياضيات",
        grade: "الصف العاشر",
        term: "الفصل الأول",
        duration: 45,
        questions: [
          {
            questionText: "ما هو ناتج جمع 5 + 7؟",
            options: ["10", "11", "12", "13"],
            correctAnswer: "12"
          },
          {
            questionText: "ما هو ناتج ضرب 6 × 8؟",
            options: ["42", "46", "48", "50"],
            correctAnswer: "48"
          },
          {
            questionText: "ما هو الجذر التربيعي للعدد 16؟",
            options: ["2", "3", "4", "5"],
            correctAnswer: "4"
          },
          {
            questionText: "ما هو محيط المربع الذي طول ضلعه 5 سم؟",
            options: ["15 سم", "20 سم", "25 سم", "30 سم"],
            correctAnswer: "20 سم"
          },
          {
            questionText: "ما هو مساحة المستطيل الذي طوله 6 سم وعرضه 4 سم؟",
            options: ["20 سم²", "24 سم²", "28 سم²", "30 سم²"],
            correctAnswer: "24 سم²"
          }
        ]
      },
      {
        teacherId: ghostTeacherId,
        examName: "امتحان تجريبي - اللغة العربية - النحو",
        subject: "اللغة العربية",
        grade: "الصف العاشر",
        term: "الفصل الأول",
        duration: 40,
        questions: [
          {
            questionText: "ما هو إعراب كلمة 'الطالب' في جملة 'جاء الطالب'؟",
            options: ["فاعل", "مفعول به", "مبتدأ", "خبر"],
            correctAnswer: "فاعل"
          },
          {
            questionText: "ما هو نوع الجملة 'السماء صافية'؟",
            options: ["جملة فعلية", "جملة اسمية", "جملة شرطية", "جملة استفهامية"],
            correctAnswer: "جملة اسمية"
          },
          {
            questionText: "ما هو جمع كلمة 'معلم'؟",
            options: ["معلمون", "معلمين", "معلمات", "معلم"],
            correctAnswer: "معلمون"
          },
          {
            questionText: "ما هو المفعول به في جملة 'قرأ الطالب الكتاب'؟",
            options: ["الطالب", "الكتاب", "قرأ", "لا يوجد"],
            correctAnswer: "الكتاب"
          },
          {
            questionText: "ما هو نوع الهمزة في كلمة 'أكل'؟",
            options: ["همزة قطع", "همزة وصل", "همزة متوسطة", "همزة طرفية"],
            correctAnswer: "همزة قطع"
          }
        ]
      },
      {
        teacherId: ghostTeacherId,
        examName: "امتحان تجريبي - العلوم - الفصل الأول",
        subject: "العلوم",
        grade: "الصف العاشر",
        term: "الفصل الأول",
        duration: 50,
        questions: [
          {
            questionText: "ما هو العضو المسؤول عن ضخ الدم في جسم الإنسان؟",
            options: ["الرئتان", "القلب", "الكبد", "الكلية"],
            correctAnswer: "القلب"
          },
          {
            questionText: "ما هو الغاز الذي نتنفسه؟",
            options: ["الأكسجين", "ثاني أكسيد الكربون", "النيتروجين", "الهيدروجين"],
            correctAnswer: "الأكسجين"
          },
          {
            questionText: "ما هو عدد الكروموسومات في الخلية البشرية؟",
            options: ["23", "46", "44", "48"],
            correctAnswer: "46"
          },
          {
            questionText: "ما هو أكبر كوكب في المجموعة الشمسية؟",
            options: ["الأرض", "المشتري", "زحل", "نبتون"],
            correctAnswer: "المشتري"
          },
          {
            questionText: "ما هو العنصر الكيميائي الذي رمزه H؟",
            options: ["الهيليوم", "الهيدروجين", "الحديد", "الذهب"],
            correctAnswer: "الهيدروجين"
          }
        ]
      }
    ];

    // ✅ إنشاء الامتحانات
    const createdExams = [];
    for (const examData of sampleExams) {
      // ✅ التحقق من عدم وجود امتحان بنفس الاسم
      const existing = await TeacherCustomExam.findOne({
        teacherId: ghostTeacherId,
        examName: examData.examName
      });

      if (existing) {
        console.log(`⚠️ Exam "${examData.examName}" already exists, skipping...`);
        continue;
      }

      const exam = await TeacherCustomExam.create(examData);
      createdExams.push(exam);
      console.log(`✅ Created exam: ${exam.examName}`);
    }

    // ✅ تحديث عداد الامتحانات للمعلم
    if (createdExams.length > 0) {
      await Teacher.findByIdAndUpdate(ghostTeacherId, {
        $inc: { "currentUsage.examsCount": createdExams.length }
      });
      console.log(`✅ Updated exam count for Ghost Teacher (+${createdExams.length})`);
    }

    console.log(`\n✅ Successfully created ${createdExams.length} sample exams for Ghost Teacher`);
    console.log(`📊 Total exams for Ghost Teacher: ${existingExams.length + createdExams.length}`);

    await disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating Ghost Teacher exams:", error);
    await disconnect();
    process.exit(1);
  }
}

// ✅ تشغيل السكريبت
createGhostTeacherExams();

