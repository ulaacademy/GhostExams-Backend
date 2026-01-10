const ExamPattern = require('../models/ExamPattern');

async function generateAIExam(subject, grade, term) {
  const patterns = await ExamPattern.find({ subject, grade, term });

  if (patterns.length === 0) {
    throw new Error('لا توجد أنماط كافية لتوليد الامتحان.');
  }

  const generatedQuestions = patterns.slice(0, 10).map(pattern => ({
    questionText: `🔍 سؤال: ${pattern.patternText}`,
    options: pattern.sampleAnswers,
    correctAnswer: pattern.correctAnswer,
    explanation: pattern.explanation || "هذا هو الشرح التفصيلي للسؤال."
  }));

  return generatedQuestions;
}

module.exports = { generateAIExam };
