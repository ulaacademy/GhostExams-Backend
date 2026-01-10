const AWS = require('aws-sdk');

// تكوين إعدادات AWS S3
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,   // تأكد من وجود هذه القيم في ملف .env
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

module.exports = s3;
