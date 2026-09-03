const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { reportLimiter } = require("../middleware/rateLimiters");
const { reportPost } = require("../controllers/reportController");

router.post("/:postId", authMiddleware, reportLimiter, reportPost);

module.exports = router;
