const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

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

router.post("/follow/:id", authMiddleware, followUser);
router.post("/unfollow/:id", authMiddleware, unfollowUser);
router.put("/edit", authMiddleware, upload.single("profilePic"), editProfile);
router.put(
  "/upload-profile",
  authMiddleware,
  upload.single("image"),
  uploadProfilePic,
);
router.get("/profile", authMiddleware, getUserProfile);
router.get("/profile/:id", authMiddleware, getProfileById);
router.get("/search", authMiddleware, searchUsers);
router.post("/save/:id", authMiddleware, savePost);
router.delete("/unsave/:id", authMiddleware, unsavePost);
router.get("/suggested", authMiddleware, getSuggestedUsers);
router.delete("/removeFollower/:id", authMiddleware, removeFollower);

module.exports = router;
