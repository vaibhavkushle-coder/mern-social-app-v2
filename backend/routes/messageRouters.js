const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { mutationLimiter } = require("../middleware/rateLimiters");
const validateObjectId = require("../middleware/validateObjectId");
const {
  getMessages,
  sendMessage,
  markMessagesAsSeen,
  getConversations,
  deleteConversation,
  deleteMessageForMe,
  deleteMessageForEveryone,
  editMessage,
} = require("../controllers/messageController");

router.get("/conversations", authMiddleware, getConversations);
router.get("/:id", authMiddleware, validateObjectId("id", "user"), getMessages);
router.post("/:id", authMiddleware, validateObjectId("id", "user"), mutationLimiter, sendMessage);
router.put("/seen/:id", authMiddleware, validateObjectId("id", "user"), markMessagesAsSeen);
router.put("/edit/:id", authMiddleware, validateObjectId("id", "message"), editMessage);
router.delete("/conversation/:id", authMiddleware, validateObjectId("id", "user"), deleteConversation);
router.delete("/delete-for-me/:id", authMiddleware, validateObjectId("id", "message"), deleteMessageForMe);
router.delete(
  "/delete-for-everyone/:id",
  authMiddleware,
  validateObjectId("id", "message"),
  deleteMessageForEveryone,
);

module.exports = router;
