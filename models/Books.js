const mongoose = require("mongoose");

const booksSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  subjects: [{ type: String, required: true }], // المواد التي يدرسها
  examsCreated: [{ type: mongoose.Schema.Types.ObjectId, ref: "Exam" }], // الامتحانات التي قام بإنشائها
  createdAt: { type: Date, default: Date.now },
});

const books = mongoose.model("Books", booksSchema);
module.exports = books;
