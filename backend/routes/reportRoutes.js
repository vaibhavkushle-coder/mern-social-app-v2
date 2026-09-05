const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { reportLimiter } = require("../middleware/rateLimiters");
const validateObjectId = require("../middleware/validateObjectId");
const { reportPost } = require("../controllers/reportController");

router.post("/:postId", authMiddleware, validateObjectId("postId", "post"), reportLimiter, reportPost);

module.exports = router;
