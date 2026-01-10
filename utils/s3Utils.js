const AWS = require("aws-sdk");

// ✅ إعداد الاتصال بـ S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// ✅ دالة لجلب ملف معين من S3
const getFileFromS3 = async (bucket, key) => {
  const params = { Bucket: bucket, Key: decodeURIComponent(key) }; // ✅ فك ترميز `key`
  try {
    const data = await s3.getObject(params).promise();
    return data.Body; // ✅ إرجاع محتوى الملف
  } catch (error) {
    console.error("❌ خطأ أثناء جلب الملف من S3:", error);
    throw error;
  }
};

const listFilesInS3Bucket = async (bucket, prefix = "") => {
  const params = {
    Bucket: bucket,
    Prefix: prefix,
  };

  console.log(
    `📂 محاولة جلب الملفات من: ${bucket} مع البادئة (Prefix): ${prefix}`
  );

  try {
    const data = await s3.listObjectsV2(params).promise();

    console.log(
      "📂 الملفات المسترجعة من S3:",
      data.Contents.map((obj) => obj.Key)
    );

    if (!data.Contents.length) {
      console.log("⚠️ لم يتم العثور على أي ملفات.");
      return [];
    }

    return data.Contents.map((obj) => obj.Key);
  } catch (error) {
    console.error("❌ خطأ أثناء جلب الملفات من S3:", error);
    return [];
  }
};

// ✅ تصدير الدالة
module.exports = { listFilesInS3Bucket };
module.exports = { getFileFromS3 }; // ✅ تصدير الدالة بشكل صحيح
