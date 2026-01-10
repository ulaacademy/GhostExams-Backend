const ExamAttempt = require("../models/ExamAttempt");

exports.autosave = async (req, res) => {
  try {
    const {
      attemptId,
      examId,
      studentId,
      teacherId,
      currentQuestionIndex,
      answers,
      questionStatus,
      timeSpent,
      updatedAt,
      submittedAt,
      readyToSubmit,
      lastEvent,
      qIndex,
    } = req.body;

    if (!examId || !studentId) {
      return res.status(400).json({ message: "examId و studentId مطلوبين" });
    }

    let attempt;

    if (attemptId) {
      attempt = await ExamAttempt.findById(attemptId);
    }

    if (!attempt) {
      attempt = await ExamAttempt.findOne({
        examId,
        studentId,
        isFinalized: false,
      });
    }

    if (!attempt) {
      attempt = new ExamAttempt({ examId, studentId, teacherId });
    }

    // ✅ لا تكتب فوق محاولة منتهية
    if (attempt.isFinalized) {
      return res
        .status(200)
        .json({ attemptId: attempt._id, message: "Attempt already finalized" });
    }

    attempt.currentQuestionIndex =
      typeof currentQuestionIndex === "number"
        ? currentQuestionIndex
        : attempt.currentQuestionIndex;
    attempt.answers = answers || attempt.answers;
    attempt.questionStatus = questionStatus || attempt.questionStatus;
    attempt.timeSpent = timeSpent || attempt.timeSpent;

    if (updatedAt) attempt.updatedAtIso = updatedAt;
    if (submittedAt) attempt.submittedAtIso = submittedAt;

    await attempt.save();

    return res.status(200).json({
      attemptId: attempt._id,
      message: "Autosaved",
      meta: { lastEvent, qIndex, readyToSubmit: !!readyToSubmit },
    });
  } catch (err) {
    console.error("autosave error:", err);
    return res
      .status(500)
      .json({ message: "Autosave failed", error: err.message });
  }
};

exports.finalize = async (req, res) => {
  try {
    const { attemptId, score } = req.body;
    if (!attemptId) return res.status(400).json({ message: "attemptId مطلوب" });

    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });

    attempt.isFinalized = true;
    attempt.score = typeof score === "number" ? score : attempt.score;
    attempt.submittedAtIso = attempt.submittedAtIso || new Date().toISOString();

    await attempt.save();

    res.status(200).json({ message: "Finalized", attemptId: attempt._id });
  } catch (err) {
    console.error("finalize error:", err);
    return res
      .status(500)
      .json({ message: "Finalize failed", error: err.message });
  }
};
