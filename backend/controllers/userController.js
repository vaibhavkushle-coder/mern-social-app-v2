const uploadToCloudinary = require("../utils/cloudinaryUpload");
const User = require("../models/User");
const Post = require("../models/Post");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const Notification = require("../models/Notification");
const { getIO, getUserSocketIds } = require("../socket");
const mongoose = require("mongoose");

async function followUser(req, res) {
  try {
    const userToFollow = await User.findById(req.params.id);

    if (!userToFollow) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        message: "You cannot follow yourself",
      });
    }

    const session = await mongoose.startSession();
    let followed = false;

    try {
      await session.withTransaction(async () => {
        followed = false;
        const currentUserUpdate = await User.updateOne(
          {
            _id: req.user._id,
            following: { $ne: userToFollow._id },
          },
          { $addToSet: { following: userToFollow._id } },
          { session },
        );

        if (currentUserUpdate.modifiedCount === 0) return;

        const followedUserUpdate = await User.updateOne(
          { _id: userToFollow._id },
          { $addToSet: { followers: req.user._id } },
          { session },
        );

        if (followedUserUpdate.matchedCount === 0) {
          throw new Error("User not found during follow");
        }

        followed = true;
      });
    } finally {
      await session.endSession();
    }

    if (!followed) {
      return res.status(400).json({
        message: "Already following",
      });
    }

    // Create notification
    const notification = await Notification.create({
      fromUser: req.user._id,
      toUser: userToFollow._id,
      type: "follow",
    });

    const populateNotification = await Notification.findById(
      notification._id,
    ).populate("fromUser", "name profilePic");

    const io = getIO();

    const receiverSocketIds = getUserSocketIds(userToFollow._id.toString());

    if (receiverSocketIds.length > 0) {
      io.to(receiverSocketIds).emit("new-notification", populateNotification);
    }

    io.to(`profile:${userToFollow._id}`).emit("user-followed", {
      userId: userToFollow._id,
      follower: {
        _id: req.user._id,
        name: req.user.name,
        profilePic: req.user.profilePic,
      },
    });

    res.status(200).json({
      message: "User followed successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function unfollowUser(req, res) {
  try {
    const userToUnfollow = await User.findById(req.params.id);

    if (!userToUnfollow) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        message: "You cannot Unfollow yourself",
      });
    }

    const session = await mongoose.startSession();
    let unfollowed = false;

    try {
      await session.withTransaction(async () => {
        unfollowed = false;
        const currentUserUpdate = await User.updateOne(
          {
            _id: req.user._id,
            following: userToUnfollow._id,
          },
          { $pull: { following: userToUnfollow._id } },
          { session },
        );

        if (currentUserUpdate.modifiedCount === 0) return;

        const unfollowedUserUpdate = await User.updateOne(
          { _id: userToUnfollow._id },
          { $pull: { followers: req.user._id } },
          { session },
        );

        if (unfollowedUserUpdate.matchedCount === 0) {
          throw new Error("User not found during unfollow");
        }

        unfollowed = true;
      });
    } finally {
      await session.endSession();
    }

    if (!unfollowed) {
      return res.status(400).json({
        message: "User not followed",
      });
    }

    // Socket
    const io = getIO();

    io.to(`profile:${userToUnfollow._id}`).emit("user-unfollowed", {
      userId: userToUnfollow._id,
      followerId: currentUser._id,
    });

    res.status(200).json({
      message: "User unfollowed successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function removeFollower(req, res) {
  try {
    const followerUser = await User.findById(req.params.id);

    if (!followerUser) {
      return res.status(404).json({
        message: "Follower user not found",
      });
    }

    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        message: "You cannot remove yourself",
      });
    }

    const session = await mongoose.startSession();
    let removed = false;

    try {
      await session.withTransaction(async () => {
        removed = false;
        const currentUserUpdate = await User.updateOne(
          {
            _id: req.user._id,
            followers: followerUser._id,
          },
          { $pull: { followers: followerUser._id } },
          { session },
        );

        if (currentUserUpdate.modifiedCount === 0) return;

        const followerUpdate = await User.updateOne(
          { _id: followerUser._id },
          { $pull: { following: req.user._id } },
          { session },
        );

        if (followerUpdate.matchedCount === 0) {
          throw new Error("Follower user not found during removal");
        }

        removed = true;
      });
    } finally {
      await session.endSession();
    }

    if (!removed) {
      return res.status(400).json({
        message: "User is not Your follower",
      });
    }

    res.status(200).json({
      message: "Follower removed successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function editProfile(req, res) {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const { name, bio } = req.body;

    if (req.file) {
      const imageUrl = await uploadToCloudinary(req.file, "profilePics");

      user.profilePic = imageUrl;
    }

    if (name !== undefined) user.name = name.trim();
    if (bio !== undefined) user.bio = bio.trim();

    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function uploadProfilePic(req, res) {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    console.log(req.file);

    if (!req.file) {
      return res.status(400).json({
        message: "please upload an image",
      });
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "profilePics",
      },
      async (error, result) => {
        if (error) {
          return res.status(500).json({
            message: "Cloudinary upload failed",
          });
        }

        user.profilePic = result.secure_url;

        await user.save();

        const updatedUser = await User.findById(user._id).select("-password");

        res.status(200).json({
          message: "Profile picture uploaded successfully",
          user: updatedUser,
        });
      },
    );

    streamifier.createReadStream(req.file.buffer).pipe(stream);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function getUserProfile(req, res) {
  try {
    const user = await User.findById(req.user._id)
      .select("-password")
      .populate("followers", "name profilePic bio")
      .populate("following", "name profilePic bio")
      .populate("savedPosts", "image caption user createdAt");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const posts = await Post.find({
      user: req.user._id,
    });

    res.status(200).json({
      message: "Profile fetched successfully",
      user,
      posts,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function getProfileById(req, res) {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("followers", "name profilePic bio")
      .populate("following", "name profilePic bio");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const posts = await Post.find({
      user: req.params.id,
    });

    res.status(200).json({
      message: "Profile fetched successfully",
      user,
      posts,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function searchUsers(req, res) {
  try {
    const query = req.query.q?.trim();

    if (!query) {
      return res.status(200).json({
        usersWithFollowStatus: [],
      });
    }
    const currentUser = await User.findById(req.user._id);

    if (!currentUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const users = await User.find({
      _id: { $ne: req.user._id },
      name: {
        $regex: query,
        $options: "i",
      },
    }).select("name profilePic bio").limit(20);

    const usersWithFollowStatus = users.map((user) => ({
      ...user.toObject(),
      isFollowing: currentUser.following.some(
        (id) => id.toString() === user._id.toString(),
      ),
    }));

    res.status(200).json({
      usersWithFollowStatus,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function savePost(req, res) {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!Array.isArray(user.savedPosts)) {
      user.savedPosts = [];
    }

    const postId = req.params.id;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const alreadySaved = user.savedPosts.some((id) => id.toString() === postId);

    if (alreadySaved) {
      return res.status(400).json({
        message: "Post already saved",
      });
    }

    user.savedPosts.push(postId);

    await user.save();

    res.status(200).json({
      message: "Post saved successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function unsavePost(req, res) {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const postId = req.params.id;

    user.savedPosts = user.savedPosts.filter((id) => id.toString() !== postId);

    await user.save();

    res.status(200).json({
      message: "Post unsaved successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function getSuggestedUsers(req, res) {
  console.log("🔥 getSuggestedUsers CALLED");
  try {
    const currentUser = await User.findById(req.user._id).select("following");

    if (!currentUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    let suggestedUserIds = [];

    if (currentUser.following.length > 0) {
      const followingUsers = await User.find({
        _id: { $in: currentUser.following },
      }).select("following");

      suggestedUserIds = followingUsers.flatMap((user) => user.following);
    }

    const filteredSuggestedUserIds = suggestedUserIds.filter(
      (id) =>
        id.toString() !== req.user._id.toString() &&
        !currentUser.following.some(
          (followingId) => followingId.toString() === id.toString(),
        ),
    );

    let suggestedUsers = [];

    if (filteredSuggestedUserIds.length > 0) {
      suggestedUsers = await User.find({
        _id: { $in: filteredSuggestedUserIds },
      })
        .select("name profilePic bio")
        .limit(5);
    }

    if (suggestedUsers.length < 5) {
      const existingIds = [
        req.user._id,
        ...currentUser.following,
        ...suggestedUsers.map((user) => user._id),
      ];

      console.log("Current user:", req.user._id);
      console.log("Existing IDs:", existingIds);

      const allUsers = await User.find({}).select("_id name");

      console.log("All users:", allUsers);

      const fallbackUsers = await User.find({
        _id: { $nin: existingIds },
      })
        .select("name profilePic bio")
        .limit(5 - suggestedUsers.length);

      console.log("Fallback users:", fallbackUsers);

      suggestedUsers = [...suggestedUsers, ...fallbackUsers];
    }

    return res.status(200).json({
      suggestedUsers,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
}

module.exports = {
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
};
