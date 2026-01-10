const Share = require("../models/Share");
const TeacherCustomExam = require("../models/TeacherCustomExam");
const Teacher = require("../models/Teacher");
const TeacherExamResult = require("../models/TeacherExamResult");
const Student = require("../models/Student");
const TeacherStudentSubscription = require("../models/TeacherStudentSubscription");
const authMiddleware = require("../middleware/authMiddleware");
const mongoose = require("mongoose");

// ✅ إنشاء رابط مشاركة
exports.createShare = async (req, res) => {
  try {
    const { shareType, resourceId, sharedWith, expiresInDays } = req.body;
    const user = req.user;

    if (!shareType || !resourceId) {
      return res.status(400).json({
        message: "❌ shareType و resourceId مطلوبان"
      });
    }

    // تحديد resourceModel بناءً على shareType
    let resourceModel;
    if (shareType === "exam") {
      resourceModel = "TeacherCustomExam";
    } else if (shareType === "teacher_profile") {
      resourceModel = "Teacher";
    } else if (shareType === "exam_result") {
      resourceModel = "TeacherExamResult";
    } else {
      return res.status(400).json({
        message: "❌ نوع المشاركة غير صحيح"
      });
    }

    // التحقق من وجود المورد
    let resource;
    if (resourceModel === "TeacherCustomExam") {
      resource = await TeacherCustomExam.findById(resourceId);
    } else if (resourceModel === "Teacher") {
      resource = await Teacher.findById(resourceId);
    } else if (resourceModel === "TeacherExamResult") {
      resource = await TeacherExamResult.findById(resourceId);
    }

    if (!resource) {
      return res.status(404).json({
        message: "❌ المورد غير موجود"
      });
    }

    // تحديد sharedByModel
    const sharedByModel = user.role === "student" ? "Student" : "Teacher";

    // تحديد sharedWith إذا تم تمريره
    let sharedWithModel = null;
    if (sharedWith) {
      // التحقق من نوع المستخدم المستهدف
      const targetStudent = await Student.findById(sharedWith);
      const targetTeacher = await Teacher.findById(sharedWith);
      
      if (targetStudent) {
        sharedWithModel = "Student";
      } else if (targetTeacher) {
        sharedWithModel = "Teacher";
      } else {
        return res.status(404).json({
          message: "❌ المستخدم المستهدف غير موجود"
        });
      }
    }

    // حساب تاريخ الانتهاء
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // إنشاء رابط المشاركة
    const share = await Share.createShare({
      shareType,
      resourceId,
      resourceModel,
      sharedBy: user.id || user._id,
      sharedByModel,
      sharedWith: sharedWith || null,
      sharedWithModel,
      expiresAt
    });

    // إنشاء رابط المشاركة - استخدام رابط الإنتاج
    const shareUrl = `${process.env.FRONTEND_URL || "https://ghostexams.com"}/share/${share.shareToken}`;

    res.status(201).json({
      message: "✅ تم إنشاء رابط المشاركة بنجاح",
      share: {
        token: share.shareToken,
        url: shareUrl,
        expiresAt: share.expiresAt,
        shareType: share.shareType
      }
    });
  } catch (error) {
    console.error("❌ خطأ في إنشاء رابط المشاركة:", error);
    res.status(500).json({
      message: "❌ فشل في إنشاء رابط المشاركة",
      error: error.message
    });
  }
};

// ✅ عرض المحتوى المشترك
exports.viewSharedContent = async (req, res) => {
  try {
    const { token } = req.params;

    const share = await Share.findByToken(token);
    if (!share) {
      return res.status(404).json({
        message: "❌ رابط المشاركة غير صحيح أو منتهي الصلاحية"
      });
    }

    // زيادة عداد الوصول
    await share.incrementAccess();

    // جلب المحتوى المشترك
    let content = null;
    let resourceData = null;

    if (share.resourceModel === "TeacherCustomExam") {
      resourceData = await TeacherCustomExam.findById(share.resourceId);
      // محاولة جلب معلومات المعلم من Teacher أو User
      if (resourceData.teacherId) {
        const Teacher = require("../models/Teacher");
        const User = require("../models/User");
        const teacher = await Teacher.findById(resourceData.teacherId) || 
                       await User.findById(resourceData.teacherId);
        if (teacher) {
          resourceData = resourceData.toObject();
          resourceData.teacherId = {
            _id: teacher._id || resourceData.teacherId,
            name: teacher.name,
            email: teacher.email,
            subjects: teacher.subjects || [],
            profileImage: teacher.profileImage
          };
        }
      }
    } else if (share.resourceModel === "Teacher") {
      resourceData = await Teacher.findById(share.resourceId)
        .select("name email subjects profileImage");
    } else if (share.resourceModel === "TeacherExamResult") {
      resourceData = await TeacherExamResult.findById(share.resourceId)
        .populate("studentId", "name email")
        .populate("examId", "examName subject grade term");
      // محاولة جلب معلومات المعلم
      if (resourceData.teacherId) {
        const Teacher = require("../models/Teacher");
        const User = require("../models/User");
        const teacher = await Teacher.findById(resourceData.teacherId) || 
                       await User.findById(resourceData.teacherId);
        if (teacher) {
          resourceData = resourceData.toObject();
          resourceData.teacherId = {
            name: teacher.name,
            email: teacher.email
          };
        }
      }
    }

    if (!resourceData) {
      return res.status(404).json({
        message: "❌ المحتوى المشترك غير موجود"
      });
    }

    // جلب معلومات منشئ المشاركة
    let sharedByInfo = null;
    if (share.sharedByModel === "Student") {
      sharedByInfo = await Student.findById(share.sharedBy)
        .select("name email");
    } else {
      sharedByInfo = await Teacher.findById(share.sharedBy)
        .select("name email");
    }

    res.json({
      share: {
        shareType: share.shareType,
        createdAt: share.createdAt,
        accessCount: share.accessCount,
        expiresAt: share.expiresAt
      },
      sharedBy: sharedByInfo,
      content: resourceData
    });
  } catch (error) {
    console.error("❌ خطأ في عرض المحتوى المشترك:", error);
    res.status(500).json({
      message: "❌ فشل في عرض المحتوى المشترك",
      error: error.message
    });
  }
};

// ✅ الحصول على روابط المشاركة للمستخدم
exports.getMyShares = async (req, res) => {
  try {
    const user = req.user;
    const userModel = user.role === "student" ? "Student" : "Teacher";

    const shares = await Share.find({
      sharedBy: user.id || user._id,
      sharedByModel: userModel,
      isActive: true
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const sharesWithUrls = shares.map(share => ({
      ...share.toObject(),
      url: `${process.env.FRONTEND_URL || "https://ghostexams.com"}/share/${share.shareToken}`
    }));

    res.json({
      shares: sharesWithUrls
    });
  } catch (error) {
    console.error("❌ خطأ في جلب روابط المشاركة:", error);
    res.status(500).json({
      message: "❌ فشل في جلب روابط المشاركة",
      error: error.message
    });
  }
};

// ✅ إلغاء رابط المشاركة
exports.revokeShare = async (req, res) => {
  try {
    const { token } = req.params;
    const user = req.user;

    const share = await Share.findOne({ shareToken: token });
    if (!share) {
      return res.status(404).json({
        message: "❌ رابط المشاركة غير موجود"
      });
    }

    // التحقق من أن المستخدم هو منشئ المشاركة
    const userModel = user.role === "student" ? "Student" : "Teacher";
    if (share.sharedBy.toString() !== (user.id || user._id).toString() ||
        share.sharedByModel !== userModel) {
      return res.status(403).json({
        message: "❌ ليس لديك صلاحية لإلغاء هذه المشاركة"
      });
    }

    share.isActive = false;
    await share.save();

    res.json({
      message: "✅ تم إلغاء رابط المشاركة بنجاح"
    });
  } catch (error) {
    console.error("❌ خطأ في إلغاء رابط المشاركة:", error);
    res.status(500).json({
      message: "❌ فشل في إلغاء رابط المشاركة",
      error: error.message
    });
  }
};

// ✅ التحقق من اشتراك الطالب مع المعلم
exports.checkSubscription = async (req, res) => {
  try {
    const { token } = req.params;
    const user = req.user;

    // التحقق من أن المستخدم طالب
    if (user.role !== "student") {
      return res.status(403).json({
        message: "❌ هذا الـ endpoint مخصص للطلاب فقط"
      });
    }

    // جلب رابط المشاركة
    const share = await Share.findByToken(token);
    if (!share) {
      return res.status(404).json({
        message: "❌ رابط المشاركة غير صحيح أو منتهي الصلاحية"
      });
    }

    // التحقق من نوع المشاركة
    if (share.shareType !== "exam" || share.resourceModel !== "TeacherCustomExam") {
      return res.status(400).json({
        message: "❌ هذا الـ endpoint مخصص للامتحانات فقط"
      });
    }

    // جلب بيانات الامتحان
    const exam = await TeacherCustomExam.findById(share.resourceId);
    if (!exam) {
      return res.status(404).json({
        message: "❌ الامتحان غير موجود"
      });
    }

    // جلب معرف المعلم
    const teacherId = exam.teacherId;
    if (!teacherId) {
      return res.status(404).json({
        message: "❌ لا يمكن العثور على معلومات المعلم"
      });
    }

    // جلب معرف الطالب
    const studentId = user.id || user.userId || user._id;
    if (!studentId) {
      return res.status(400).json({
        message: "❌ لم يتم العثور على معرف الطالب"
      });
    }

    // التحقق من صحة المعرفات
    if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({
        message: "❌ معرفات غير صحيحة"
      });
    }

    const studentObjectId = new mongoose.Types.ObjectId(studentId);
    const teacherObjectId = new mongoose.Types.ObjectId(teacherId);

    // التحقق من الاشتراك
    const subscription = await TeacherStudentSubscription.findOne({
      studentId: studentObjectId,
      teacherId: teacherObjectId
    });

    // جلب معلومات المعلم
    const teacher = await Teacher.findById(teacherObjectId)
      .select("name email subjects profileImage");

    res.json({
      isSubscribed: !!subscription,
      teacher: teacher ? {
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        subjects: teacher.subjects || [],
        profileImage: teacher.profileImage
      } : null
    });
  } catch (error) {
    console.error("❌ خطأ في التحقق من الاشتراك:", error);
    res.status(500).json({
      message: "❌ فشل في التحقق من الاشتراك",
      error: error.message
    });
  }
};

