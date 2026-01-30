const jwt = require("jsonwebtoken");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const User = require("../models/User");
require("dotenv").config();

const {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
} = require("../utils/AppError");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AuthenticationError(
        " لم يتم العثور على التوكن الرجاء تسجيل دخول او عمل حساب بالموقع ",
      );
    }

    const token = authHeader.split(" ")[1];

    // Check if JWT_SECRET exists
    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET is not configured in .env");
      throw new Error("Server configuration error"); // Will be caught by error handler
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Token decoded:", {
      userId: decoded.userId,
      role: decoded.role,
    });

    // نبحث عن المستخدم حسب الدور
    let user;
    if (decoded.role === "student") {
      user = await Student.findById(decoded.userId);
    } else if (decoded.role === "teacher") {
      user = await Teacher.findById(decoded.userId);
    } else if (decoded.role === "admin") {
      user = await User.findById(decoded.userId);
    }

    if (!user) {
      throw new NotFoundError("المستخدم");
    }

    // ✅ تمرير البيانات الكاملة + id و role بشكل صريح
    req.user = {
      ...user._doc, // هذا بيحتفظ بكل الحقول الموجودة (name, email, إلخ)
      id: user._id.toString(),
      userId: user._id.toString(), // للتوافق مع الكود القديم
      role: decoded.role,
    };

    // ✅ Store the full user object for use in other middleware (like checkUsageLimits)
    // This avoids redundant database lookups
    if (decoded.role === "teacher") {
      req.teacher = user; // Store the teacher document for later use
    }

    // 🚫 منع الوصول إذا كان المستخدم محظورًا
    if (req.user.isBanned) {
      console.warn("🚫 Banned user attempted access:", {
        id: req.user.id,
        role: req.user.role,
      });
      throw new AuthorizationError("تم حظر حسابك. تواصل مع الدعم للمزيد");
    }

    console.log("✅ Auth successful:", {
      id: req.user.id,
      role: req.user.role,
    });
    next();
  } catch (error) {
    // ✅ If it's already an AppError, pass it along
    if (
      error instanceof AuthenticationError ||
      error instanceof AuthorizationError ||
      error instanceof NotFoundError
    ) {
      return next(error);
    }

    // ✅ Handle JWT-specific errors
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return next(new AuthenticationError("توكن غير صالح أو منتهي الصلاحية"));
    }

    // ✅ For any other error, pass to global error handler
    next(error);
  }
};

module.exports = authMiddleware;
