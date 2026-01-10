// ✅ سكريبت لربط جميع الطلاب بالمعلم الافتراضي (Ghost Teacher)
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

async function subscribeAllStudentsToGhost() {
  try {
    await connect();

    // ✅ التحقق من وجود Ghost Teacher
    let ghostTeacher = null;
    if (ghostTeacherId && mongoose.Types.ObjectId.isValid(ghostTeacherId)) {
      ghostTeacher = await Teacher.findById(ghostTeacherId);
    }

    // ✅ إذا لم يتم العثور عليه، البحث عنه أو إنشاؤه
    if (!ghostTeacher) {
      console.log("🔍 Searching for Ghost Teacher...");
      ghostTeacher = await Teacher.findOne({
        $or: [
          { name: /ghost/i },
          { email: /ghost/i },
          { name: /Ghost Examinations/i }
        ]
      });

      if (!ghostTeacher) {
        console.log("📝 Creating Ghost Teacher...");
        const bcrypt = require("bcryptjs");
        const defaultPassword = await bcrypt.hash("GhostTeacher@123", 10);
        
        ghostTeacher = await Teacher.create({
          name: "Ghost Examinations",
          email: "ghost@ghostexams.com",
          password: defaultPassword,
          subjects: ["جميع المواد"],
          role: "teacher",
          isBanned: false,
        });
        console.log("✅ Created Ghost Teacher with ID:", ghostTeacher._id);
      }
    }

    const actualGhostTeacherId = ghostTeacher._id;

    // ✅ جلب جميع الطلاب
    const students = await Student.find({});
    console.log(`📊 Found ${students.length} students`);

    let subscribed = 0;
    let alreadySubscribed = 0;
    let errors = 0;

    // ✅ ربط كل طالب بالمعلم الافتراضي
    for (const student of students) {
      try {
        // ✅ التحقق من وجود اشتراك مسبق
        const existingSubscription = await TeacherStudentSubscription.findOne({
          studentId: student._id,
          teacherId: actualGhostTeacherId,
        });

        if (existingSubscription) {
          alreadySubscribed++;
          console.log(`ℹ️ Student ${student.email} already subscribed`);
        } else {
          // ✅ إنشاء الاشتراك
          await TeacherStudentSubscription.create({
            studentId: student._id,
            teacherId: actualGhostTeacherId,
            type: "free",
            startDate: new Date(),
          });
          subscribed++;
          console.log(`✅ Subscribed student: ${student.email}`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error subscribing student ${student.email}:`, error.message);
      }
    }

    console.log("\n📊 Summary:");
    console.log(`✅ Newly subscribed: ${subscribed}`);
    console.log(`ℹ️ Already subscribed: ${alreadySubscribed}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📝 Total students: ${students.length}`);

    await disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error in subscribeAllStudentsToGhost:", error);
    await disconnect();
    process.exit(1);
  }
}

// ✅ تشغيل السكريبت
subscribeAllStudentsToGhost();

