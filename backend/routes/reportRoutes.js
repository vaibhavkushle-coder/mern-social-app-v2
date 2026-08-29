const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { reportPost } = require("../controllers/reportController");

router.post("/:postId", authMiddleware, reportPost);

module.exports = router;
