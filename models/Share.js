const mongoose = require("mongoose");
const crypto = require("crypto");

const shareSchema = new mongoose.Schema({
  shareToken: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  shareType: {
    type: String,
    enum: ["exam", "teacher_profile", "exam_result"],
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "resourceModel"
  },
  resourceModel: {
    type: String,
    enum: ["TeacherCustomExam", "Teacher", "TeacherExamResult"],
    required: true
  },
  sharedBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "sharedByModel"
  },
  sharedByModel: {
    type: String,
    enum: ["Student", "Teacher"],
    required: true
  },
  sharedWith: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "sharedWithModel",
    default: null // null means public share
  },
  sharedWithModel: {
    type: String,
    enum: ["Student", "Teacher"],
    default: null
  },
  accessCount: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    default: null // null means never expires
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate unique share token
shareSchema.statics.generateToken = function() {
  return crypto.randomBytes(32).toString("hex");
};

// Create share link
shareSchema.statics.createShare = async function(data) {
  const token = this.generateToken();
  const share = new this({
    ...data,
    shareToken: token
  });
  await share.save();
  return share;
};

// Find share by token
shareSchema.statics.findByToken = async function(token) {
  return await this.findOne({ 
    shareToken: token, 
    isActive: true,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

// Increment access count
shareSchema.methods.incrementAccess = async function() {
  this.accessCount += 1;
  await this.save();
};

module.exports = mongoose.model("Share", shareSchema);

