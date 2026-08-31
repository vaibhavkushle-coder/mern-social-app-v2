const uploadToCloudinary = require("../utils/cloudinaryUpload");
const User = require("../models/User");
const Post = require("../models/Post");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const Notification = require("../models/Notification");
const { getIO, onlineUsers } = require("../socket");

async function followUser(req, res) {
  try {
    const currentUser = await User.findById(req.user._id);

    if (!currentUser) {
      return res.status(404).json({
        message: "Current user not found",
      });
    }

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

    const alreadyFollowing = currentUser.following.some(
      (id) => id.toString() === userToFollow._id.toString(),
    );

    if (alreadyFollowing) {
      return res.status(400).json({
        message: "Already following",
      });
    }

    currentUser.following.push(userToFollow._id);
    userToFollow.followers.push(currentUser._id);

    await currentUser.save();
    await userToFollow.save();

    const notification = await Notification.create({
      fromUser: currentUser._id,
      toUser: userToFollow._id,
      type: "follow",
    });

    const populateNotification = await Notification.findById(
      notification._id,
    ).populate("fromUser", "name profilePic");

    const io = getIO();

    const receiverSocketId = onlineUsers[userToFollow._id.toString()];

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("new-notification", populateNotification);

      io.to(receiverSocketId).emit("user-followed", {
        userId: userToFollow._id,
        follower: {
          _id: currentUser._id,
          name: currentUser.name,
          profilePic: currentUser.profilePic,
        },
      });
    }

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
    const currentUser = await User.findById(req.user._id);

    if (!currentUser) {
      return res.status(404).json({
        message: "Current user not found",
      });
    }

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

    const isFollowing = currentUser.following.some(
      (id) => id.toString() === userToUnfollow._id.toString(),
    );

    if (!isFollowing) {
      return res.status(400).json({
        message: "User not followed",
      });
    }

    currentUser.following = currentUser.following.filter(
      (id) => id.toString() !== userToUnfollow._id.toString(),
    );

    userToUnfollow.followers = userToUnfollow.followers.filter(
      (id) => id.toString() !== currentUser._id.toString(),
    );

    await currentUser.save();
    await userToUnfollow.save();

    const io = getIO();

    const receiverSocketId = onlineUsers[userToUnfollow._id.toString()];

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("user-unfollowed", {
        userId: userToUnfollow._id,
        followerId: currentUser._id,
      });
    }

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
    const currentUser = await User.findById(req.user._id);

    if (!currentUser) {
      return res.status(404).json({
        message: "Current user not found",
      });
    }
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

    const isFollower = currentUser.followers.some(
      (id) => id.toString() === followerUser._id.toString(),
    );

    if (!isFollower) {
      return res.status(400).json({
        message: "User is not Your follower",
      });
    }

    currentUser.followers = currentUser.followers.filter(
      (id) => id.toString() !== followerUser._id.toString(),
    );

    followerUser.following = followerUser.following.filter(
      (id) => id.toString() !== currentUser._id.toString(),
    );

    await currentUser.save();
    await followerUser.save();

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
    }).select("name profilePic bio");

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
