const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const User = require("../models/User"); // أو حسب المسار الصحيح لنموذج المستخدم
const teacherImageUpload = require("../middleware/teacherImageUpload");

const authMiddleware = require("../middleware/authMiddleware");

// ✅ تسجيل الدخول الموحد
router.post("/login", authController.login);

// ✅ تسجيل الخروج
router.post("/logout", authController.logout);

router.post("/login-student", authController.loginStudent);
router.post("/login-teacher", authController.loginTeacher);
router.post("/login-admin", authController.loginAdmin);

// ✅ تسجيل طالب جديد (المسار الأساسي `register`)
router.post("/register", authController.registerStudent);

// ✅ تسجيل طالب جديد (بديل لنفس الطلب)
router.post("/register-student", authController.registerStudent);

// ✅ تسجيل معلم جديد
router.post(
  "/register-teacher",
  teacherImageUpload.single("profileImage"),
  authController.registerTeacher
);

// ✅ تسجيل الدخول
//router.post("/login", authController.loginUser);

// ✅ إضافة مسار لجلب بيانات المستخدم
router.get("/profile", authMiddleware, authController.getProfile);

// ✅ جلب بيانات المستخدم (يتطلب المصادقة)
// router.get("/profile", authMiddleware, authController.getUserProfile);

// ✅ إضافة مسار محمي لاختباره (يحتاج إلى تسجيل دخول)
router.get("/protected", authMiddleware, (req, res) => {
  res.json({ message: "🔒 تم الوصول إلى المسار المحمي!", user: req.user });
});

// ⚠️ مسار مؤقت لإنشاء حساب أدمن من خلال Postman
router.post("/create-admin-temp", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // تحقق إذا الأدمن موجود مسبقًا
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "❌ الأدمن موجود بالفعل" });
    }

    // إنشاء كلمة مرور مشفرة
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

    // إنشاء المستخدم
    const newAdmin = new User({
      name,
      email,
      password: hashedPassword,
      role: "admin", // 🟢 تأكد من أن هذا الحقل معتمد في الـ schema
    });

    await newAdmin.save();

    res
      .status(201)
      .json({ message: "✅ تم إنشاء الأدمن بنجاح", adminId: newAdmin._id });
  } catch (error) {
    console.error("❌ خطأ في إنشاء الأدمن:", error);
    res.status(500).json({ message: "❌ فشل في إنشاء الأدمن" });
  }
});

module.exports = router;
