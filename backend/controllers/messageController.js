const Message = require("../models/Message");
const { getIO, getUserSocketIds } = require("../socket");
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const Post = require("../models/Post");
const { getCanonicalConversationPair } = require("../utils/conversationPair");

async function sendMessage(req, res) {
  try {
    const { text, replyTo, post, clientMessageId } = req.body;

    if ((!text || !text.trim()) && !post) {
      return res.status(400).json({
        message: "Text or post is required",
      });
    }

    if (text && text.trim().length > 5000) {
      return res.status(400).json({
        message: "Message is too long",
      });
    }

    const senderId = req.user._id;
    const receiverId = req.params.id;

    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({
        message: "You cannot send a message to yourself",
      });
    }

    const receiver = await User.findById(receiverId);

    if (!receiver) {
      return res.status(404).json({
        message: "Receiver not found",
      });
    }

    const pair = getCanonicalConversationPair(senderId, receiverId);
    const conversation = await Conversation.findOneAndUpdate(
      {
        participantA: pair.participantA,
        participantB: pair.participantB,
      },
      {
        $setOnInsert: {
          participants: pair.participants,
          participantA: pair.participantA,
          participantB: pair.participantB,
        },
        $set: { updatedAt: new Date() },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (replyTo) {
      const replyMessage = await Message.findById(replyTo);

      if (!replyMessage) {
        return res.status(404).json({
          message: "Reply message not found",
        });
      }

      if (
        replyMessage.conversation.toString() !== conversation._id.toString()
      ) {
        return res.status(403).json({
          message: "Invalid reply message",
        });
      }
    }

    if (post) {
      const sharedPost = await Post.findById(post);

      if (!sharedPost) {
        return res.status(404).json({
          message: "Post not found",
        });
      }
    }

    const message = await Message.create({
      sender: req.user._id,
      receiver: req.params.id,
      conversation: conversation._id,
      text: text,
      replyTo: replyTo || null,
      post: post || null,
    });

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name profilePic")
      .populate("receiver", "name profilePic")
      .populate("post")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "name profilePic",
        },
      });

    const receiverSocketIds = getUserSocketIds(receiverId);

    const io = getIO();

    if (receiverSocketIds.length > 0) {
      io.to(receiverSocketIds).emit("receive-message", {
        ...populatedMessage.toObject(),
        clientMessageId,
      });
    }

    res.status(200).json({
      message: populatedMessage,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function getMessages(req, res) {
  try {
    const currentUserId = req.user._id;
    const otherUserId = req.params.id;

    const pair = getCanonicalConversationPair(currentUserId, otherUserId);
    const conversation = await Conversation.findOne({
      participantA: pair.participantA,
      participantB: pair.participantB,
    });

    if (!conversation) {
      return res.status(200).json({
        messages: [],
      });
    }

    const deletedRecord = conversation.deletedFor.find(
      (item) => item.user.toString() === currentUserId.toString(),
    );

    const limit = Math.min(Math.max(Number(req.query.limit) || 40, 1), 100);
    const before = req.query.before;
    const messages = await Message.find({
      conversation: conversation._id,
      ...(deletedRecord ? { createdAt: { $gt: deletedRecord.deletedAt } } : {}),
      ...(before ? { createdAt: { $lt: new Date(before) } } : {}),

      deleteFor: {
        $not: {
          $elemMatch: {
            user: currentUserId,
          },
        },
      },
    })
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate("sender", "name profilePic")
      .populate("receiver", "name profilePic")
      .populate("post")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "name profilePic",
        },
      });

    const hasMore = messages.length > limit;
    const page = (hasMore ? messages.slice(0, limit) : messages).reverse();
    res.status(200).json({
      messages: page,
      hasMore,
      nextCursor: hasMore ? page[0].createdAt.toISOString() : null,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function markMessagesAsSeen(req, res) {
  try {
    const otherUserId = req.params.id;
    const currentUserId = req.user._id;

    const result = await Message.updateMany(
      {
        sender: otherUserId,
        receiver: currentUserId,
        seen: false,
      },
      {
        $set: {
          seen: true,
        },
      },
    );

    res.status(200).json({
      message: "Messages marked as seen",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function getConversations(req, res) {
  try {
    const currentUserId = req.user._id;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const cursor = req.query.cursor;
    const userConversations = await Conversation.find({
      participants: currentUserId,
      ...(cursor ? { updatedAt: { $lt: new Date(cursor) } } : {}),
    })
      .sort({ updatedAt: -1 })
      .limit(limit + 1)
      .populate("participants", "name profilePic lastSeen");
    const hasMore = userConversations.length > limit;
    const page = hasMore ? userConversations.slice(0, limit) : userConversations;

    const conversations = (await Promise.all(page.map(async (conversation) => {
      const deletedRecord = conversation.deletedFor?.find(
        (item) => item.user.toString() === currentUserId.toString(),
      );
      const visible = {
        conversation: conversation._id,
        isDeletedForEveryone: false,
        deleteFor: { $not: { $elemMatch: { user: currentUserId } } },
        ...(deletedRecord ? { createdAt: { $gt: deletedRecord.deletedAt } } : {}),
      };
      const [lastMessage, unreadCount] = await Promise.all([
        Message.findOne(visible).sort({ createdAt: -1 }),
        Message.countDocuments({ ...visible, receiver: currentUserId, seen: false }),
      ]);
      if (!lastMessage) return null;
      const otherUser = conversation.participants.find(
        (participant) => participant._id.toString() !== currentUserId.toString(),
      );
      if (!otherUser) return null;
      return {
        conversationId: conversation._id,
        user: otherUser,
        lastMessage: lastMessage.text,
        lastMessageTime: lastMessage.createdAt,
        lastMessageId: lastMessage._id,
        unreadCount,
      };
    }))).filter(Boolean);

    res.status(200).json({
      conversations,
      hasMore,
      nextCursor: hasMore ? page[page.length - 1].updatedAt.toISOString() : null,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function deleteConversation(req, res) {
  try {
    const currentUserId = req.user._id;
    const otherUserId = req.params.id;

    const pair = getCanonicalConversationPair(currentUserId, otherUserId);
    const conversation = await Conversation.findOne({
      participantA: pair.participantA,
      participantB: pair.participantB,
    });

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }

    const existingDelete = conversation.deletedFor.find(
      (item) => item.user.toString() === currentUserId.toString(),
    );

    if (existingDelete) {
      existingDelete.deletedAt = new Date();
    } else {
      conversation.deletedFor.push({
        user: currentUserId,
        deletedAt: new Date(),
      });
    }

    await conversation.save();

    res.status(200).json({
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function deleteMessageForMe(req, res) {
  try {
    const messageId = req.params.id;
    const currentUserId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    if (
      message.sender.toString() !== currentUserId.toString() &&
      message.receiver.toString() !== currentUserId.toString()
    ) {
      return res.status(403).json({
        message: "You cannot delete this message",
      });
    }

    const alreadyDeleted = message.deleteFor.some(
      (item) => item.user.toString() === currentUserId.toString(),
    );

    if (alreadyDeleted) {
      return res.status(400).json({
        message: "Message already deleted for you",
      });
    }

    message.deleteFor.push({ user: currentUserId });

    await message.save();

    res.status(200).json({
      message: "Message deleted for you",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function deleteMessageForEveryone(req, res) {
  try {
    const messageId = req.params.id;
    const currentUserId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    if (message.sender.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        message: "You can only delete your own message for everyone",
      });
    }

    if (message.isDeletedForEveryone) {
      return res.status(400).json({
        message: "Message already deleted for everyone",
      });
    }

    const oneHour = 60 * 60 * 1000;
    const messageAge = Date.now() - new Date(message.createdAt).getTime();

    if (messageAge > oneHour) {
      return res.status(400).json({
        message: "Message can only be deleted for everyone within 1 hour",
      });
    }

    message.isDeletedForEveryone = true;

    await message.save();

    const io = getIO();

    const receiverSocketIds = getUserSocketIds(message.receiver.toString());
    const senderSocketIds = getUserSocketIds(message.sender.toString());

    if (receiverSocketIds.length > 0) {
      io.to(receiverSocketIds).emit("message-deleted-for-everyone", {
        messageId: message._id,
      });
    }

    if (senderSocketIds.length > 0) {
      io.to(senderSocketIds).emit("message-deleted-for-everyone", {
        messageId: message._id,
      });
    }

    res.status(200).json({
      message: "Message deleted for everyone",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function editMessage(req, res) {
  try {
    const { text } = req.body;
    const messageId = req.params.id;

    if (!text || !text.trim()) {
      return res.status(400).json({
        message: "Message text is required",
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You can edit only your own message",
      });
    }

    message.text = text.trim();
    message.edited = true;

    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate("sender", "name profilePic")
      .populate("receiver", "name profilePic")
      .populate("post");

    const receiverSocketIds = getUserSocketIds(
      updatedMessage.receiver._id.toString(),
    );

    const io = getIO();

    if (receiverSocketIds.length > 0) {
      io.to(receiverSocketIds).emit("message-edited", updatedMessage);
    }

    res.status(200).json({
      message: updatedMessage,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

module.exports = {
  sendMessage,
  getMessages,
  markMessagesAsSeen,
  getConversations,

  deleteConversation,
  deleteMessageForMe,
  deleteMessageForEveryone,
  editMessage,
};
