const express = require("express");
const router = express.Router();
const examAttemptController = require("../controllers/examAttemptController");

router.post("/autosave", examAttemptController.autosave);
router.post("/finalize", examAttemptController.finalize);

module.exports = router;
