const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { mutationLimiter } = require("../middleware/rateLimiters");
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
router.get("/:id", authMiddleware, getMessages);
router.post("/:id", authMiddleware, mutationLimiter, sendMessage);
router.put("/seen/:id", authMiddleware, markMessagesAsSeen);
router.put("/edit/:id", authMiddleware, editMessage);
router.delete("/conversation/:id", authMiddleware, deleteConversation);
router.delete("/delete-for-me/:id", authMiddleware, deleteMessageForMe);
router.delete(
  "/delete-for-everyone/:id",
  authMiddleware,
  deleteMessageForEveryone,
);

module.exports = router;
