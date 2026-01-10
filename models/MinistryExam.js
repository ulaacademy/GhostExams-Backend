const mongoose = require("mongoose");

const MinistryExamSchema = new mongoose.Schema({
  grade: { type: String, required: true },
  term: { type: String, required: true },
  subject: { type: String, required: true },
  year: { type: String, required: true },
  image_url: { type: String, required: true },
  correct_answer: { type: String, required: true },
});

const MinistryExam =
  mongoose.models.MinistryExam ||
  mongoose.model("MinistryExam", MinistryExamSchema, "ministryexams");

module.exports = MinistryExam;
