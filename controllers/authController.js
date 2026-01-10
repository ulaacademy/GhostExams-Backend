const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const mongoose = require("mongoose");

const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const User = require("../models/User");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const ExamResult = require("../models/ExamResult");
const TeacherStudentSubscription = require("../models/TeacherStudentSubscription");
const { ghostTeacherId } = require("../config/ghostTeacher");

// ✅ Helper: Validate Jordan phone (077/078/079 + 10 digits)
function normalizeAndValidatePhone(phone) {
  const cleanPhone = String(phone || "").trim();
  if (!cleanPhone) {
    return { ok: false, message: "❌ رقم الهاتف مطلوب" };
  }
  if (!/^07[789]\d{7}$/.test(cleanPhone)) {
    return {
      ok: false,
      message: "❌ رقم الهاتف يجب أن يكون 10 أرقام ويبدأ بـ 077 أو 078 أو 079",
    };
  }
  return { ok: true, phone: cleanPhone };
}

// ✅ Helper: Resolve ghost teacher id safely (find/create if needed)
async function resolveGhostTeacherIdSafely() {
  let actualGhostTeacherId = ghostTeacherId;

  // لو config غلط أو فاضي
  if (
    !actualGhostTeacherId ||
    !mongoose.Types.ObjectId.isValid(actualGhostTeacherId)
  ) {
    // حاول تلاقيه بالاسم/الإيميل
    let ghostTeacher = await Teacher.findOne({
      $or: [
        { name: /ghost/i },
        { email: /ghost/i },
        { name: /Ghost Examinations/i },
      ],
    });

    // لو مش موجود — أنشئه
    if (!ghostTeacher) {
      const defaultPassword = await bcrypt.hash("GhostTeacher@123", 10);
      ghostTeacher = await Teacher.create({
        name: "Ghost Examinations",
        email: "ghost@ghostexams.com",
        password: defaultPassword,
        subjects: ["جميع المواد"],
        role: "teacher",
        isBanned: false,
      });
    }

    return ghostTeacher._id.toString();
  }

  // config شكله صحيح — تأكد موجود بالـ DB
  const ghostTeacher = await Teacher.findById(actualGhostTeacherId);
  if (!ghostTeacher) {
    // حاول تلاقيه بالاسم/الإيميل
    let foundTeacher = await Teacher.findOne({
      $or: [
        { name: /ghost/i },
        { email: /ghost/i },
        { name: /Ghost Examinations/i },
      ],
    });

    if (!foundTeacher) {
      const defaultPassword = await bcrypt.hash("GhostTeacher@123", 10);
      foundTeacher = await Teacher.create({
        name: "Ghost Examinations",
        email: "ghost@ghostexams.com",
        password: defaultPassword,
        subjects: ["جميع المواد"],
        role: "teacher",
        isBanned: false,
      });
    }

    return foundTeacher._id.toString();
  }

  return actualGhostTeacherId.toString();
}

// ✅ تسجيل طالب جديد
exports.registerStudent = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      grade,
      subscriptions = [],
      phone,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "❌ الاسم والبريد الإلكتروني وكلمة المرور مطلوبة",
      });
    }

    // ✅ phone validation
    const phoneCheck = normalizeAndValidatePhone(phone);
    if (!phoneCheck.ok) {
      return res.status(400).json({ message: phoneCheck.message });
    }

    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res
        .status(400)
        .json({ message: "❌ البريد الإلكتروني مسجل مسبقًا" });
    }

    // ✅ grade (optional)
    let gradeNumber = null;
    if (grade !== undefined && grade !== null && grade !== "") {
      const parsedGrade =
        typeof grade === "string" ? parseFloat(grade) : Number(grade);
      if (!isNaN(parsedGrade) && isFinite(parsedGrade)) {
        gradeNumber = Math.floor(parsedGrade);
      } else {
        console.warn(
          "⚠️ Invalid grade value provided:",
          grade,
          "- ignoring it"
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newStudent = new Student({
      name,
      email,
      phone: phoneCheck.phone,
      password: hashedPassword,
      grade: gradeNumber,
      subscriptions,
    });

    await newStudent.save();

    // ✅ ربط الطالب بالمعلم الافتراضي (Ghost) (خلال التسجيل)
    try {
      const actualGhostTeacherId = await resolveGhostTeacherIdSafely();

      const existingSubscription = await TeacherStudentSubscription.findOne({
        studentId: newStudent._id,
        teacherId: actualGhostTeacherId,
      });

      if (!existingSubscription) {
        await TeacherStudentSubscription.create({
          studentId: newStudent._id,
          teacherId: actualGhostTeacherId,
          type: "free",
          startDate: new Date(),
        });
      }
    } catch (subscriptionError) {
      console.error(
        "❌ Ghost subscription failed (registerStudent):",
        subscriptionError?.message
      );
    }

    // (اختياري) ExamResult افتراضي
    const defaultExam = new ExamResult({
      userId: newStudent._id,
      examId: newStudent._id,
      score: 0,
      totalQuestions: 0,
      date: new Date(),
    });
    await defaultExam.save();

    const token = jwt.sign(
      { userId: newStudent._id, role: "student" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "✅ تم تسجيل الطالب بنجاح",
      student: {
        id: newStudent._id,
        name: newStudent.name,
        email: newStudent.email,
        phone: newStudent.phone,
        grade: newStudent.grade,
        subscriptions: newStudent.subscriptions,
      },
      token,
    });
  } catch (error) {
    console.error("❌ خطأ في تسجيل الطالب:", error);
    res.status(500).json({ message: "❌ خطأ في تسجيل الطالب", error });
  }
};

// ✅ تسجيل معلم جديد
exports.registerTeacher = async (req, res) => {
  try {
    const { name, email, password, subject, phone } = req.body;
    const profileImageFile = req.file;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "❌ الاسم والبريد وكلمة المرور مطلوبة" });
    }

    if (!profileImageFile) {
      return res
        .status(400)
        .json({ message: "❌ يجب رفع صورة للمعلم أثناء التسجيل." });
    }

    const phoneCheck = normalizeAndValidatePhone(phone);
    if (!phoneCheck.ok) {
      return res.status(400).json({ message: phoneCheck.message });
    }

    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({ message: "❌ البريد مستخدم بالفعل." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let profileImagePath = null;
    if (profileImageFile) {
      const backendRoot = path.join(__dirname, "..");
      const relativePath = path.relative(
        backendRoot,
        profileImageFile.path || ""
      );
      profileImagePath = relativePath ? relativePath.replace(/\\/g, "/") : null;
    }

    const teacher = new Teacher({
      name,
      email,
      phone: phoneCheck.phone,
      password: hashedPassword,
      subjects: subject ? [subject] : [],
      profileImage: profileImagePath,
    });

    await teacher.save();

    const token = jwt.sign(
      { userId: teacher._id, role: "teacher" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "✅ تم تسجيل المعلم بنجاح",
      token,
      user: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        role: "teacher",
        profileImage: teacher.profileImage || null,
      },
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        role: "teacher",
        profileImage: teacher.profileImage || null,
        subjects: teacher.subjects,
      },
    });
  } catch (error) {
    console.error("❌ خطأ أثناء تسجيل المعلم:", error);
    res.status(500).json({ message: "❌ حدث خطأ أثناء إنشاء حساب المعلم" });
  }
};

// ✅ تسجيل الدخول الموحد
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await Student.findOne({ email });
    let role = "student";

    if (!user) {
      user = await Teacher.findOne({ email });
      role = "teacher";
    }

    // admin
    if (!user) {
      const adminUser = await User.findOne({ email, role: "admin" });
      if (adminUser) {
        const isMatch = await bcrypt.compare(password, adminUser.password);
        if (!isMatch)
          return res.status(401).json({ message: "❌ كلمة المرور غير صحيحة" });

        const token = jwt.sign(
          { userId: adminUser._id, role: "admin" },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        return res.status(200).json({
          message: "✅ تم تسجيل الدخول بنجاح كأدمن",
          token,
          user: {
            _id: adminUser._id,
            id: adminUser._id,
            name: adminUser.name,
            email: adminUser.email,
            role: "admin",
          },
        });
      }
    }

    if (!user)
      return res
        .status(401)
        .json({ message: "❌ البريد الإلكتروني غير موجود" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "❌ كلمة المرور غير صحيحة" });

    // ✅ ربط الطالب بالمعلم الافتراضي (Ghost) — بشكل آمن (ما بكسر اللوجين)
    if (role === "student") {
      try {
        const actualGhostTeacherId = await resolveGhostTeacherIdSafely();

        const existingSubscription = await TeacherStudentSubscription.findOne({
          studentId: user._id,
          teacherId: actualGhostTeacherId,
        });

        if (!existingSubscription) {
          await TeacherStudentSubscription.create({
            studentId: user._id,
            teacherId: actualGhostTeacherId,
            type: "free",
            startDate: new Date(),
          });
        }
      } catch (e) {
        console.error("⚠️ Ghost subscription skipped (login):", e?.message);
      }
    }

    const token = jwt.sign({ userId: user._id, role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      message: `✅ تم تسجيل الدخول بنجاح كـ${
        role === "student" ? "طالب" : "معلم"
      }`,
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role,
        grade: user.grade || undefined,
        profileImage: user.profileImage || undefined,
        phone: user.phone || undefined,
      },
    });
  } catch (error) {
    console.error("❌ خطأ في تسجيل الدخول:", error);
    res.status(500).json({ message: "❌ خطأ في تسجيل الدخول", error });
  }
};

// ✅ تسجيل دخول الطالب
exports.loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;

    const student = await Student.findOne({ email });
    if (!student)
      return res.status(401).json({ message: "❌ الطالب غير موجود" });

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch)
      return res.status(401).json({ message: "❌ كلمة المرور غير صحيحة" });

    // ✅ Ghost subscription (safe)
    try {
      const actualGhostTeacherId = await resolveGhostTeacherIdSafely();

      const existingSubscription = await TeacherStudentSubscription.findOne({
        studentId: student._id,
        teacherId: actualGhostTeacherId,
      });

      if (!existingSubscription) {
        await TeacherStudentSubscription.create({
          studentId: student._id,
          teacherId: actualGhostTeacherId,
          type: "free",
          startDate: new Date(),
        });
      }
    } catch (e) {
      console.error(
        "⚠️ Ghost subscription skipped (loginStudent):",
        e?.message
      );
    }

    const token = jwt.sign(
      { userId: student._id, role: "student" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "✅ تم تسجيل الدخول بنجاح كطالب",
      token,
      user: {
        id: student._id,
        name: student.name,
        email: student.email,
        role: "student",
        phone: student.phone || undefined,
      },
    });
  } catch (error) {
    console.error("❌ خطأ في تسجيل دخول الطالب:", error);
    res.status(500).json({ message: "❌ خطأ في تسجيل دخول الطالب", error });
  }
};

// ✅ تسجيل دخول المعلم
exports.loginTeacher = async (req, res) => {
  try {
    const { email, password } = req.body;

    const teacher = await Teacher.findOne({ email });
    if (!teacher)
      return res.status(401).json({ message: "❌ المعلم غير موجود" });

    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch)
      return res.status(401).json({ message: "❌ كلمة المرور غير صحيحة" });

    const token = jwt.sign(
      { userId: teacher._id, role: "teacher" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "✅ تم تسجيل الدخول بنجاح كمعلم",
      token,
      user: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        role: "teacher",
        profileImage: teacher.profileImage || undefined,
        phone: teacher.phone || undefined,
      },
    });
  } catch (error) {
    console.error("❌ خطأ في تسجيل دخول المعلم:", error);
    res.status(500).json({ message: "❌ خطأ في تسجيل دخول المعلم", error });
  }
};

// ✅ تسجيل دخول الأدمن
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const adminUser = await User.findOne({ email, role: "admin" });
    if (!adminUser)
      return res.status(401).json({ message: "❌ الأدمن غير موجود" });

    const isMatch = await bcrypt.compare(password, adminUser.password);
    if (!isMatch)
      return res.status(401).json({ message: "❌ كلمة المرور غير صحيحة" });

    const token = jwt.sign(
      { userId: adminUser._id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "✅ تم تسجيل الدخول بنجاح كأدمن",
      token,
      user: {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: "admin",
      },
    });
  } catch (error) {
    console.error("❌ خطأ في تسجيل دخول الأدمن:", error);
    res.status(500).json({ message: "❌ خطأ في تسجيل دخول الأدمن", error });
  }
};

// ✅ تسجيل الخروج
exports.logout = async (req, res) => {
  try {
    res
      .status(200)
      .json({ success: true, message: "✅ تم تسجيل الخروج بنجاح" });
  } catch (error) {
    console.error("❌ خطأ في تسجيل الخروج:", error);
    res.status(500).json({
      success: false,
      message: "❌ خطأ في تسجيل الخروج",
      error: error.message,
    });
  }
};

// ✅ جلب معلومات المستخدم
exports.getProfile = async (req, res) => {
  try {
    const user = req.user;
    if (!user)
      return res.status(401).json({ error: "❌ المستخدم غير مصرح له." });

    const role = user.role || (user.grade ? "student" : "teacher");

    res.json({
      userId: user._id || user.userId || user.id,
      name: user.name,
      email: user.email,
      role,
      phone: user.phone || undefined,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء جلب بيانات المستخدم:", error);
    res.status(500).json({ error: "❌ حدث خطأ داخلي." });
  }
};
