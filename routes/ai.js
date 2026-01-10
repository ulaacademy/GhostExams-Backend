const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");

// ✅ تعريف المسار الصحيح لجلب تفسير الذكاء الاصطناعي
router.post("/explain", aiController.getAIExplanation);

module.exports = router;
