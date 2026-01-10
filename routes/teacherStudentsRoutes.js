const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  checkUsageLimits,
  updateUsageCount,
} = require("../middleware/usageLimits");
const checkStudentTeacherEligibility = require("../middleware/checkStudentTeacherEligibility");

const {
  getMyStudents,
  getAllTeachersPublic, // ✅ أضف هذه هنا
  subscribeStudentToTeacher, // ✅ أضف الجديد هنا فقط مرة واحدة
} = require("../controllers/teacherStudentsController");

// ✅ جلب طلاب المعلم
router.get("/my-students", authMiddleware, getMyStudents);

// ✅ مسار جلب كل المعلمين (بدون توكن)
router.get("/all-teachers", getAllTeachersPublic);

// ✅ اشتراك طالب عند معلم مع التحقق من حدود الاشتراك
router.post(
  "/subscribe",
  authMiddleware,
  checkUsageLimits("student"),
  checkStudentTeacherEligibility, // ✅ الجديد

  subscribeStudentToTeacher,
  updateUsageCount("student", true)
);
//router.post("/subscribe", authMiddleware, teacherStudentsController.subscribeStudentToTeacher);

module.exports = router;
