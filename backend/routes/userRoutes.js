const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const validateObjectId = require("../middleware/validateObjectId");
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

router.post("/follow/:id", authMiddleware, validateObjectId("id", "user"), mutationLimiter, followUser);
router.post("/unfollow/:id", authMiddleware, validateObjectId("id", "user"), mutationLimiter, unfollowUser);
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
router.get("/profile/:id", authMiddleware, validateObjectId("id", "user"), getProfileById);
router.get("/search", authMiddleware, searchUsers);
router.post("/save/:id", authMiddleware, validateObjectId("id", "post"), mutationLimiter, savePost);
router.delete("/unsave/:id", authMiddleware, validateObjectId("id", "post"), mutationLimiter, unsavePost);
router.get("/suggested", authMiddleware, getSuggestedUsers);
router.delete(
  "/removeFollower/:id",
  authMiddleware,
  validateObjectId("id", "user"),
  mutationLimiter,
  removeFollower,
);

module.exports = router;
