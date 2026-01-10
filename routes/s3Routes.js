const express = require("express");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const router = express.Router();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ✅ API لعمل presigned URL
router.post("/generate-presigned-url", async (req, res) => {
  try {
    const { key } = req.body; // اسم المسار المطلوب رفع الملف عليه في S3
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      ContentType: "application/octet-stream",
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    res.json({ url });
  } catch (error) {
    console.error("❌ خطأ في إنشاء Presigned URL:", error);
    res.status(500).json({ error: "Failed to generate presigned URL" });
  }
});

module.exports = router;
