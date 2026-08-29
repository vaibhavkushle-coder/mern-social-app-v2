const Message = require("../models/Message");
const { getIO, onlineUsers } = require("../socket");
const Conversation = require("../models/Conversation");

async function sendMessage(req, res) {
  try {
    const { text, replyTo, post } = req.body;

    if ((!text || !text.trim()) && !post) {
      return res.status(400).json({
        message: "Text or post is required",
      });
    }

    const senderId = req.user._id;
    const receiverId = req.params.id;

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
      });
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

    const receiverSocketId = onlineUsers[receiverId];

    const io = getIO();

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receive-message", populatedMessage);
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

    const conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, otherUserId] },
    });

    if (!conversation) {
      return res.status(200).json({
        messages: [],
      });
    }

    const deletedRecord = conversation.deletedFor.find(
      (item) => item.user.toString() === currentUserId.toString(),
    );

    const messages = await Message.find({
      conversation: conversation._id,
      ...(deletedRecord ? { createdAt: { $gt: deletedRecord.deletedAt } } : {}),

      deleteFor: {
        $not: {
          $elemMatch: {
            user: currentUserId,
          },
        },
      },
    })
      .sort({ createdAt: 1 })
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

    res.status(200).json({
      messages,
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

    const userConversations = await Conversation.find({
      participants: currentUserId,
    });

    const conversationIds = userConversations.map(
      (conversation) => conversation._id,
    );

    const messages = await Message.find({
      conversation: { $in: conversationIds },
      receiver: { $exists: true },
      $or: [{ sender: currentUserId }, { receiver: currentUserId }],
    })
      .sort({ createdAt: -1 })
      .populate("sender", "name profilePic")
      .populate("receiver", "name profilePic")
      .populate("conversation");

    const conversations = [];
    const conversationMap = new Map();

    for (const message of messages) {
      const deletedRecord = message.conversation?.deletedFor?.find(
        (item) => item.user.toString() === currentUserId.toString(),
      );

      if (deletedRecord && message.createdAt <= deletedRecord.deletedAt) {
        continue;
      }

      if (message.isDeletedForEveryone) {
        continue;
      }

      if (
        message.deleteFor?.some(
          (item) => item.user.toString() === currentUserId.toString(),
        )
      ) {
        continue;
      }
      if (!message.sender || !message.receiver) {
        continue;
      }
      const isCurrentUserSender =
        message.sender._id.toString() === currentUserId.toString();

      const otherUser = isCurrentUserSender ? message.receiver : message.sender;

      const otherUserId = otherUser._id.toString();

      if (!conversationMap.has(otherUserId)) {
        const conversation = {
          user: otherUser,
          lastMessage: message.text,
          lastMessageTime: message.createdAt,
          lastMessageId: message._id,
          unreadCount: 0,
        };

        conversationMap.set(otherUserId, conversation);
        conversations.push(conversation);
      }

      if (
        message.receiver._id.toString() === currentUserId.toString() &&
        message.seen === false
      ) {
        conversationMap.get(otherUserId).unreadCount++;
      }
    }

    res.status(200).json({
      conversations,
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

    const conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, otherUserId] },
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

async function deleteSelectedMessages(req, res) {
  try {
    const currentUserId = req.user._id;
    const { messageIds } = req.body;

    await Message.deleteMany({
      _id: { $in: messageIds },
      $or: [{ sender: currentUserId }, { receiver: currentUserId }],
    });

    res.status(200).json({
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.log(erorr);

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

    message.isDeletedForEveryone = true;

    await message.save();

    const io = getIO();

    const receiverSocketId = onlineUsers[message.receiver.toString()];
    const senderSocketId = onlineUsers[message.sender.toString()];

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("message-deleted-for-everyone", {
        messageId: message._id,
      });
    }

    if (senderSocketId) {
      io.to(senderSocketId).emit("message-deleted-for-everyone", {
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

    const receiverSocketId =
      onlineUsers[updatedMessage.receiver._id.toString()];

    const io = getIO();

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("message-edited", updatedMessage);
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
  deleteSelectedMessages,
  deleteConversation,
  deleteMessageForMe,
  deleteMessageForEveryone,
  editMessage,
};
