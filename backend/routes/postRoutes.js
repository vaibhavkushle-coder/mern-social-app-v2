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

router.post(
  "/create",
  authMiddleware,
  uploadLimiter,
  upload.single("image"),
  createPost,
);
router.get("/all", authMiddleware, getAllPosts);
router.post("/like/:id", authMiddleware, validateObjectId("id", "post"), mutationLimiter, likePost);
router.post("/unlike/:id", authMiddleware, validateObjectId("id", "post"), mutationLimiter, unlikePost);
router.post("/comment/:id", authMiddleware, validateObjectId("id", "post"), mutationLimiter, commentPost);
router.get("/comments/:id", authMiddleware, validateObjectId("id", "post"), getComments);
router.delete("/:postId/comment/:commentId", authMiddleware, validateObjectId("postId", "post"), validateObjectId("commentId", "comment"), deleteComment);
router.delete("/:id", authMiddleware, validateObjectId("id", "post"), deletePost);
router.put("/:postId/comment/:commentId", authMiddleware, validateObjectId("postId", "post"), validateObjectId("commentId", "comment"), editComment);
router.get("/:postId/likes", authMiddleware, validateObjectId("postId", "post"), getPostLikes);
router.put("/edit/:id", authMiddleware, validateObjectId("id", "post"), editPost);
router.get("/my-posts", authMiddleware, getMyPosts);
router.get("/:id", validateObjectId("id", "post"), getPostById);

module.exports = router;
