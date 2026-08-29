const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  getNotifications,
  markAllAsRead,
  deleteSelectedNotifications,
} = require("../controllers/notificationController");

router.delete("/select", authMiddleware, deleteSelectedNotifications);
router.get("/", authMiddleware, getNotifications);
router.patch("/read", authMiddleware, markAllAsRead);

module.exports = router;
