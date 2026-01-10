require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Import all models
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const School = require("../models/School");
const User = require("../models/User");
const Exam = require("../models/Exam");
const Question = require("../models/Question");
const QuestionBank = require("../models/QuestionBank");
const ExamResult = require("../models/ExamResult");
const StudentAnswer = require("../models/StudentAnswer");
const TeacherStudentSubscription = require("../models/TeacherStudentSubscription");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const Coupon = require("../models/Coupon");
const StudentPerformance = require("../models/StudentPerformance");
const ExamPattern = require("../models/ExamPattern");
const MinistryExam = require("../models/MinistryExam");
const SimulationExam = require("../models/SimulationExam");
const AiGeneratedExam = require("../models/AiGeneratedExam");
const GeneratedExam = require("../models/GeneratedExam");
const ExtractedQuestion = require("../models/ExtractedQuestion");
const TeacherCustomExam = require("../models/TeacherCustomExam");
const TeacherManualExam = require("../models/TeacherManualExam");
const TeacherExamResult = require("../models/TeacherExamResult");
const ExamLog = require("../models/ExamLog");
const BookContent = require("../models/BookContent");
const MinistryExamSession = require("../models/MinistryExamSession");
const Books = require("../models/Books");

async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

async function connect() {
  // Only connect if not already connected
  if (mongoose.connection.readyState === 1) {
    console.log("✅ Already connected to MongoDB");
    return;
  }
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set in .env");
  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");
}

async function clearCollections() {
  const collections = [
    Teacher, Student, School, User, Exam, Question, QuestionBank, ExamResult,
    StudentAnswer, TeacherStudentSubscription, Subscription, Coupon, Plan,
    StudentPerformance, ExamPattern, MinistryExam, SimulationExam,
    AiGeneratedExam, GeneratedExam, ExtractedQuestion, TeacherCustomExam,
    TeacherManualExam, TeacherExamResult, ExamLog, BookContent,
    MinistryExamSession, Books
  ];
  
  const deletions = collections.map(model => model.deleteMany({}));
  await Promise.all(deletions);
  console.log("🧹 Cleared existing data");
}

async function seed() {
  console.log("🌱 Starting comprehensive seed data generation...");

  // Hash passwords
  const passwords = {
    admin: await hashPassword("Admin@123"),
    teacher1: await hashPassword("Teacher1@123"),
    teacher2: await hashPassword("Teacher2@123"),
    teacher3: await hashPassword("Teacher3@123"),
    student1: await hashPassword("Student1@123"),
    student2: await hashPassword("Student2@123"),
    student3: await hashPassword("Student3@123"),
    student4: await hashPassword("Student4@123"),
    school1: await hashPassword("School1@123"),
    school2: await hashPassword("School2@123"),
    books1: await hashPassword("Books1@123"),
  };

  // 1. ADMIN USERS (User model with admin role)
  console.log("👑 Creating admin users...");
  const admin = await User.create({
    name: "System Administrator",
    email: "admin@ula.com",
    password: passwords.admin,
    role: "admin"
  });

  // 2. TEACHERS (Multiple teachers with different subjects and scenarios)
  console.log("👨‍🏫 Creating teachers...");
  const teachers = await Teacher.insertMany([
    {
      name: "أحمد محمد - معلم رياضيات",
      email: "ahmed.math@ula.com",
      password: passwords.teacher1,
      subjects: ["رياضيات", "إحصاء"],
      role: "teacher",
      isBanned: false
    },
    {
      name: "فاطمة علي - معلمة علوم",
      email: "fatima.science@ula.com",
      password: passwords.teacher2,
      subjects: ["فيزياء", "كيمياء", "أحياء"],
      role: "teacher",
      isBanned: false
    },
    {
      name: "محمد حسن - معلم لغة عربية",
      email: "mohammed.arabic@ula.com",
      password: passwords.teacher3,
      subjects: ["لغة عربية", "أدب"],
      role: "teacher",
      isBanned: true // Banned teacher scenario
    }
  ]);

  // 3. STUDENTS (Different grades, subscription states, performance levels)
  console.log("🎓 Creating students...");
  const students = await Student.insertMany([
    {
      name: "علي أحمد - طالب متفوق",
      email: "ali.excellent@ula.com",
      password: passwords.student1,
      grade: 9,
      role: "student",
      isBanned: false,
      language: "العربية",
      darkMode: false,
      performance: {
        weakSubjects: ["هندسة"],
        strongSubjects: ["جبر", "إحصاء"]
      },
      subscriptions: [
        {
          teacherId: teachers[0]._id,
          plan: "premium",
          isActive: true,
          activeUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          paymentMethod: "card"
        }
      ]
    },
    {
      name: "مريم سعد - طالبة متوسطة",
      email: "mariam.average@ula.com",
      password: passwords.student2,
      grade: 10,
      role: "student",
      isBanned: false,
      language: "العربية",
      darkMode: true,
      performance: {
        weakSubjects: ["كيمياء"],
        strongSubjects: ["فيزياء"]
      },
      subscriptions: [
        {
          teacherId: teachers[1]._id,
          plan: "basic",
          isActive: true,
          activeUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          paymentMethod: "cash"
        },
        {
          teacherId: teachers[0]._id,
          plan: "basic",
          isActive: false, // Expired subscription
          activeUntil: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          paymentMethod: "manual"
        }
      ]
    },
    {
      name: "خالد محمود - طالب ضعيف",
      email: "khalid.weak@ula.com",
      password: passwords.student3,
      grade: 9,
      role: "student",
      isBanned: false,
      language: "العربية",
      darkMode: false,
      performance: {
        weakSubjects: ["رياضيات", "فيزياء", "كيمياء"],
        strongSubjects: []
      },
      subscriptions: [
        {
          teacherId: teachers[1]._id,
          plan: "free",
          isActive: true,
          activeUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          paymentMethod: "none"
        }
      ]
    },
    {
      name: "نور الدين - طالب محظور",
      email: "nour.banned@ula.com",
      password: passwords.student4,
      grade: 11,
      role: "student",
      isBanned: true, // Banned student scenario
      language: "العربية",
      darkMode: false,
      performance: {
        weakSubjects: [],
        strongSubjects: []
      },
      subscriptions: []
    }
  ]);

  // 4. SCHOOLS (Institutional users)
  console.log("🏫 Creating schools...");
  const schools = await School.insertMany([
    {
      name: "مدرسة المستقبل النموذجية",
      email: "future.school@ula.com",
      password: passwords.school1,
      subjects: ["رياضيات", "علوم", "لغة عربية", "إنجليزي"]
    },
    {
      name: "معهد التميز التعليمي",
      email: "excellence.institute@ula.com",
      password: passwords.school2,
      subjects: ["فيزياء", "كيمياء", "أحياء", "رياضيات متقدمة"]
    }
  ]);

  // 5. BOOKS (Educational content providers)
  console.log("📚 Creating books providers...");
  const booksProvider = await Books.create({
    name: "دار النشر التعليمية",
    email: "books.publisher@ula.com",
    password: passwords.books1,
    subjects: ["رياضيات", "علوم", "لغة عربية"]
  });

  // 6. SUBSCRIPTION PLANS
  // ✅ دعم ديناميكي لأي عدد من الباقات (يمكن إضافة المزيد بسهولة)
  console.log("💳 Creating subscription plans...");
  const now = new Date();
  
  // ✅ تعريف الباقات - يمكن إضافة المزيد هنا بسهولة
  const planDefinitions = [
    {
      name: "الخطة الأساسية",
      description: "خطة مناسبة للمعلمين الذين يبدأون رحلتهم على المنصة.",
      price: 10,
      currency: "JOD",
      maxStudents: 50,
      maxExams: 25,
      maxQuestions: 500,
      duration: 30,
      durationUnit: "days",
      startDate: now,
      endDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      features: ["امتحانات أساسية", "تقارير بسيطة", "دعم عبر البريد"]
    },
    {
      name: "الخطة المميزة",
      description: "أفضل خيار للمعلمين النشطين الذين يحتاجون إلى مزايا متقدمة.",
      price: 19,
      currency: "JOD",
      maxStudents: 200,
      maxExams: 100,
      maxQuestions: 2000,
      duration: 90,
      durationUnit: "days",
      startDate: now,
      endDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      features: ["امتحانات متقدمة", "تقارير مفصلة", "دعم فوري", "تحليل الأداء"]
    },
    {
      name: "الخطة المجانية",
      description: "خطة تجريبية لتعريف المعلمين الجدد على المنصة.",
      price: 0,
      currency: "JOD",
      maxStudents: 10,
      maxExams: 5,
      maxQuestions: 100,
      duration: 7,
      durationUnit: "days",
      startDate: now,
      endDate: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000),
      features: ["امتحان تجريبي واحد", "تقارير أساسية"]
    }
    // ✅ يمكن إضافة المزيد من الباقات هنا بسهولة
    // مثال:
    // {
    //   name: "الخطة المتقدمة",
    //   price: 29,
    //   maxStudents: 500,
    //   maxExams: 250,
    //   maxQuestions: 5000,
    //   ...
    // }
  ];
  
  const plans = await Plan.insertMany(planDefinitions);
  console.log(`✅ تم إنشاء ${plans.length} باقة اشتراك`);

  // 7. PLATFORM SUBSCRIPTIONS (Teacher-level subscriptions to plans)
  console.log("🧾 Creating platform subscriptions for teachers...");
  const subscriptions = await Subscription.insertMany([
    {
      teacherId: teachers[0]._id,
      planId: plans[0]._id,
      status: "active",
      startDate: now,
      endDate: new Date(now.getTime() + plans[0].duration * 24 * 60 * 60 * 1000),
      paymentMethod: "bank_transfer",
      paymentStatus: "paid",
      paymentDate: now,
      amount: plans[0].price,
      currency: plans[0].currency,
      notes: "تم الدفع عبر التحويل البنكي."
    },
    {
      teacherId: teachers[1]._id,
      planId: plans[1]._id,
      status: "pending",
      startDate: now,
      endDate: new Date(now.getTime() + plans[1].duration * 24 * 60 * 60 * 1000),
      paymentMethod: "credit_card",
      paymentStatus: "pending",
      amount: plans[1].price,
      currency: plans[1].currency,
      notes: "جارٍ انتظار تأكيد عملية الدفع."
    },
    {
      teacherId: teachers[2]._id,
      planId: plans[2]._id,
      status: "expired",
      startDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      paymentMethod: "cash",
      paymentStatus: "paid",
      paymentDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      amount: plans[2].price,
      currency: plans[2].currency,
      notes: "انتهت الفترة التجريبية المجانية."
    }
  ]);

  // 8. COUPONS (Different types and states)
  console.log("🎫 Creating coupons...");
  const coupons = await Coupon.insertMany([
    {
      code: "WELCOME2024",
      discount: 20,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isUsed: false
    },
    {
      code: "STUDENT50",
      discount: 50,
      validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      isUsed: true
    },
    {
      code: "EXPIRED10",
      discount: 10,
      validUntil: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      isUsed: false
    }
  ]);

  // 8. TEACHER-STUDENT SUBSCRIPTIONS (Separate model)
  console.log("🔗 Creating teacher-student subscriptions...");
  await TeacherStudentSubscription.insertMany([
    {
      teacherId: teachers[0]._id,
      studentId: students[0]._id,
      type: "premium",
      paymentStatus: "paid",
      paymentMethod: "card",
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      notes: "اشتراك مميز للطالب المتفوق"
    },
    {
      teacherId: teachers[1]._id,
      studentId: students[1]._id,
      type: "basic",
      paymentStatus: "unpaid",
      paymentMethod: "cash",
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: "في انتظار الدفع"
    },
    {
      teacherId: teachers[1]._id,
      studentId: students[2]._id,
      type: "free",
      paymentStatus: "unpaid",
      paymentMethod: "none",
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  ]);

  // 9. QUESTIONS (Various sources, types, and difficulties)
  console.log("❓ Creating questions...");
  const questions = await Question.insertMany([
    // Teacher-created questions
    {
      source: "teacher",
      questionText: "ما هو ناتج العملية: 15 × 4؟",
      options: ["50", "60", "70", "80"],
      correctAnswer: "60",
      explanation: "15 × 4 = 60",
      difficultyLevel: "سهل",
      createdBy: teachers[0]._id,
      subject: "رياضيات",
      grade: "9",
      term: "1",
      unit: "الضرب",
      score: 1,
      isValidated: true,
      tags: ["ضرب", "أساسيات"]
    },
    {
      source: "teacher",
      questionText: "أي من المعادلات التالية تمثل خط مستقيم؟",
      options: ["y = 2x + 3", "y = x²", "y = 1/x", "y = √x"],
      correctAnswer: "y = 2x + 3",
      explanation: "المعادلة الخطية تكون على الصورة y = mx + b",
      difficultyLevel: "متوسط",
      createdBy: teachers[0]._id,
      subject: "رياضيات",
      grade: "10",
      term: "2",
      unit: "الهندسة التحليلية",
      score: 2,
      isValidated: true,
      tags: ["معادلات", "خط مستقيم"]
    },
    // School-created questions
    {
      source: "school",
      questionText: "ما هي وحدة قياس القوة في النظام الدولي؟",
      options: ["جول", "نيوتن", "واط", "أمبير"],
      correctAnswer: "نيوتن",
      explanation: "النيوتن هو وحدة قياس القوة",
      difficultyLevel: "سهل",
      subject: "فيزياء",
      grade: "10",
      term: "1",
      unit: "القوى",
      score: 1,
      isValidated: true,
      tags: ["وحدات", "قوة"]
    },
    // AI-generated questions
    {
      source: "AI",
      questionText: "اشرح مفهوم الكثافة في الفيزياء.",
      options: [],
      explanation: "الكثافة هي كتلة المادة لكل وحدة حجم",
      difficultyLevel: "متوسط",
      subject: "فيزياء",
      grade: "9",
      term: "2",
      unit: "الخصائص الفيزيائية",
      score: 3,
      isValidated: false,
      tags: ["كثافة", "فيزياء"]
    },
    // OCR/PDF extracted questions
    {
      source: "OCR",
      questionText: "ما هو الرقم الهيدروجيني للمحلول القلوي؟",
      options: ["أقل من 7", "أكبر من 7", "يساوي 7", "لا يمكن تحديده"],
      correctAnswer: "أكبر من 7",
      explanation: "المحلول القلوي له pH أكبر من 7",
      difficultyLevel: "متوسط",
      subject: "كيمياء",
      grade: "11",
      term: "1",
      unit: "الأحماض والقواعد",
      score: 2,
      isValidated: true,
      tags: ["pH", "قلوي"]
    },
    // Difficult question
    {
      source: "teacher",
      questionText: "حل المعادلة التفاضلية: dy/dx = 2x",
      options: ["y = x² + C", "y = 2x + C", "y = x²", "y = 2x"],
      correctAnswer: "y = x² + C",
      explanation: "تكامل 2x يعطي x² + C",
      difficultyLevel: "صعب",
      createdBy: teachers[0]._id,
      subject: "رياضيات",
      grade: "12",
      term: "2",
      unit: "التفاضل والتكامل",
      score: 5,
      isValidated: true,
      tags: ["تفاضل", "تكامل"]
    }
  ]);

  // 10. EXAMS (All types and sources)
  console.log("📝 Creating exams...");
  const exams = await Exam.insertMany([
    // Teacher exam
    {
      title: "امتحان رياضيات - الفصل الأول",
      subject: "رياضيات",
      grade: 9,
      examType: "teacher",
      source: "manual",
      createdBy: teachers[0]._id,
      questions: [questions[0]._id, questions[1]._id],
      duration: 45,
      maxScore: 20,
      isProcessed: true
    },
    // School exam
    {
      title: "اختبار علوم منتصف الفصل",
      subject: "فيزياء",
      grade: 10,
      examType: "school",
      source: "PDF",
      questions: [questions[2]._id],
      duration: 60,
      maxScore: 25,
      isProcessed: true
    },
    // AI exam
    {
      title: "امتحان فيزياء مولد بالذكاء الاصطناعي",
      subject: "فيزياء",
      grade: 9,
      examType: "AI",
      source: "AI",
      questions: [questions[3]._id],
      duration: 30,
      maxScore: 15,
      isProcessed: false
    },
    // OCR exam
    {
      title: "اختبار كيمياء من ملف PDF",
      subject: "كيمياء",
      grade: 11,
      examType: "school",
      source: "OCR",
      questions: [questions[4]._id],
      duration: 40,
      maxScore: 10,
      isProcessed: true
    },
    // Mixed exam
    {
      title: "امتحان شامل - رياضيات متقدمة",
      subject: "رياضيات",
      grade: 12,
      examType: "mixed",
      source: "mixed",
      questions: [questions[5]._id],
      duration: 90,
      maxScore: 50,
      isProcessed: true
    },
    // Ministry exam
    {
      title: "امتحان وزاري - رياضيات 2024",
      subject: "رياضيات",
      grade: 9,
      examType: "ministry",
      source: "ministry",
      questions: [questions[0]._id, questions[1]._id],
      duration: 120,
      maxScore: 100,
      isProcessed: true
    }
  ]);

  // Update teacher's examsCreated array
  teachers[0].examsCreated = [exams[0]._id, exams[5]._id];
  await teachers[0].save();

  // 11. QUESTION BANK (Comprehensive coverage)
  console.log("🏦 Creating question bank...");
  await QuestionBank.insertMany([
    {
      subject: "رياضيات",
      grade: "9",
      term: "1",
      language: "ar",
      questionText: "أي من الأعداد التالية عدد أولي؟",
      questionType: "mcq",
      options: ["4", "9", "11", "15"],
      correctAnswer: "11",
      explanation: "11 عدد أولي لأنه يقبل القسمة على 1 ونفسه فقط",
      difficulty: "متوسط",
      importance: 3,
      source: "مدرس",
      generatedByAI: false,
      tags: ["أعداد أولية", "قسمة"],
      usedInExams: 2
    },
    {
      subject: "Math",
      grade: "10",
      term: "2",
      language: "en",
      questionText: "What is the derivative of x²?",
      questionType: "mcq",
      options: ["x", "2x", "x²", "2x²"],
      correctAnswer: "2x",
      explanation: "Using power rule: d/dx(x²) = 2x",
      difficulty: "متوسط",
      importance: 4,
      source: "كتاب",
      generatedByAI: false,
      tags: ["derivative", "calculus"],
      usedInExams: 1
    },
    {
      subject: "فيزياء",
      grade: "11",
      term: "1",
      language: "ar",
      questionText: "صح أم خطأ: السرعة كمية متجهة",
      questionType: "true-false",
      options: ["صح", "خطأ"],
      correctAnswer: "صح",
      explanation: "السرعة لها مقدار واتجاه",
      difficulty: "سهل",
      importance: 2,
      source: "مدرسة",
      generatedByAI: true,
      tags: ["سرعة", "متجه"],
      usedInExams: 0
    }
  ]);

  // 12. EXAM PATTERNS (AI analysis patterns)
  console.log("🔍 Creating exam patterns...");
  await ExamPattern.create({
    subject: "رياضيات",
    grade: "9",
    term: "1",
    language: "عربي",
    patterns: [
      {
        questionType: "mcq",
        difficulty: "سهل",
        tags: ["جمع", "طرح"],
        structure: "عملية حسابية بسيطة",
        frequency: 5,
        source: "teacher",
        exampleQuestion: "ما ناتج 5 + 3؟",
        lastUsed: new Date(),
        createdAt: new Date()
      },
      {
        questionType: "mcq",
        difficulty: "متوسط",
        tags: ["معادلات", "جبر"],
        structure: "حل معادلة خطية",
        frequency: 3,
        source: "school",
        exampleQuestion: "حل المعادلة: 2x + 5 = 11",
        lastUsed: new Date(),
        createdAt: new Date()
      }
    ],
    aiGeneratedQuestions: [
      {
        questionText: "أوجد قيمة x في المعادلة: 3x - 7 = 14",
        questionType: "mcq",
        options: ["5", "7", "9", "11"],
        correctAnswer: "7",
        explanation: "3x = 21, x = 7",
        difficulty: "متوسط",
        analysisScore: 8.5,
        createdAt: new Date()
      }
    ],
    ministryExamPatterns: [
      {
        year: 2024,
        examType: "نموذجي",
        questionType: "mcq",
        difficulty: "متوسط",
        repetitionCount: 2,
        topic: "الهندسة",
        frequency: 3,
        sourceExam: "امتحان وزاري 2024",
        createdAt: new Date()
      }
    ]
  });

  // 13. MINISTRY EXAMS
  console.log("🏛️ Creating ministry exams...");
  await MinistryExam.insertMany([
    {
      grade: "9",
      term: "1",
      subject: "رياضيات",
      year: "2024",
      image_url: "https://example.com/ministry-exam-2024.jpg",
      correct_answer: "B"
    },
    {
      grade: "10",
      term: "2",
      subject: "فيزياء",
      year: "2023",
      image_url: "https://example.com/ministry-exam-2023.jpg",
      correct_answer: "C"
    }
  ]);

  // 14. SIMULATION EXAMS
  console.log("🎯 Creating simulation exams...");
  await SimulationExam.create({
    subject: "رياضيات",
    grade: "9",
    term: "1",
    year: 2024,
    examType: "نموذجي",
    duration: 60,
    passMark: 50,
    generatedByAI: false,
    questions: [
      {
        questionText: "أوجد قيمة x في المعادلة: x + 5 = 9",
        questionType: "short-answer",
        options: [],
        correctAnswer: "4",
        explanation: "نقل 5 إلى الطرف الآخر",
        difficulty: "سهل",
        frequency: 1,
        topic: "معادلات"
      },
      {
        questionText: "أي مما يلي عدد نسبي؟",
        questionType: "mcq",
        options: ["√2", "π", "1/2", "e"],
        correctAnswer: "1/2",
        explanation: "كسر اعتيادي",
        difficulty: "متوسط",
        frequency: 2,
        topic: "الأعداد"
      }
    ]
  });

  // 15. AI GENERATED EXAMS
  console.log("🤖 Creating AI generated exams...");
  await AiGeneratedExam.create({
    grade: "10",
    term: "2",
    subject: "فيزياء",
    questions: [
      {
        questionText: "ما هي وحدة قياس التسارع؟",
        options: ["m/s", "m/s²", "N", "J"],
        correctAnswer: "m/s²",
        questionType: "mcq",
        difficulty: "سهل"
      },
      {
        questionText: "احسب القوة المطلوبة لتسريع جسم كتلته 5kg بمعدل 2m/s²",
        options: ["10N", "7N", "2.5N", "20N"],
        correctAnswer: "10N",
        questionType: "mcq",
        difficulty: "متوسط"
      }
    ]
  });

  // 16. GENERATED EXAMS
  console.log("⚡ Creating generated exams...");
  await GeneratedExam.create({
    subject: "كيمياء",
    grade: "11",
    term: "1",
    questions: [
      {
        questionText: "ما هو الرمز الكيميائي للصوديوم؟",
        options: ["So", "Na", "S", "N"],
        correctAnswer: "Na",
        explanation: "Na هو الرمز الكيميائي للصوديوم"
      }
    ]
  });

  // 17. EXTRACTED QUESTIONS
  console.log("📄 Creating extracted questions...");
  await ExtractedQuestion.create({
    questionText: "ما هو قانون حفظ الطاقة؟",
    options: ["الطاقة لا تفنى ولا تستحدث", "الطاقة تتحول من شكل لآخر", "كل ما سبق", "لا شيء مما سبق"],
    correctAnswer: "كل ما سبق",
    explanation: "قانون حفظ الطاقة ينص على أن الطاقة لا تفنى ولا تستحدث ولكن تتحول من شكل لآخر",
    subject: "فيزياء",
    grade: 10,
    unit: 3,
    difficultyLevel: "متوسط",
    sourceFile: "physics_chapter3.pdf",
    isReviewed: true
  });

  // 18. TEACHER CUSTOM EXAMS
  console.log("✏️ Creating teacher custom exams...");
  const teacherCustomExam = await TeacherCustomExam.create({
    teacherId: teachers[0]._id,
    examName: "امتحان مخصص - الجبر",
    subject: "رياضيات",
    grade: "9",
    term: "1",
    duration: 45,
    questions: [
      {
        questionText: "حل المعادلة: 2x + 3 = 11",
        options: ["x = 4", "x = 3", "x = 5", "x = 2"],
        correctAnswer: "x = 4"
      }
    ]
  });

  // 19. TEACHER MANUAL EXAMS
  console.log("📝 Creating teacher manual exams...");
  await TeacherManualExam.create({
    teacherId: teachers[1]._id,
    title: "اختبار يدوي - الكيمياء",
    subject: "كيمياء",
    grade: "10",
    term: "2",
    duration: 60,
    questions: [
      {
        questionText: "ما هو الرقم الذري للهيدروجين؟",
        options: ["1", "2", "3", "4"],
        correctAnswer: "1"
      }
    ]
  });

  // 20. EXAM RESULTS (Student performance)
  console.log("📊 Creating exam results...");
  await ExamResult.insertMany([
    {
      examId: exams[0]._id,
      userId: students[0]._id,
      score: 18,
      totalQuestions: 2,
      date: new Date()
    },
    {
      examId: exams[1]._id,
      userId: students[1]._id,
      score: 20,
      totalQuestions: 1,
      date: new Date()
    },
    {
      examId: exams[2]._id,
      userId: students[2]._id,
      score: 8,
      totalQuestions: 1,
      date: new Date()
    }
  ]);

  // 21. STUDENT ANSWERS (Detailed answer tracking)
  console.log("📋 Creating student answers...");
  await StudentAnswer.insertMany([
    {
      userId: students[0]._id,
      examId: exams[0]._id,
      questionId: questions[0]._id,
      selectedAnswer: "60",
      isCorrect: true,
      correctAnswer: "60",
      explanation: "15 × 4 = 60",
      score: 1
    },
    {
      userId: students[0]._id,
      examId: exams[0]._id,
      questionId: questions[1]._id,
      selectedAnswer: "y = 2x + 3",
      isCorrect: true,
      correctAnswer: "y = 2x + 3",
      explanation: "المعادلة الخطية تكون على الصورة y = mx + b",
      score: 2
    },
    {
      userId: students[1]._id,
      examId: exams[1]._id,
      questionId: questions[2]._id,
      selectedAnswer: "جول",
      isCorrect: false,
      correctAnswer: "نيوتن",
      explanation: "النيوتن هو وحدة قياس القوة",
      score: 0
    }
  ]);

  // 22. TEACHER EXAM RESULTS
  console.log("👨‍🏫 Creating teacher exam results...");
  await TeacherExamResult.create({
    studentId: students[0]._id,
    examId: teacherCustomExam._id,
    teacherId: teachers[0]._id,
    score: 1,
    totalQuestions: teacherCustomExam.questions.length,
    timeSpent: "30 دقيقة",
    date: new Date()
  });

  // 23. STUDENT PERFORMANCE (Alternative performance tracking)
  console.log("📈 Creating student performance records...");
  await StudentPerformance.insertMany([
    {
      userId: students[0]._id,
      examId: exams[0]._id,
      score: 18,
      totalQuestions: 2,
      date: new Date()
    },
    {
      userId: students[1]._id,
      examId: exams[1]._id,
      score: 20,
      totalQuestions: 1,
      date: new Date()
    }
  ]);

  // 24. EXAM LOGS (Daily exam tracking)
  console.log("📅 Creating exam logs...");
  await ExamLog.insertMany([
    {
      userId: students[0]._id,
      subject: "رياضيات",
      date: "2024-01-15",
      examCount: 2
    },
    {
      userId: students[1]._id,
      subject: "فيزياء",
      date: "2024-01-15",
      examCount: 1
    },
    {
      userId: students[2]._id,
      subject: "كيمياء",
      date: "2024-01-14",
      examCount: 1
    }
  ]);

  // 25. BOOK CONTENT (Educational materials)
  console.log("📖 Creating book content...");
  await BookContent.create({
    fileName: "رياضيات_الصف_التاسع_الفصل_الأول.pdf",
    title: "كتاب الرياضيات للصف التاسع - الفصل الأول",
    grade: "9",
    term: "1",
    subject: "رياضيات",
    content: "محتوى الكتاب التعليمي للرياضيات...",
    filePath: "/uploads/books/math_grade9_term1.pdf"
  });

  // 26. MINISTRY EXAM SESSIONS
  console.log("🏛️ Creating ministry exam sessions...");
  await MinistryExamSession.create({
    userId: students[0]._id,
    examType: "ministry",
    questions: [],
    score: 0,
    createdAt: new Date()
  });

  console.log("✅ Comprehensive seed data generation completed!");
  console.log("\n🔐 Login Credentials:");
  console.log("Admin:", { email: "admin@ula.com", password: "Admin@123" });
  console.log("Teacher 1:", { email: "ahmed.math@ula.com", password: "Teacher1@123" });
  console.log("Teacher 2:", { email: "fatima.science@ula.com", password: "Teacher2@123" });
  console.log("Student 1 (Excellent):", { email: "ali.excellent@ula.com", password: "Student1@123" });
  console.log("Student 2 (Average):", { email: "mariam.average@ula.com", password: "Student2@123" });
  console.log("Student 3 (Weak):", { email: "khalid.weak@ula.com", password: "Student3@123" });
  console.log("School 1:", { email: "future.school@ula.com", password: "School1@123" });
  console.log("Books Provider:", { email: "books.publisher@ula.com", password: "Books1@123" });
  
  console.log("\n📊 Data Coverage Summary:");
  console.log("✅ All user roles (Admin, Teachers, Students, Schools, Books)");
  console.log("✅ All exam types (teacher, school, AI, ministry, mixed, etc.)");
  console.log("✅ All exam sources (manual, OCR, PDF, AI, etc.)");
  console.log("✅ All question sources and difficulties");
  console.log("✅ Subscription states (active, expired, free, premium, basic)");
  console.log("✅ Student performance levels (excellent, average, weak)");
  console.log("✅ Banned users (teacher and student)");
  console.log("✅ Payment methods and statuses");
  console.log("✅ All specialized models and relationships");
  console.log("✅ Comprehensive test scenarios for all functionalities");
}

async function main() {
  try {
    await connect();
    await clearCollections();
    await seed();
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exitCode = 1;
  } finally {
    // Only close connection if not being imported by test script
    if (require.main === module) {
      await mongoose.connection.close();
      console.log("🔌 Database connection closed");
    }
  }
}

// Export seed function for testing
module.exports = { seed, connect, clearCollections };

// Only run main if this is the main module
if (require.main === module) {
  main();
}
