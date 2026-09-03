const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  mutationLimiter,
  uploadLimiter,
} = require("../middleware/rateLimiters");

const {
  followUser,
  unfollowUser,
  editProfile,
  uploadProfilePic,
  getUserProfile,
  getProfileById,
  searchUsers,
  savePost,
  unsavePost,
  getSuggestedUsers,
  removeFollower,
} = require("../controllers/userController");

router.post("/follow/:id", authMiddleware, mutationLimiter, followUser);
router.post("/unfollow/:id", authMiddleware, mutationLimiter, unfollowUser);
router.put(
  "/edit",
  authMiddleware,
  uploadLimiter,
  upload.single("profilePic"),
  editProfile,
);
router.put(
  "/upload-profile",
  authMiddleware,
  uploadLimiter,
  upload.single("image"),
  uploadProfilePic,
);
router.get("/profile", authMiddleware, getUserProfile);
router.get("/profile/:id", authMiddleware, getProfileById);
router.get("/search", authMiddleware, searchUsers);
router.post("/save/:id", authMiddleware, mutationLimiter, savePost);
router.delete("/unsave/:id", authMiddleware, mutationLimiter, unsavePost);
router.get("/suggested", authMiddleware, getSuggestedUsers);
router.delete(
  "/removeFollower/:id",
  authMiddleware,
  mutationLimiter,
  removeFollower,
);

module.exports = router;
