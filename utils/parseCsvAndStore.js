import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import csvParser from "csv-parser";
import mongoose from "mongoose";
import MinistryExam from "../models/MinistryExam.js"; // استيراد الموديل

// ✅ تعريف `__dirname` بطريقة متوافقة مع ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ الاتصال بقاعدة البيانات
const MONGO_URI =
  "mongodb+srv://ulaacademy:careless111@cluster.2vyqh.mongodb.net/ula1?retryWrites=true&w=majority&appName=Cluster";
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// ✅ تحديد المجلد الذي يحتوي على ملفات CSV
const csvFolderPath = path.join(__dirname, "../uploads");

// ✅ تحليل كل ملف CSV داخل المجلد
async function processCsvFiles() {
  try {
    const files = fs
      .readdirSync(csvFolderPath)
      .filter((file) => file.endsWith(".csv"));

    if (files.length === 0) {
      console.log("⚠️ لا يوجد أي ملفات CSV في المجلد.");
      mongoose.connection.close();
      return;
    }

    console.log(`📥 العثور على ${files.length} ملف CSV، جاري تحليلها...`);

    for (const file of files) {
      await parseCsvAndStore(path.join(csvFolderPath, file));
    }

    console.log("✅ تم إدخال جميع الملفات بنجاح!");
    mongoose.connection.close();
  } catch (error) {
    console.error("❌ خطأ أثناء معالجة الملفات:", error);
    mongoose.connection.close();
  }
}

// ✅ دالة تحليل ملف CSV وإدخال البيانات إلى قاعدة البيانات
async function parseCsvAndStore(filePath) {
  return new Promise((resolve, reject) => {
    console.log(`📂 جاري تحليل الملف: ${path.basename(filePath)}`);

    const records = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (row) => {
        // 🔹 استخراج البيانات من `image_url`
        const imageUrl = row.image_url;
        const correctAnswer = row.correct_answer;

        // ** تقسيم المسار لاستخراج `grade`, `term`, `subject`, `year` **
        const pathParts = imageUrl.split("/");
        const year = pathParts[pathParts.length - 2]; // 2025
        const subject = pathParts[pathParts.length - 3]; // biology
        const term = pathParts[pathParts.length - 4]; // term-1
        const grade = pathParts[pathParts.length - 5]; // tawjihi-old-science

        // ** إنشاء كائن السؤال **
        const questionData = {
          grade,
          term,
          subject,
          year,
          image_url: imageUrl,
          correct_answer: correctAnswer,
        };

        records.push(questionData);
      })
      .on("end", async () => {
        console.log(
          `✅ تم تحليل الملف: ${path.basename(
            filePath
          )}، جاري إدخال البيانات...`
        );

        try {
          await MinistryExam.insertMany(records);
          console.log(
            `✅ تم إدخال جميع الأسئلة من الملف: ${path.basename(filePath)}`
          );
          resolve();
        } catch (error) {
          console.error(
            `❌ خطأ أثناء إدخال البيانات من الملف: ${path.basename(filePath)}`,
            error
          );
          reject(error);
        }
      })
      .on("error", (error) => {
        console.error(
          `❌ خطأ أثناء قراءة الملف: ${path.basename(filePath)}`,
          error
        );
        reject(error);
      });
  });
}

// ✅ تشغيل الدالة لمعالجة جميع الملفات داخل المجلد
processCsvFiles();
