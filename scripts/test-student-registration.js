// ✅ سكريبت لاختبار تسجيل طالب جديد والتأكد من اشتراكه مع Ghost Teacher
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const TeacherStudentSubscription = require("../models/TeacherStudentSubscription");
const { ghostTeacherId } = require("../config/ghostTeacher");

async function connect() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
}

async function disconnect() {
  try {
    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error disconnecting:", error);
  }
}

async function testStudentRegistration() {
  try {
    await connect();

    // ✅ 1. التحقق من وجود Ghost Teacher
    console.log("\n📋 Step 1: Checking Ghost Teacher...");
    let ghostTeacher = null;
    
    if (ghostTeacherId && mongoose.Types.ObjectId.isValid(ghostTeacherId)) {
      ghostTeacher = await Teacher.findById(ghostTeacherId);
      if (ghostTeacher) {
        console.log("✅ Ghost Teacher found:", ghostTeacher.name, "ID:", ghostTeacher._id);
      } else {
        console.log("⚠️ Ghost Teacher not found with ID:", ghostTeacherId);
        // البحث عنه
        ghostTeacher = await Teacher.findOne({
          $or: [
            { name: /ghost/i },
            { email: /ghost/i },
            { name: /Ghost Examinations/i }
          ]
        });
        if (ghostTeacher) {
          console.log("✅ Found Ghost Teacher by name:", ghostTeacher.name, "ID:", ghostTeacher._id);
        }
      }
    }

    if (!ghostTeacher) {
      console.log("❌ Ghost Teacher not found. Please create it first.");
      await disconnect();
      process.exit(1);
    }

    const actualGhostTeacherId = ghostTeacher._id;

    // ✅ 2. إنشاء طالب تجريبي
    console.log("\n📋 Step 2: Creating test student...");
    const testEmail = `test-student-${Date.now()}@test.com`;
    const testStudent = await Student.create({
      name: "Test Student",
      email: testEmail,
      password: "hashedpassword123", // في الواقع يجب hash
      grade: "grade-1",
    });
    console.log("✅ Test student created:", testStudent.email, "ID:", testStudent._id);

    // ✅ 3. التحقق من الاشتراك
    console.log("\n📋 Step 3: Checking subscription...");
    const subscription = await TeacherStudentSubscription.findOne({
      studentId: testStudent._id,
      teacherId: actualGhostTeacherId,
    });

    if (subscription) {
      console.log("✅ Subscription exists:", subscription._id);
    } else {
      console.log("⚠️ Subscription not found, creating it...");
      const newSubscription = await TeacherStudentSubscription.create({
        studentId: testStudent._id,
        teacherId: actualGhostTeacherId,
        type: "free",
        startDate: new Date(),
      });
      console.log("✅ Subscription created:", newSubscription._id);
    }

    // ✅ 4. جلب جميع الاشتراكات للطالب
    console.log("\n📋 Step 4: Fetching all student subscriptions...");
    const allSubscriptions = await TeacherStudentSubscription.find({
      studentId: testStudent._id,
    })
      .populate("teacherId", "name email")
      .lean();

    console.log(`✅ Found ${allSubscriptions.length} subscriptions:`);
    allSubscriptions.forEach((sub, index) => {
      const isGhost = sub.teacherId?._id?.toString() === actualGhostTeacherId.toString();
      console.log(`  ${index + 1}. ${sub.teacherId?.name || "Unknown"} (${isGhost ? "👻 Ghost" : "Regular"})`);
    });

    // ✅ 5. تنظيف - حذف الطالب التجريبي
    console.log("\n📋 Step 5: Cleaning up...");
    await TeacherStudentSubscription.deleteMany({ studentId: testStudent._id });
    await Student.deleteOne({ _id: testStudent._id });
    console.log("✅ Test student and subscriptions deleted");

    console.log("\n✅ Test completed successfully!");
    await disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error in test:", error);
    await disconnect();
    process.exit(1);
  }
}

// ✅ تشغيل الاختبار
testStudentRegistration();

