require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Models
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const School = require("../models/School");
const User = require("../models/User");
const Exam = require("../models/Exam");
const Question = require("../models/Question");
const QuestionBank = require("../models/QuestionBank");
const ExamResult = require("../models/ExamResult");
const TeacherCustomExam = require("../models/TeacherCustomExam");
const TeacherExamResult = require("../models/TeacherExamResult");
let TeacherStudentSubscription;
try {
  TeacherStudentSubscription = require("../models/TeacherStudentSubscription");
} catch (e) {
  // optional model
}

async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

async function connect() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set in .env");
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log("✅ Connected to MongoDB");
}

async function clearCollections() {
  const deletions = [
    Teacher.deleteMany({}),
    Student.deleteMany({}),
    School.deleteMany({}),
    User.deleteMany({}),
    Exam.deleteMany({}),
    Question.deleteMany({}),
    QuestionBank.deleteMany({}),
    ExamResult.deleteMany({}),
    TeacherCustomExam.deleteMany({}),
    TeacherExamResult.deleteMany({}),
  ];
  if (TeacherStudentSubscription) deletions.push(TeacherStudentSubscription.deleteMany({}));
  await Promise.all(deletions);
  console.log("🧹 Cleared existing data");
}

async function seed() {
  // Passwords
  const teacherPassword = await hashPassword("Teacher@123");
  const teacher2Password = await hashPassword("Teacher2@123");
  const studentPassword = await hashPassword("Student@123");
  const student2Password = await hashPassword("Student2@123");
  const schoolPassword = await hashPassword("School@123");
  const adminPassword = await hashPassword("Admin@123");

  // Teachers
  const [teacher1, teacher2] = await Teacher.insertMany([
    {
      name: "Mr. Ahmad Teacher",
      email: "teacher1@example.com",
      password: teacherPassword,
      subjects: ["رياضيات", "فيزياء"],
      role: "teacher",
    },
    {
      name: "Ms. Sara Teacher",
      email: "teacher2@example.com",
      password: teacher2Password,
      subjects: ["كيمياء"],
      role: "teacher",
    },
  ]);

  // Students with subscriptions edge-cases
  const studentDocs = await Student.insertMany([
    {
      name: "Ali Student",
      email: "student1@example.com",
      password: studentPassword,
      grade: 9,
      role: "student",
      language: "العربية",
      darkMode: false,
      performance: { weakSubjects: ["هندسة"], strongSubjects: ["جبر"] },
      subscriptions: [
        {
          teacherId: teacher1._id,
          plan: "basic",
          isActive: true,
          activeUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          paymentMethod: "manual",
        },
      ],
    },
    {
      name: "Mona Student",
      email: "student2@example.com",
      password: student2Password,
      grade: 10,
      role: "student",
      language: "العربية",
      darkMode: true,
      performance: { weakSubjects: ["كهرباء"], strongSubjects: ["ميكانيك"] },
      subscriptions: [
        {
          teacherId: teacher1._id,
          plan: "premium",
          isActive: false,
          activeUntil: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // expired
          paymentMethod: "manual",
        },
        {
          teacherId: teacher2._id,
          plan: "basic",
          isActive: true,
          activeUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          paymentMethod: "manual",
        },
      ],
    },
  ]);
  const [student1, student2] = studentDocs;

  // Optional teacher-student subscription separate model coverage
  if (TeacherStudentSubscription) {
    await TeacherStudentSubscription.insertMany([
      {
        teacherId: teacher1._id,
        studentId: student1._id,
        type: "basic",
        paymentStatus: "paid",
        paymentMethod: "cash",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: "Initial enrollment",
      },
      {
        teacherId: teacher2._id,
        studentId: student2._id,
        type: "premium",
        paymentStatus: "unpaid",
        paymentMethod: "coupon",
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    ]);
  }

  // School
  const school = await School.create({
    name: "Future School",
    email: "school@example.com",
    password: schoolPassword,
    subjects: ["رياضيات", "علوم", "كيمياء"],
  });

  // Admin user (for completeness of roles present in User model)
  await User.create({
    name: "System Admin",
    email: "admin@example.com",
    password: adminPassword,
    role: "admin",
  });

  // Questions not yet linked to exams (bank of questions), varied sources and types
  const standaloneQuestions = await Question.insertMany([
    {
      source: "teacher",
      questionText: "ما ناتج 2 + 2؟",
      options: ["3", "4", "5"],
      correctAnswer: "4",
      explanation: "جمع بسيط",
      difficultyLevel: "سهل",
      createdBy: teacher1._id,
      subject: "رياضيات",
      grade: "9",
      term: "1",
      unit: "الجمع",
      score: 1,
    },
    {
      source: "school",
      questionText: "حدد الحالة aggregation في الكيمياء",
      options: ["صلبة", "سائلة", "غازية", "كل ما سبق"],
      correctAnswer: "كل ما سبق",
      explanation: "تشمل الحالات الثلاث",
      difficultyLevel: "متوسط",
      subject: "كيمياء",
      grade: "10",
      term: "2",
      unit: "المادة",
      score: 2,
    },
    {
      source: "AI",
      questionText: "اشرح قانون نيوتن الثاني بإيجاز.",
      options: [],
      explanation: "F = m * a",
      difficultyLevel: "متوسط",
      subject: "فيزياء",
      grade: "10",
      term: "1",
      unit: "الحركة",
      score: 3,
    },
  ]);

  // Exams with linked questions
  const exam1Teacher = await Exam.create({
    title: "اختبار رياضيات - وحدات أساسية",
    subject: "رياضيات",
    grade: 9,
    examType: "teacher",
    source: "manual",
    createdBy: teacher1._id,
    duration: 30,
    maxScore: 10,
  });

  const exam2School = await Exam.create({
    title: "اختبار علوم منتصف الفصل",
    subject: "علوم",
    grade: 10,
    examType: "school",
    source: "PDF",
    duration: 45,
    maxScore: 20,
  });

  const exam3AI = await Exam.create({
    title: "اختبار فيزياء مولد بالذكاء الاصطناعي",
    subject: "فيزياء",
    grade: 10,
    examType: "AI",
    source: "AI",
    duration: 40,
    maxScore: 15,
  });

  // Create and link questions to exams
  const [q1, q2] = await Question.insertMany([
    {
      exam: exam1Teacher._id,
      source: "teacher",
      questionText: "كم يساوي 3 * 3؟",
      options: ["6", "9", "12"],
      correctAnswer: "9",
      explanation: "جداء",
      difficultyLevel: "سهل",
      createdBy: teacher1._id,
      subject: "رياضيات",
      grade: "9",
      term: "1",
      unit: "الضرب",
      score: 1,
    },
    {
      exam: exam1Teacher._id,
      source: "teacher",
      questionText: "حساب 10 - 4 = ؟",
      options: ["7", "6", "5"],
      correctAnswer: "6",
      difficultyLevel: "سهل",
      createdBy: teacher1._id,
      subject: "رياضيات",
      grade: "9",
      term: "1",
      unit: "الطرح",
      score: 1,
    },
  ]);
  exam1Teacher.questions = [q1._id, q2._id];
  await exam1Teacher.save();

  const [q3] = await Question.insertMany([
    {
      exam: exam2School._id,
      source: "school",
      questionText: "صح أم خطأ: الماء يغلي عند 100° مئوية عند الضغط الجوي القياسي.",
      options: ["صح", "خطأ"],
      correctAnswer: "صح",
      difficultyLevel: "متوسط",
      subject: "علوم",
      grade: "10",
      term: "2",
      unit: "الحرارة",
      score: 2,
    },
  ]);
  exam2School.questions = [q3._id];
  await exam2School.save();

  const [q4] = await Question.insertMany([
    {
      exam: exam3AI._id,
      source: "AI",
      questionText: "اختر الوحدة الصحيحة للتسارع.",
      options: ["m/s", "m/s^2", "N"],
      correctAnswer: "m/s^2",
      difficultyLevel: "متوسط",
      subject: "فيزياء",
      grade: "10",
      term: "1",
      unit: "الحركة",
      score: 3,
    },
  ]);
  exam3AI.questions = [q4._id];
  await exam3AI.save();

  // QuestionBank entries (covering languages/types)
  await QuestionBank.insertMany([
    {
      subject: "رياضيات",
      grade: "9",
      term: "1",
      language: "ar",
      questionText: "أي الأعداد أولي؟",
      questionType: "mcq",
      options: ["4", "9", "11"],
      correctAnswer: "11",
      explanation: "11 عدد أولي",
      difficulty: "متوسط",
      importance: 2,
      source: "مدرس",
      tags: ["الأعداد الأولية"],
    },
    {
      subject: "Math",
      grade: "10",
      term: "2",
      language: "en",
      questionText: "True or False: π is rational.",
      questionType: "true-false",
      options: ["True", "False"],
      correctAnswer: "False",
      explanation: "Pi is irrational",
      difficulty: "سهل",
      source: "كتاب",
      tags: ["constants"],
    },
  ]);

  // SimulationExam
  await (await importSimulationExam())();

  // Exam Results for coverage
  await ExamResult.insertMany([
    {
      examId: exam1Teacher._id,
      userId: student1._id,
      score: 2,
      totalQuestions: 2,
      date: new Date(),
    },
    {
      examId: exam2School._id,
      userId: student2._id,
      score: 1,
      totalQuestions: 1,
      date: new Date(),
    },
  ]);

  // Teacher Custom Exams for teacher reports
  const teacherExam1 = await TeacherCustomExam.create({
    teacherId: teacher1._id,
    examName: "امتحان رياضيات - الجبر والهندسة",
    subject: "رياضيات",
    grade: "9",
    term: "1",
    duration: 45,
    questions: [
      {
        questionText: "ما هو ناتج 5 + 3؟",
        options: ["6", "7", "8", "9"],
        correctAnswer: "8",
      },
      {
        questionText: "ما هي مساحة مربع طول ضلعه 4 سم؟",
        options: ["8 سم²", "12 سم²", "16 سم²", "20 سم²"],
        correctAnswer: "16 سم²",
      },
      {
        questionText: "أوجد قيمة x في المعادلة: 2x = 10",
        options: ["3", "4", "5", "6"],
        correctAnswer: "5",
      },
      {
        questionText: "ما هو محيط دائرة نصف قطرها 7 سم؟ (استخدم π = 22/7)",
        options: ["22 سم", "44 سم", "154 سم", "77 سم"],
        correctAnswer: "44 سم",
      },
    ],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
  });

  const teacherExam2 = await TeacherCustomExam.create({
    teacherId: teacher1._id,
    examName: "امتحان فيزياء - الحركة والقوة",
    subject: "فيزياء",
    grade: "10",
    term: "2",
    duration: 60,
    questions: [
      {
        questionText: "ما هي وحدة قياس القوة؟",
        options: ["متر", "نيوتن", "ثانية", "كيلوغرام"],
        correctAnswer: "نيوتن",
      },
      {
        questionText: "إذا كانت السرعة 20 م/ث والزمن 5 ثواني، ما المسافة؟",
        options: ["100 م", "4 م", "25 م", "15 م"],
        correctAnswer: "100 م",
      },
      {
        questionText: "ما هو قانون نيوتن الأول؟",
        options: [
          "الجسم الساكن يبقى ساكناً",
          "F = ma",
          "لكل فعل رد فعل",
          "الطاقة محفوظة",
        ],
        correctAnswer: "الجسم الساكن يبقى ساكناً",
      },
    ],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
  });

  const teacherExam3 = await TeacherCustomExam.create({
    teacherId: teacher2._id,
    examName: "امتحان كيمياء - التفاعلات الكيميائية",
    subject: "كيمياء",
    grade: "10",
    term: "1",
    duration: 50,
    questions: [
      {
        questionText: "ما هو الرمز الكيميائي للماء؟",
        options: ["H2O", "CO2", "O2", "H2"],
        correctAnswer: "H2O",
      },
      {
        questionText: "كم عدد الإلكترونات في ذرة الكربون؟",
        options: ["4", "6", "8", "12"],
        correctAnswer: "6",
      },
    ],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
  });

  // Teacher Exam Results
  await TeacherExamResult.insertMany([
    // Results for teacherExam1 (رياضيات)
    {
      studentId: student1._id,
      examId: teacherExam1._id,
      teacherId: teacher1._id,
      score: 3,
      totalQuestions: 4,
      timeSpent: "25 دقيقة",
      submittedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
    },
    {
      studentId: student2._id,
      examId: teacherExam1._id,
      teacherId: teacher1._id,
      score: 4,
      totalQuestions: 4,
      timeSpent: "30 دقيقة",
      submittedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
    },
    // Results for teacherExam2 (فيزياء)
    {
      studentId: student1._id,
      examId: teacherExam2._id,
      teacherId: teacher1._id,
      score: 2,
      totalQuestions: 3,
      timeSpent: "40 دقيقة",
      submittedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
    {
      studentId: student2._id,
      examId: teacherExam2._id,
      teacherId: teacher1._id,
      score: 1,
      totalQuestions: 3,
      timeSpent: "35 دقيقة",
      submittedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
    // Results for teacherExam3 (كيمياء - teacher2)
    {
      studentId: student2._id,
      examId: teacherExam3._id,
      teacherId: teacher2._id,
      score: 2,
      totalQuestions: 2,
      timeSpent: "20 دقيقة",
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  ]);

  console.log("✅ Seed completed successfully\n");
  console.log("🔐 Login accounts:");
  console.log("Teacher:", { email: "teacher1@example.com", password: "Teacher@123" });
  console.log("Student:", { email: "student1@example.com", password: "Student@123" });
  console.log("Admin:", { email: "admin@example.com", password: "Admin@123" });
}

function importSimulationExam() {
  // Return a function to avoid require timing issues
  return async function seedSimulation() {
    const SimulationExam = require("../models/SimulationExam");
    await SimulationExam.deleteMany({});
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
          topic: "معادلات",
        },
        {
          questionText: "أي مما يلي عدد نسبي؟",
          questionType: "mcq",
          options: ["√2", "π", "1/2"],
          correctAnswer: "1/2",
          explanation: "كسر اعتيادي",
          difficulty: "متوسط",
          topic: "الأعداد",
        },
      ],
    });
  };
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
    await mongoose.connection.close();
  }
}

main();


