const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
  createPost,
  getAllPosts,
  likePost,
  unlikePost,
  commentPost,
  getComments,
  deleteComment,
  deletePost,
  editComment,
  getPostLikes,
  editPost,
  getMyPosts,
  getPostById,
} = require("../controllers/postsController");

router.post("/create", authMiddleware, upload.single("image"), createPost);
router.get("/all", authMiddleware, getAllPosts);
router.post("/like/:id", authMiddleware, likePost);
router.post("/unlike/:id", authMiddleware, unlikePost);
router.post("/comment/:id", authMiddleware, commentPost);
router.get("/comments/:id", authMiddleware, getComments);
router.delete("/:postId/comment/:commentId", authMiddleware, deleteComment);
router.delete("/:id", authMiddleware, deletePost);
router.put("/:postId/comment/:commentId", authMiddleware, editComment);
router.get("/:postId/likes", authMiddleware, getPostLikes);
router.put("/edit/:id", authMiddleware, editPost);
router.get("/my-posts", authMiddleware, getMyPosts);
router.get("/:id", getPostById);

module.exports = router;
