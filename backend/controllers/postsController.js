const uploadToCloudinary = require("../utils/cloudinaryUpload");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const Post = require("../models/Post");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { getIO, getUserSocketIds } = require("../socket");
const Message = require("../models/Message");
const Report = require("../models/Report");
const mongoose = require("mongoose");
const {
  InvalidPaginationCursorError,
  buildPaginationFilter,
  encodePaginationCursor,
} = require("../utils/paginationCursor");
const {
  INPUT_LIMITS,
  InputValidationError,
  parsePaginationLimit,
} = require("../utils/validation");

async function createPost(req, res) {
  try {
    const { caption } = req.body || {};

    if (caption !== undefined && typeof caption !== "string") {
      return res.status(400).json({ message: "Invalid caption" });
    }

    const normalizedCaption = caption?.trim() || "";

    if (normalizedCaption.length > INPUT_LIMITS.caption) {
      return res.status(400).json({ message: "Caption is too long" });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "image is required",
      });
    }

    const imageUrl = await uploadToCloudinary(req.file, "posts");

    const post = await Post.create({
      user: req.user._id,
      caption: normalizedCaption,
      image: imageUrl,
    });

    const updatedPost = await Post.findById(post._id).populate(
      "user",
      "name profilePic",
    );

    res.status(200).json({
      message: "Post created successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function getAllPosts(req, res) {
  try {
    const limit = parsePaginationLimit(req.query.limit, 12, 30);
    const cursor = req.query.cursor;
    const filter = buildPaginationFilter("createdAt", cursor);

    const posts = await Post.find(filter)
      .populate("user", "name profilePic")
      .populate("likes", "name profilePic")
      .populate({
        path: "comments.user",
        select: "name profilePic",
      })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1);

    const hasMore = posts.length > limit;
    const page = hasMore ? posts.slice(0, limit) : posts;

    res.status(200).json({
      posts: page,
      hasMore,
      nextCursor: hasMore
        ? encodePaginationCursor(page[page.length - 1], "createdAt")
        : null,
    });
  } catch (error) {
    if (
      error instanceof InvalidPaginationCursorError ||
      error instanceof InputValidationError
    ) {
      return res.status(400).json({ message: error.message });
    }

    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function getPostById(req, res) {
  try {
    const post = await Post.findById(req.params.id)
      .populate("user", "name profilePic")
      .populate("likes", "name profilePic")
      .populate({
        path: "comments.user",
        select: "name profilePic",
      });

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    res.status(200).json({
      post,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function likePost(req, res) {
  try {
    const session = await mongoose.startSession();
    let post;
    let failure;
    let createdNotificationId;

    try {
      await session.withTransaction(async () => {
        post = undefined;
        failure = undefined;
        createdNotificationId = undefined;

        post = await Post.findOneAndUpdate(
          {
            _id: req.params.id,
            likes: { $ne: req.user._id },
          },
          { $addToSet: { likes: req.user._id } },
          { new: true, session },
        );

        if (!post) {
          const postExists = await Post.exists({ _id: req.params.id }).session(
            session,
          );
          failure = {
            status: postExists ? 400 : 404,
            message: postExists ? "Post already liked" : "Post not found",
          };
          return;
        }

        if (req.user._id.toString() !== post.user.toString()) {
          const notificationResult = await Notification.updateOne(
            {
              fromUser: req.user._id,
              toUser: post.user,
              post: post._id,
              type: "like",
            },
            {
              $setOnInsert: {
                fromUser: req.user._id,
                toUser: post.user,
                post: post._id,
                type: "like",
              },
            },
            { upsert: true, session },
          );

          if (notificationResult.upsertedCount === 1) {
            createdNotificationId = notificationResult.upsertedId;
          }
        }
      });
    } finally {
      await session.endSession();
    }

    if (failure) {
      return res.status(failure.status).json({ message: failure.message });
    }

    if (createdNotificationId) {
      const populatedNotification = await Notification.findById(
        createdNotificationId,
      )
        .populate("fromUser", "name profilePic")
        .populate("post");
      const receiverSocketIds = getUserSocketIds(post.user.toString());

      if (populatedNotification && receiverSocketIds.length > 0) {
        getIO()
          .to(receiverSocketIds)
          .emit("new-notification", populatedNotification);
      }
    }

    const updatedPost = await Post.findById(post._id)
      .populate("user", "name profilePic")
      .populate("comments.user", "name profilePic")
      .populate("likes", "name profilePic");

    res.status(200).json({
      message: "Post like successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function unlikePost(req, res) {
  try {
    const session = await mongoose.startSession();
    let post;
    let failure;
    let removedNotification;

    try {
      await session.withTransaction(async () => {
        post = undefined;
        failure = undefined;
        removedNotification = undefined;

        post = await Post.findOneAndUpdate(
          {
            _id: req.params.id,
            likes: req.user._id,
          },
          { $pull: { likes: req.user._id } },
          { new: true, session },
        );

        if (!post) {
          const postExists = await Post.exists({ _id: req.params.id }).session(
            session,
          );
          failure = {
            status: 404,
            message: postExists ? "Post is not liked" : "Post not found",
          };
          return;
        }

        if (req.user._id.toString() !== post.user.toString()) {
          removedNotification = await Notification.findOneAndDelete(
            {
              fromUser: req.user._id,
              toUser: post.user,
              post: post._id,
              type: "like",
            },
            { session },
          ).select("_id");
        }
      });
    } finally {
      await session.endSession();
    }

    if (failure) {
      return res.status(failure.status).json({ message: failure.message });
    }

    if (removedNotification) {
      const receiverSocketIds = getUserSocketIds(post.user.toString());

      if (receiverSocketIds.length > 0) {
        getIO().to(receiverSocketIds).emit("notification-removed", {
          notificationId: removedNotification._id,
        });
      }
    }

    const updatedPost = await Post.findById(post._id)
      .populate("user", "name profilePic")
      .populate("comments.user", "name profilePic")
      .populate("likes", "name profilePic");

    res.status(200).json({
      message: "Post unliked successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function commentPost(req, res) {
  try {
    const { text } = req.body || {};

    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        message: "Comment is required",
      });
    }

    const normalizedText = text.trim();

    if (normalizedText.length > INPUT_LIMITS.comment) {
      return res.status(400).json({ message: "Comment is too long" });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    post.comments.push({
      user: req.user._id,
      text: normalizedText,
    });

    await post.save();

    if (req.user._id.toString() !== post.user.toString()) {
      const notification = await Notification.create({
        fromUser: req.user._id,
        toUser: post.user,
        post: post._id,
        type: "comment",
      });

      const populateMessage = await Notification.findById(notification._id)
        .populate("fromUser", "name profilePic")
        .populate("post");

      const io = getIO();
      const receiverSocketIds = getUserSocketIds(post.user.toString());

      if (receiverSocketIds.length > 0) {
        io.to(receiverSocketIds).emit("new-notification", populateMessage);
      }
    }

    const updatedPost = await Post.findById(post._id)
      .populate("user", "name profilePic")
      .populate("comments.user", "name profilePic")
      .populate("likes", "name profilePic");

    res.status(200).json({
      message: "Comment added successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function getComments(req, res) {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        message: "post not found",
      });
    }

    res.status(200).json({
      comments: post.comments,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function deleteComment(req, res) {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({
        message: "post not found",
      });
    }

    const commentIndex = post.comments.findIndex(
      (comment) => comment._id.toString() === req.params.commentId,
    );

    if (commentIndex === -1) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    const comment = post.comments[commentIndex];

    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You can only delete your own comment",
      });
    }

    post.comments = post.comments.filter(
      (comment) => comment._id.toString() !== req.params.commentId,
    );

    await post.save();

    res.status(200).json({
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function deletePost(req, res) {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You can only delete your own post",
      });
    }

    await post.deleteOne();

    await Promise.all([
      Message.updateMany({ post: post._id }, { $set: { post: null } }),
      Notification.deleteMany({ post: post._id }),
      Report.deleteMany({ post: post._id }),
      User.updateMany(
        { savedPosts: post._id },
        { $pull: { savedPosts: post._id } },
      ),
    ]);

    const io = getIO();

    io.emit("post-deleted", {
      postId: post._id.toString(),
    });

    res.status(200).json({
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function editComment(req, res) {
  try {
    const { text } = req.body || {};

    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        message: "Comment is required",
      });
    }

    const normalizedText = text.trim();

    if (normalizedText.length > INPUT_LIMITS.comment) {
      return res.status(400).json({ message: "Comment is too long" });
    }

    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const commentIndex = post.comments.findIndex(
      (comment) => comment._id.toString() === req.params.commentId,
    );

    if (commentIndex === -1) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    const comment = post.comments[commentIndex];

    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You can only edit your own comment",
      });
    }

    post.comments[commentIndex].text = normalizedText;

    await post.save();

    const updatedPost = await Post.findById(req.params.postId)
      .populate("user", "name profilePic")
      .populate("comments.user", "name profilePic")
      .populate("likes", "name profilePic");

    res.status(200).json({
      message: "Comment edited successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function getPostLikes(req, res) {
  try {
    const post = await Post.findById(req.params.postId).populate(
      "likes",
      "name profilePic",
    );

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    res.status(200).json({
      likes: post.likes,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function editPost(req, res) {
  try {
    const { caption } = req.body || {};

    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findOne({
      _id: postId,
      user: userId,
    });

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    if (typeof caption !== "string" || !caption.trim()) {
      return res.status(400).json({
        message: "Caption is required",
      });
    }

    const normalizedCaption = caption.trim();

    if (normalizedCaption.length > INPUT_LIMITS.caption) {
      return res.status(400).json({ message: "Caption is too long" });
    }

    post.caption = normalizedCaption;
    await post.save();

    const updatedPost = await Post.findById(post._id)
      .populate("user", "name profilePic")
      .populate("comments.user", "name profilePic")
      .populate("likes", "name profilePic");

    res.status(200).json({
      message: "Post updated successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function getMyPosts(req, res) {
  try {
    const userId = req.user._id;

    const limit = parsePaginationLimit(req.query.limit, 12, 30);
    const cursor = req.query.cursor;
    const posts = await Post.find({
      user: userId,
      ...buildPaginationFilter("createdAt", cursor),
    })
      .populate("user", "name profilePic")
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1);
    const hasMore = posts.length > limit;
    const page = hasMore ? posts.slice(0, limit) : posts;

    res.status(200).json({
      posts: page,
      hasMore,
      nextCursor: hasMore
        ? encodePaginationCursor(page[page.length - 1], "createdAt")
        : null,
    });
  } catch (error) {
    if (
      error instanceof InvalidPaginationCursorError ||
      error instanceof InputValidationError
    ) {
      return res.status(400).json({ message: error.message });
    }

    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

module.exports = {
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
};
