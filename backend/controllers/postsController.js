const uploadToCloudinary = require("../utils/cloudinaryUpload");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const Post = require("../models/Post");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { getIO, onlineUsers } = require("../socket");
const Message = require("../models/Message");

async function createPost(req, res) {
  try {
    const { caption } = req.body;

    if (!req.file) {
      return res.status(400).json({
        message: "image is required",
      });
    }

    const imageUrl = await uploadToCloudinary(req.file, "posts");

    const post = await Post.create({
      user: req.user._id,
      caption,
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
    const posts = await Post.find()
      .populate("user", "name profilePic")
      .populate("likes", "name profilePic")
      .populate({
        path: "comments.user",
        select: "name profilePic",
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      posts,
    });
  } catch (error) {
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
      message: "Server Errro",
    });
  }
}

async function likePost(req, res) {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const alreadyLiked = await post.likes.some(
      (id) => id.toString() === req.user._id.toString(),
    );

    if (alreadyLiked) {
      return res.status(400).json({
        message: "Post already liked",
      });
    }

    post.likes.push(req.user._id);

    await post.save();

    if (req.user._id.toString() !== post.user.toString()) {
      const notification = await Notification.create({
        fromUser: req.user._id,
        toUser: post.user,
        post: post._id,
        type: "like",
      });

      const populatedNotification = await Notification.findById(
        notification._id,
      )
        .populate("fromUser", "name profilePic")
        .populate("post");

      const io = getIO();
      const receiverSocketId = onlineUsers[post.user.toString()];

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("new-notification", populatedNotification);
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
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const alreadyLiked = await post.likes.some(
      (id) => id.toString() === req.user._id.toString(),
    );

    if (!alreadyLiked) {
      return res.status(404).json({
        message: "Post is not liked",
      });
    }

    post.likes = post.likes.filter(
      (id) => id.toString() !== req.user._id.toString(),
    );

    await post.save();

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
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        message: "Comment is required",
      });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    post.comments.push({
      user: req.user._id,
      text: text,
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
      const receiverSocketId = onlineUsers[post.user.toString()];

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("new-notification", populateMessage);
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

    await Message.updateMany({ post: post._id }, { $set: { post: null } });

    await post.deleteOne();

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
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        message: "Comment is required",
      });
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

    post.comments[commentIndex].text = text;

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
    const { caption } = req.body;

    const postId = req.params.id;
    const userId = req.user._id;

    console.log("POST ID:", postId);
    console.log("USER ID:", userId);

    const post = await Post.findOne({
      _id: postId,
      user: userId,
    });

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    if (!caption || !caption.trim()) {
      return res.status(400).json({
        message: "Caption is required",
      });
    }

    post.caption = caption.trim();
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

    const posts = await Post.find({
      user: userId,
    }).populate("user", "name profilePic");

    res.status(200).json({
      posts,
    });
  } catch (error) {
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
