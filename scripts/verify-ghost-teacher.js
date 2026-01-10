// Backend/scripts/verify-ghost-teacher.js
// ✅ Script to verify Ghost Teacher setup

const mongoose = require("mongoose");
const Teacher = require("../models/Teacher");
const Exam = require("../models/Exam");
const TeacherStudentSubscription = require("../models/TeacherStudentSubscription");
const { ghostTeacherId } = require("../config/ghostTeacher");

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

async function verifyGhostTeacher() {
  try {
    console.log("🔍 Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log("✅ Connected to database\n");

    // 1. Check if Ghost Teacher ID is configured
    console.log("📋 Step 1: Checking Ghost Teacher Configuration");
    console.log("   Ghost Teacher ID in config:", ghostTeacherId);
    
    if (!ghostTeacherId) {
      console.log("   ❌ ghostTeacherId is not configured in config/ghostTeacher.js");
      console.log("   💡 Please set the ghostTeacherId in Backend/config/ghostTeacher.js\n");
    } else if (!mongoose.Types.ObjectId.isValid(ghostTeacherId)) {
      console.log("   ❌ ghostTeacherId is not a valid ObjectId");
      console.log("   💡 Please update the ghostTeacherId in Backend/config/ghostTeacher.js\n");
    } else {
      console.log("   ✅ Ghost Teacher ID is properly configured\n");
    }

    // 2. Check if Ghost Teacher exists in database
    console.log("📋 Step 2: Checking if Ghost Teacher exists in database");
    let ghostTeacher = null;
    
    if (ghostTeacherId && mongoose.Types.ObjectId.isValid(ghostTeacherId)) {
      ghostTeacher = await Teacher.findById(ghostTeacherId);
    }
    
    if (!ghostTeacher) {
      console.log("   ⚠️ Ghost Teacher not found by ID, searching by name...");
      ghostTeacher = await Teacher.findOne({
        $or: [
          { name: /ghost/i },
          { email: /ghost/i },
          { name: /Ghost Examinations/i }
        ]
      });
    }

    if (ghostTeacher) {
      console.log("   ✅ Ghost Teacher found:");
      console.log("      ID:", ghostTeacher._id.toString());
      console.log("      Name:", ghostTeacher.name);
      console.log("      Email:", ghostTeacher.email);
      console.log("      Subjects:", ghostTeacher.subjects.join(", "));
      console.log("      Created:", ghostTeacher.createdAt);
      
      if (ghostTeacher._id.toString() !== ghostTeacherId) {
        console.log("\n   ⚠️ WARNING: Ghost Teacher ID in database doesn't match config!");
        console.log("   💡 Please update Backend/config/ghostTeacher.js with:");
        console.log(`      ghostTeacherId: "${ghostTeacher._id.toString()}"`);
      }
      console.log();
    } else {
      console.log("   ❌ Ghost Teacher not found in database");
      console.log("   💡 Ghost Teacher will be created automatically on next student registration\n");
    }

    // 3. Check Ghost Examinations
    console.log("📋 Step 3: Checking Ghost Examinations");
    const ghostExams = await Exam.find({ examType: "ghost" })
      .populate("questions")
      .sort({ createdAt: -1 });
    
    console.log(`   Found ${ghostExams.length} Ghost Examinations`);
    
    if (ghostExams.length > 0) {
      console.log("\n   📝 Recent Ghost Examinations:");
      ghostExams.slice(0, 5).forEach((exam, index) => {
        console.log(`   ${index + 1}. ${exam.title}`);
        console.log(`      Subject: ${exam.subject} | Grade: ${exam.grade} | Term: ${exam.term}`);
        console.log(`      Questions: ${exam.questions?.length || 0} | Duration: ${exam.duration} min`);
        console.log(`      Created: ${exam.createdAt?.toLocaleDateString('ar-SA')}`);
      });
      
      if (ghostExams.length > 5) {
        console.log(`   ... and ${ghostExams.length - 5} more`);
      }
    } else {
      console.log("   ℹ️ No Ghost Examinations found yet");
      console.log("   💡 Admin can create Ghost Examinations through the admin panel");
    }
    console.log();

    // 4. Check Student Subscriptions to Ghost Teacher
    console.log("📋 Step 4: Checking Student Subscriptions to Ghost Teacher");
    if (ghostTeacher) {
      const subscriptions = await TeacherStudentSubscription.find({
        teacherId: ghostTeacher._id
      }).populate("studentId", "name email");
      
      console.log(`   Found ${subscriptions.length} students subscribed to Ghost Teacher`);
      
      if (subscriptions.length > 0) {
        console.log("\n   👥 Recent Subscriptions:");
        subscriptions.slice(0, 5).forEach((sub, index) => {
          console.log(`   ${index + 1}. ${sub.studentId?.name || "Unknown"} (${sub.studentId?.email || "N/A"})`);
          console.log(`      Type: ${sub.type} | Started: ${sub.startDate?.toLocaleDateString('ar-SA')}`);
        });
        
        if (subscriptions.length > 5) {
          console.log(`   ... and ${subscriptions.length - 5} more`);
        }
      } else {
        console.log("   ℹ️ No students subscribed yet");
        console.log("   💡 New students will be automatically subscribed on registration");
      }
    } else {
      console.log("   ⚠️ Cannot check subscriptions - Ghost Teacher not found");
    }
    console.log();

    // 5. Summary
    console.log("=" .repeat(60));
    console.log("📊 SUMMARY");
    console.log("=" .repeat(60));
    
    const isConfigured = ghostTeacherId && mongoose.Types.ObjectId.isValid(ghostTeacherId);
    const teacherExists = !!ghostTeacher;
    const hasExams = ghostExams.length > 0;
    const hasSubscriptions = ghostTeacher ? await TeacherStudentSubscription.countDocuments({ teacherId: ghostTeacher._id }) > 0 : false;
    
    console.log(`Ghost Teacher Configuration: ${isConfigured ? "✅" : "❌"}`);
    console.log(`Ghost Teacher in Database: ${teacherExists ? "✅" : "⚠️"}`);
    console.log(`Ghost Examinations: ${hasExams ? `✅ (${ghostExams.length})` : "ℹ️ (0)"}`);
    console.log(`Student Subscriptions: ${hasSubscriptions ? "✅" : "ℹ️ (0)"}`);
    
    console.log("\n🎯 System Status:");
    if (isConfigured && teacherExists) {
      console.log("✅ Ghost Teacher system is properly configured and ready!");
      console.log("\n📝 Next Steps:");
      console.log("   1. Admin can create Ghost Examinations through admin panel");
      console.log("   2. New students will automatically see Ghost Examinations");
      console.log("   3. Existing students will be subscribed on next login");
    } else if (!isConfigured && teacherExists) {
      console.log("⚠️ Ghost Teacher exists but config needs update");
      console.log("\n💡 Action Required:");
      console.log(`   Update Backend/config/ghostTeacher.js with:`);
      console.log(`   ghostTeacherId: "${ghostTeacher._id.toString()}"`);
    } else {
      console.log("⚠️ Ghost Teacher system needs setup");
      console.log("\n💡 Action Required:");
      console.log("   1. System will auto-create Ghost Teacher on next student registration");
      console.log("   2. Or run: node Backend/scripts/create-ghost-teacher.js");
    }
    
    console.log("\n" + "=".repeat(60));

  } catch (error) {
    console.error("❌ Error during verification:", error);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from database");
  }
}

verifyGhostTeacher();

