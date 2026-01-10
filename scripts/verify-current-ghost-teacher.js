// Backend/scripts/verify-current-ghost-teacher.js
// ✅ Verify the current Ghost Teacher setup

const mongoose = require("mongoose");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const TeacherStudentSubscription = require("../models/TeacherStudentSubscription");
const Exam = require("../models/Exam");
const TeacherCustomExam = require("../models/TeacherCustomExam");
const { ghostTeacherId } = require("../config/ghostTeacher");

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

async function verifyGhostTeacher() {
  try {
    console.log("🔍 Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log("✅ Connected to database\n");

    console.log("=" .repeat(70));
    console.log("👻 GHOST TEACHER VERIFICATION");
    console.log("=" .repeat(70));
    console.log();

    // 1. Check Configuration
    console.log("📋 Step 1: Configuration Check");
    console.log("   Ghost Teacher ID in config:", ghostTeacherId);
    console.log();

    // 2. Verify Ghost Teacher exists
    console.log("📋 Step 2: Database Verification");
    const ghostTeacher = await Teacher.findById(ghostTeacherId);
    
    if (!ghostTeacher) {
      console.log("   ❌ ERROR: Ghost Teacher not found with ID:", ghostTeacherId);
      console.log("   💡 Please check your database for the correct teacher ID");
      process.exit(1);
    }

    console.log("   ✅ Ghost Teacher Found:");
    console.log("      ID:", ghostTeacher._id.toString());
    console.log("      Name:", ghostTeacher.name);
    console.log("      Email:", ghostTeacher.email);
    console.log("      Subjects:", ghostTeacher.subjects.join(", "));
    console.log();

    // 3. Check Student Subscriptions
    console.log("📋 Step 3: Student Subscriptions");
    const subscriptions = await TeacherStudentSubscription.find({
      teacherId: ghostTeacherId
    }).populate("studentId", "name email");
    
    console.log(`   Total Students Subscribed: ${subscriptions.length}`);
    
    if (subscriptions.length > 0) {
      console.log("\n   Recent Subscriptions (last 5):");
      subscriptions.slice(0, 5).forEach((sub, index) => {
        const studentName = sub.studentId?.name || "Unknown";
        const studentEmail = sub.studentId?.email || "N/A";
        const subType = sub.type || "free";
        const startDate = sub.startDate ? new Date(sub.startDate).toLocaleDateString('ar-SA') : "N/A";
        console.log(`   ${index + 1}. ${studentName} (${studentEmail})`);
        console.log(`      Type: ${subType} | Started: ${startDate}`);
      });
      if (subscriptions.length > 5) {
        console.log(`   ... and ${subscriptions.length - 5} more`);
      }
    } else {
      console.log("   ℹ️ No students subscribed yet");
      console.log("   💡 New students will be auto-subscribed on registration");
    }
    console.log();

    // 4. Check Exams (both types)
    console.log("📋 Step 4: Ghost Examinations");
    
    // Check Exam model (examType: "ghost")
    const ghostExams = await Exam.find({ examType: "ghost" }).lean();
    console.log(`   Exams (Exam model, examType: "ghost"): ${ghostExams.length}`);
    
    // Check TeacherCustomExam model
    const customExams = await TeacherCustomExam.find({ 
      teacherId: ghostTeacherId 
    }).lean();
    console.log(`   Exams (TeacherCustomExam model): ${customExams.length}`);
    
    const totalExams = ghostExams.length + customExams.length;
    console.log(`   Total Ghost Examinations: ${totalExams}`);
    
    if (totalExams > 0) {
      console.log("\n   Recent Exams:");
      const allExams = [...ghostExams, ...customExams].slice(0, 5);
      allExams.forEach((exam, index) => {
        const title = exam.title || exam.examName || "Untitled";
        const subject = exam.subject || "N/A";
        const grade = exam.grade || "N/A";
        console.log(`   ${index + 1}. ${title}`);
        console.log(`      Subject: ${subject} | Grade: ${grade}`);
      });
      if (totalExams > 5) {
        console.log(`   ... and ${totalExams - 5} more`);
      }
    } else {
      console.log("   ℹ️ No exams found yet");
      console.log("   💡 Admin can create exams through the admin panel");
    }
    console.log();

    // 5. Check unsubscribed students
    console.log("📋 Step 5: Unsubscribed Students Check");
    const allStudents = await Student.find().lean();
    const subscribedStudentIds = subscriptions.map(sub => 
      sub.studentId?._id?.toString() || sub.studentId?.toString()
    ).filter(Boolean);
    
    const unsubscribedStudents = allStudents.filter(student => 
      !subscribedStudentIds.includes(student._id.toString())
    );
    
    console.log(`   Total Students: ${allStudents.length}`);
    console.log(`   Subscribed: ${subscriptions.length}`);
    console.log(`   Unsubscribed: ${unsubscribedStudents.length}`);
    
    if (unsubscribedStudents.length > 0) {
      console.log("\n   ⚠️ Students not subscribed to Ghost Teacher:");
      unsubscribedStudents.slice(0, 5).forEach((student, index) => {
        console.log(`   ${index + 1}. ${student.name} (${student.email})`);
      });
      if (unsubscribedStudents.length > 5) {
        console.log(`   ... and ${unsubscribedStudents.length - 5} more`);
      }
      console.log("\n   💡 These students will be auto-subscribed on next login");
      console.log("   💡 Or run: node Backend/scripts/subscribe-all-students-to-ghost.js");
    } else {
      console.log("   ✅ All students are subscribed to Ghost Teacher!");
    }
    console.log();

    // 6. Summary
    console.log("=" .repeat(70));
    console.log("📊 SUMMARY");
    console.log("=" .repeat(70));
    console.log();
    
    const isConfigured = ghostTeacherId && mongoose.Types.ObjectId.isValid(ghostTeacherId);
    const teacherExists = !!ghostTeacher;
    const hasExams = totalExams > 0;
    const hasSubscriptions = subscriptions.length > 0;
    const allSubscribed = unsubscribedStudents.length === 0;
    
    console.log(`✅ Ghost Teacher Configured: ${isConfigured ? "YES" : "NO"}`);
    console.log(`✅ Ghost Teacher in Database: ${teacherExists ? "YES" : "NO"}`);
    console.log(`${hasExams ? "✅" : "ℹ️"} Ghost Examinations: ${totalExams}`);
    console.log(`${hasSubscriptions ? "✅" : "ℹ️"} Student Subscriptions: ${subscriptions.length}`);
    console.log(`${allSubscribed ? "✅" : "⚠️"} All Students Subscribed: ${allSubscribed ? "YES" : "NO"}`);
    
    console.log("\n🎯 System Status:");
    if (isConfigured && teacherExists) {
      console.log("✅ Ghost Teacher system is properly configured!");
      console.log("\n📝 Details:");
      console.log(`   • Teacher: ${ghostTeacher.name}`);
      console.log(`   • Email: ${ghostTeacher.email}`);
      console.log(`   • Total Exams: ${totalExams}`);
      console.log(`   • Subscribed Students: ${subscriptions.length}/${allStudents.length}`);
      
      if (unsubscribedStudents.length > 0) {
        console.log("\n⚠️ Action Items:");
        console.log(`   • ${unsubscribedStudents.length} students need subscription`);
        console.log("   • They will be auto-subscribed on next login");
        console.log("   • Or run: node Backend/scripts/subscribe-all-students-to-ghost.js");
      }
      
      if (totalExams === 0) {
        console.log("\nℹ️ Next Steps:");
        console.log("   • Admin can create Ghost Examinations through admin panel");
        console.log("   • All students will see them automatically");
      }
    } else {
      console.log("❌ Ghost Teacher system needs configuration");
      console.log("\n💡 Action Required:");
      console.log("   • Check the Ghost Teacher ID in Backend/config/ghostTeacher.js");
      console.log("   • Ensure it matches a valid teacher in your database");
    }
    
    console.log("\n" + "=".repeat(70));

  } catch (error) {
    console.error("\n❌ Error during verification:", error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from database");
  }
}

verifyGhostTeacher();

