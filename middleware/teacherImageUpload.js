const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDirectory = path.join(__dirname, "..", "uploads", "teachers");

const ensureUploadDirectoryExists = () => {
  fs.mkdirSync(uploadDirectory, { recursive: true });
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      ensureUploadDirectoryExists();
      cb(null, uploadDirectory);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const fileExtension = path.extname(file.originalname);
    const normalizedExtension = fileExtension || ".png";
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${normalizedExtension}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("❌ يُسمح فقط بصور JPG, JPEG, PNG, WEBP."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

module.exports = upload;

