const Report = require("../models/Report");
const Post = require("../models/Post");
const logger = require("../utils/logger");

async function reportPost(req, res) {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    if (post.user.toString() === req.user._id.toString()) {
      return res.status(400).json({
        message: "You cannot report your own post",
      });
    }

    const existingReport = await Report.findOne({
      reporter: req.user._id,
      post: postId,
    });

    if (existingReport) {
      return res.status(400).json({
        message: "You have already reported this post",
      });
    }

    await Report.create({
      reporter: req.user._id,
      post: postId,
    });

    res.status(200).json({
      message: "Post reported successfully",
    });
  } catch (error) {
    logger.error("report.create.failed", error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

module.exports = { reportPost };
