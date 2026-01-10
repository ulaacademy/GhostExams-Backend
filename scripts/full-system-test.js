require("dotenv").config();
const mongoose = require("mongoose");
const axios = require("axios");
const bcrypt = require("bcrypt");

// Import all models
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const School = require("../models/School");
const User = require("../models/User");
const Exam = require("../models/Exam");
const Question = require("../models/Question");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const TeacherStudentSubscription = require("../models/TeacherStudentSubscription");
const TeacherCustomExam = require("../models/TeacherCustomExam");
const TeacherExamResult = require("../models/TeacherExamResult");
const ExamResult = require("../models/ExamResult");
const Coupon = require("../models/Coupon");

// We'll run the seed script directly by requiring it
// The comprehensive-seed.js will run its main() function automatically

const API_URL = process.env.API_URL || "http://localhost:3000/api";
let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper function to log test results
function logTest(name, passed, error = null) {
  if (passed) {
    console.log(`✅ ${name}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${name}`);
    if (error) console.log(`   Error: ${error.message || error}`);
    testResults.failed++;
    testResults.errors.push({ test: name, error: error?.message || error });
  }
}

// Helper function to make API requests
async function apiRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: {
        "Content-Type": "application/json",
      },
    };
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status,
    };
  }
}

// Connect to database
async function connect() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set in .env");
  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");
}

// Clear all collections
async function clearAllCollections() {
  console.log("\n🧹 Clearing all collections...");
  const collections = [
    Teacher, Student, School, User, Exam, Question, Plan, Subscription,
    TeacherStudentSubscription, TeacherCustomExam, TeacherExamResult,
    ExamResult, Coupon
  ];
  
  const deletions = collections.map(model => model.deleteMany({}));
  await Promise.all(deletions);
  console.log("✅ All collections cleared");
}

// Test 1: Database Connection
async function testDatabaseConnection() {
  try {
    await mongoose.connection.db.admin().ping();
    logTest("Database Connection", true);
  } catch (error) {
    logTest("Database Connection", false, error);
  }
}

// Test 2: Seed Data Creation
async function testSeedData() {
  try {
    const teachers = await Teacher.countDocuments();
    const students = await Student.countDocuments();
    const plans = await Plan.countDocuments();
    const subscriptions = await Subscription.countDocuments();
    
    const allCreated = teachers > 0 && students > 0 && plans > 0;
    logTest("Seed Data Creation", allCreated, 
      allCreated ? null : `Teachers: ${teachers}, Students: ${students}, Plans: ${plans}`);
  } catch (error) {
    logTest("Seed Data Creation", false, error);
  }
}

// Test 3: Authentication - Admin Login
async function testAdminLogin() {
  try {
    const result = await apiRequest("POST", "/auth/login", {
      email: "admin@ula.com",
      password: "Admin@123"
    });
    
    const success = result.success && result.data?.token;
    logTest("Admin Login", success, success ? null : result.error);
    return success ? result.data.token : null;
  } catch (error) {
    logTest("Admin Login", false, error);
    return null;
  }
}

// Test 4: Authentication - Teacher Login
async function testTeacherLogin() {
  try {
    const result = await apiRequest("POST", "/auth/login", {
      email: "ahmed.math@ula.com",
      password: "Teacher1@123"
    });
    
    const success = result.success && result.data?.token;
    logTest("Teacher Login", success, success ? null : result.error);
    return success ? result.data : null;
  } catch (error) {
    logTest("Teacher Login", false, error);
    return null;
  }
}

// Test 5: Authentication - Student Login
async function testStudentLogin() {
  try {
    const result = await apiRequest("POST", "/auth/login", {
      email: "ali.excellent@ula.com",
      password: "Student1@123"
    });
    
    const success = result.success && result.data?.token;
    logTest("Student Login", success, success ? null : result.error);
    return success ? result.data : null;
  } catch (error) {
    logTest("Student Login", false, error);
    return null;
  }
}

// Test 6: Get Active Plans
async function testGetActivePlans(adminToken) {
  try {
    const result = await apiRequest("GET", "/plans/active", null, adminToken);
    const success = result.success && Array.isArray(result.data?.data) && result.data.data.length > 0;
    logTest("Get Active Plans", success, success ? null : result.error);
    return success ? result.data.data : null;
  } catch (error) {
    logTest("Get Active Plans", false, error);
    return null;
  }
}

// Test 7: Currency Verification (JOD)
async function testCurrencyJOD() {
  try {
    const plans = await Plan.find({});
    const allJOD = plans.every(plan => plan.currency === "JOD" || plan.price === 0);
    logTest("Currency is JOD", allJOD, 
      allJOD ? null : `Found plans with non-JOD currency`);
  } catch (error) {
    logTest("Currency is JOD", false, error);
  }
}

// Test 8: Teacher-Student Subscription Relationship
async function testTeacherStudentSubscription() {
  try {
    const subscriptions = await TeacherStudentSubscription.find({})
      .populate("teacherId")
      .populate("studentId");
    
    const valid = subscriptions.length > 0 && 
                  subscriptions.every(sub => sub.teacherId && sub.studentId);
    logTest("Teacher-Student Subscription Relationship", valid,
      valid ? null : "Some subscriptions missing teacher or student");
  } catch (error) {
    logTest("Teacher-Student Subscription Relationship", false, error);
  }
}

// Test 9: Get Subscribed Teachers (Student API)
async function testGetSubscribedTeachers(studentToken) {
  try {
    const result = await apiRequest("GET", "/student/subscribed-teachers", null, studentToken);
    const success = result.success && Array.isArray(result.data);
    logTest("Get Subscribed Teachers (Student)", success, success ? null : result.error);
    return success ? result.data : null;
  } catch (error) {
    logTest("Get Subscribed Teachers (Student)", false, error);
    return null;
  }
}

// Test 10: Get Teacher Exams
async function testGetTeacherExams(teacherToken, teacherId) {
  try {
    const result = await apiRequest("GET", `/student/teacher/${teacherId}/exams`, null, teacherToken);
    const success = result.success && result.data !== undefined;
    logTest("Get Teacher Exams", success, success ? null : result.error);
    return success ? result.data : null;
  } catch (error) {
    logTest("Get Teacher Exams", false, error);
    return null;
  }
}

// Test 11: Create Teacher Custom Exam
async function testCreateTeacherExam(teacherToken, teacherId) {
  try {
    const examData = {
      teacherId,
      examName: "امتحان تجريبي",
      subject: "رياضيات",
      grade: "10",
      term: "الأول",
      duration: 60,
      questions: [
        {
          questionText: "ما هو 2 + 2؟",
          options: ["3", "4", "5", "6"],
          correctAnswer: "4"
        },
        {
          questionText: "ما هو 3 × 3؟",
          options: ["6", "9", "12", "15"],
          correctAnswer: "9"
        }
      ]
    };
    
    const result = await apiRequest("POST", "/exams/custom-exams/create", examData, teacherToken);
    const success = result.success && result.data?.exam?._id;
    logTest("Create Teacher Custom Exam", success, success ? null : result.error);
    return success ? result.data.exam : null;
  } catch (error) {
    logTest("Create Teacher Custom Exam", false, error);
    return null;
  }
}

// Test 12: Submit Teacher Exam Result
async function testSubmitExamResult(studentToken, examId, teacherId, studentId) {
  try {
    const resultData = {
      studentId,
      examId,
      teacherId,
      score: 50,
      totalQuestions: 2
    };
    
    const result = await apiRequest("POST", "/teacher-exam-results/submit", resultData, studentToken);
    const success = result.success;
    logTest("Submit Teacher Exam Result", success, success ? null : result.error);
    return success;
  } catch (error) {
    logTest("Submit Teacher Exam Result", false, error);
    return false;
  }
}

// Test 13: Get Teacher Dashboard Metrics
async function testTeacherDashboard(teacherToken) {
  try {
    const result = await apiRequest("GET", "/teacher/dashboard-metrics", null, teacherToken);
    const success = result.success && result.data !== undefined;
    logTest("Get Teacher Dashboard Metrics", success, success ? null : result.error);
    return success;
  } catch (error) {
    logTest("Get Teacher Dashboard Metrics", false, error);
    return false;
  }
}

// Test 14: Get Student Dashboard
async function testStudentDashboard(studentToken, studentId) {
  try {
    const result = await apiRequest("GET", `/student/dashboard/${studentId}`, null, studentToken);
    const success = result.success && result.data !== undefined;
    logTest("Get Student Dashboard", success, success ? null : result.error);
    return success;
  } catch (error) {
    logTest("Get Student Dashboard", false, error);
    return false;
  }
}

// Test 15: Plan-Subscription Relationship
async function testPlanSubscriptionRelationship() {
  try {
    const subscriptions = await Subscription.find({})
      .populate("planId")
      .populate("teacherId");
    
    const valid = subscriptions.length > 0 &&
                  subscriptions.every(sub => sub.planId && sub.teacherId);
    
    // Check currency matches
    const currencyMatch = subscriptions.every(sub => 
      sub.currency === sub.planId?.currency || sub.currency === "JOD"
    );
    
    logTest("Plan-Subscription Relationship", valid && currencyMatch,
      valid && currencyMatch ? null : "Relationship or currency mismatch");
  } catch (error) {
    logTest("Plan-Subscription Relationship", false, error);
  }
}

// Test 16: Permissions - Unauthorized Access
async function testUnauthorizedAccess() {
  try {
    // Try to access protected admin endpoint without token
    const result = await apiRequest("GET", "/teacher/dashboard-metrics");
    const shouldFail = !result.success && (result.status === 401 || result.status === 403);
    logTest("Unauthorized Access Protection", shouldFail,
      shouldFail ? null : "Security issue: Unauthorized access allowed");
  } catch (error) {
    logTest("Unauthorized Access Protection", false, error);
  }
}

// Test 17: Data Integrity - No Orphaned Records
async function testDataIntegrity() {
  try {
    // Check for orphaned subscriptions
    const subscriptions = await Subscription.find({});
    const teachers = await Teacher.find({});
    const plans = await Plan.find({});
    
    const teacherIds = new Set(teachers.map(t => t._id.toString()));
    const planIds = new Set(plans.map(p => p._id.toString()));
    
    const orphanedSubs = subscriptions.filter(sub => 
      !teacherIds.has(sub.teacherId.toString()) || 
      !planIds.has(sub.planId.toString())
    );
    
    logTest("Data Integrity - No Orphaned Records", orphanedSubs.length === 0,
      orphanedSubs.length === 0 ? null : `Found ${orphanedSubs.length} orphaned subscriptions`);
  } catch (error) {
    logTest("Data Integrity - No Orphaned Records", false, error);
  }
}

// Test 18: Currency Display in Plans
async function testCurrencyDisplay() {
  try {
    const plans = await Plan.find({ isActive: true });
    const allHaveCurrency = plans.every(plan => plan.currency);
    const defaultIsJOD = plans.length > 0 && plans[0].currency === "JOD";
    
    logTest("Currency Display in Plans", allHaveCurrency && defaultIsJOD,
      allHaveCurrency && defaultIsJOD ? null : "Currency display issue");
  } catch (error) {
    logTest("Currency Display in Plans", false, error);
  }
}

// Main test function
async function runAllTests() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 Starting Full System End-to-End Test");
  console.log("=".repeat(60) + "\n");

  try {
    // Step 1: Connect to database (seed script will also connect, but we need it first)
    await connect();
    
    // Step 2: Run seed script (it will clear and seed)
    console.log("\n🌱 Running seed script...");
    const seedModule = require("./comprehensive-seed");
    
    // Clear collections and seed (seed script's connect won't run if already connected)
    await seedModule.clearCollections();
    await seedModule.seed();
    console.log("✅ Seed completed\n");
    
    // Step 4: Run all tests
    console.log("🧪 Running Tests...\n");
    console.log("-".repeat(60));
    
    // Basic tests
    await testDatabaseConnection();
    await testSeedData();
    await testCurrencyJOD();
    await testCurrencyDisplay();
    
    // Authentication tests
    const adminToken = await testAdminLogin();
    const teacherData = await testTeacherLogin();
    const studentData = await testStudentLogin();
    const teacherToken = teacherData?.token;
    const studentToken = studentData?.token;
    const teacherId = teacherData?.user?._id || teacherData?.user?.id;
    const studentId = studentData?.user?._id || studentData?.user?.id;
    
    // API tests
    if (adminToken) {
      await testGetActivePlans(adminToken);
    }
    
    if (studentToken) {
      await testGetSubscribedTeachers(studentToken);
      await testStudentDashboard(studentToken, studentId);
    }
    
    if (teacherToken && teacherId) {
      await testGetTeacherExams(teacherToken, teacherId);
      await testTeacherDashboard(teacherToken);
      
      // Create exam and test submission
      const exam = await testCreateTeacherExam(teacherToken, teacherId);
      if (exam && studentToken && studentId) {
        await testSubmitExamResult(studentToken, exam._id, teacherId, studentId);
      }
    }
    
    // Relationship tests
    await testTeacherStudentSubscription();
    await testPlanSubscriptionRelationship();
    
    // Security tests
    await testUnauthorizedAccess();
    
    // Integrity tests
    await testDataIntegrity();
    
    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 Test Summary");
    console.log("=".repeat(60));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%`);
    
    if (testResults.errors.length > 0) {
      console.log("\n❌ Errors:");
      testResults.errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err.test}: ${err.error}`);
      });
    }
    
    console.log("\n" + "=".repeat(60));
    
    if (testResults.failed === 0) {
      console.log("🎉 All tests passed! System is working correctly.");
      process.exit(0);
    } else {
      console.log("⚠️  Some tests failed. Please review the errors above.");
      process.exit(1);
    }
    
  } catch (error) {
    console.error("\n❌ Fatal error during testing:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
  }
}

// Run tests
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };

