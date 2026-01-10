const mongoose = require('mongoose');

const generatedExamSchema = new mongoose.Schema({
  subject: String,
  grade: String,
  term: String,
  questions: [
    {
      questionText: String,
      options: [String],
      correctAnswer: String,
      explanation: String,
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GeneratedExam', generatedExamSchema);
