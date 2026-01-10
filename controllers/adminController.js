const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const User = require("../models/User");
const mongoose = require("mongoose");
const StudentSubscription = require("../models/StudentSubscription");
const Subscription = require("../models/Subscription");

// List all admin users (role admin only lives in `User`)
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).select(
      "_id name email role createdAt"
    );
    res.json({ count: admins.length, admins });
  } catch (error) {
    console.error("❌ Error fetching admins:", error);
    res.status(500).json({ message: "❌ فشل في جلب الأدمن" });
  }
};

// List students with pagination + search
exports.getAllStudents = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100
    );
    const search = (req.query.search || "").trim();
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Student.countDocuments(filter);
    const students = await Student.find(filter)
      .select("_id name email grade role isBanned createdAt")
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      items: students,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("❌ Error fetching students:", error);
    res.status(500).json({ message: "❌ فشل في جلب الطلاب" });
  }
};

// List teachers with pagination + search
exports.getAllTeachers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100
    );
    const search = (req.query.search || "").trim();
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Teacher.countDocuments(filter);
    const teachers = await Teacher.find(filter)
      .select("_id name email subjects role isBanned createdAt")
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      items: teachers,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("❌ Error fetching teachers:", error);
    res.status(500).json({ message: "❌ فشل في جلب المعلمين" });
  }
};

// Ban/unban student
exports.setStudentBan = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBanned } = req.body;
    if (typeof isBanned !== "boolean") {
      return res
        .status(400)
        .json({ message: "❌ isBanned يجب أن تكون قيمة منطقية" });
    }
    const student = await Student.findByIdAndUpdate(
      id,
      { $set: { isBanned } },
      { new: true, runValidators: true }
    ).select("_id name email grade isBanned");
    if (!student)
      return res.status(404).json({ message: "❌ الطالب غير موجود" });
    res.json({
      message: isBanned ? "🚫 تم حظر الطالب" : "✅ تم إلغاء الحظر عن الطالب",
      student,
    });
  } catch (error) {
    console.error("❌ Error banning student:", error);
    res.status(500).json({ message: "❌ فشل تحديث حالة الحظر للطالب" });
  }
};

// Ban/unban teacher
exports.setTeacherBan = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBanned } = req.body;
    if (typeof isBanned !== "boolean") {
      return res
        .status(400)
        .json({ message: "❌ isBanned يجب أن تكون قيمة منطقية" });
    }
    const teacher = await Teacher.findByIdAndUpdate(
      id,
      { $set: { isBanned } },
      { new: true, runValidators: true }
    ).select("_id name email subjects isBanned");
    if (!teacher)
      return res.status(404).json({ message: "❌ المعلم غير موجود" });
    res.json({
      message: isBanned ? "🚫 تم حظر المعلم" : "✅ تم إلغاء الحظر عن المعلم",
      teacher,
    });
  } catch (error) {
    console.error("❌ Error banning teacher:", error);
    res.status(500).json({ message: "❌ فشل تحديث حالة الحظر للمعلم" });
  }
};

// Delete student (hard delete)
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Student.findByIdAndDelete(id);
    if (!deleted)
      return res.status(404).json({ message: "❌ الطالب غير موجود" });

    // ✅ احذف كل اشتراكات الطالب
    await StudentSubscription.deleteMany({ studentId: id });

    res.json({ message: "🗑️ تم حذف الطالب + حذف اشتراكات الطالب", id });
  } catch (error) {
    console.error("❌ Error deleting student:", error);
    res.status(500).json({ message: "❌ فشل حذف الطالب" });
  }
};

// Delete teacher (hard delete)
exports.deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Teacher.findByIdAndDelete(id);
    if (!deleted)
      return res.status(404).json({ message: "❌ المعلم غير موجود" });

    // ✅ احذف اشتراك المعلم
    await Subscription.deleteMany({ teacherId: id });

    res.json({ message: "🗑️ تم حذف المعلم + حذف اشتراك المعلم", id });
  } catch (error) {
    console.error("❌ Error deleting teacher:", error);
    res.status(500).json({ message: "❌ فشل حذف المعلم" });
  }
};
  
// Optionally delete admin (guard to prevent self-delete)
exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id === id) {
      return res.status(400).json({ message: "❌ لا يمكنك حذف حسابك" });
    }
    const deleted = await User.findOneAndDelete({ _id: id, role: "admin" });
    if (!deleted)
      return res.status(404).json({ message: "❌ الأدمن غير موجود" });
    res.json({ message: "🗑️ تم حذف الأدمن", id });
  } catch (error) {
    console.error("❌ Error deleting admin:", error);
    res.status(500).json({ message: "❌ فشل حذف الأدمن" });
  }
};
