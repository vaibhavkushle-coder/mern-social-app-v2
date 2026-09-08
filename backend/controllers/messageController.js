const Message = require("../models/Message");
const { getIO, getUserSocketIds } = require("../socket");
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const mongoose = require("mongoose");
const { getCanonicalConversationPair } = require("../utils/conversationPair");
const { lockPostForReference } = require("../utils/postReference");
const {
  buildVisibleMessageFilter,
  countVisibleUnreadMessages,
} = require("../utils/messageVisibility");
const {
  InvalidPaginationCursorError,
  buildPaginationFilter,
  encodePaginationCursor,
} = require("../utils/paginationCursor");
const {
  INPUT_LIMITS,
  InputValidationError,
  isValidObjectId,
  parsePaginationLimit,
} = require("../utils/validation");
const logger = require("../utils/logger");

function populateMessage(messageId) {
  return Message.findById(messageId)
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
}

async function sendMessage(req, res) {
  try {
    const { text, replyTo, post, clientMessageId } = req.body || {};

    if (text !== undefined && text !== null && typeof text !== "string") {
      return res.status(400).json({ message: "Invalid message text" });
    }

    const normalizedText = typeof text === "string" ? text.trim() : "";

    if (!normalizedText && !post) {
      return res.status(400).json({
        message: "Text or post is required",
      });
    }

    if (normalizedText.length > INPUT_LIMITS.message) {
      return res.status(400).json({
        message: "Message is too long",
      });
    }

    if (
      clientMessageId !== undefined &&
      clientMessageId !== null &&
      (typeof clientMessageId !== "string" ||
        !clientMessageId.trim() ||
        clientMessageId.trim().length > 100)
    ) {
      return res.status(400).json({
        message: "Invalid client message ID",
      });
    }

    const senderId = req.user._id;
    const receiverId = req.params.id;
    const normalizedClientMessageId = clientMessageId?.trim() || null;

    if (replyTo && !isValidObjectId(replyTo)) {
      return res.status(400).json({ message: "Invalid reply message ID" });
    }

    if (post && !isValidObjectId(post)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

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

    if (normalizedClientMessageId) {
      const existingMessage = await Message.findOne({
        sender: senderId,
        clientMessageId: normalizedClientMessageId,
      });

      if (existingMessage) {
        if (existingMessage.receiver.toString() !== receiverId.toString()) {
          return res.status(409).json({
            message: "Client message ID is already in use",
          });
        }

        const populatedMessage = await populateMessage(existingMessage._id);

        return res.status(200).json({
          message: populatedMessage,
        });
      }
    }

    const pair = getCanonicalConversationPair(senderId, receiverId);
    let message;
    let messageCreated = false;
    let failure;

    try {
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          message = undefined;
          messageCreated = false;
          failure = undefined;

          if (replyTo) {
            const replyMessage = await Message.findById(replyTo).session(
              session,
            );

            if (!replyMessage) {
              failure = { status: 404, message: "Reply message not found" };
              return;
            }

            const replyConversation = await Conversation.findOne({
              participantA: pair.participantA,
              participantB: pair.participantB,
            })
              .session(session)
              .select("_id");

            if (
              !replyConversation ||
              replyMessage.conversation.toString() !==
                replyConversation._id.toString()
            ) {
              failure = { status: 403, message: "Invalid reply message" };
              return;
            }

            const replyDeletedForSender = replyMessage.deleteFor.some(
              (item) => item.user.toString() === senderId.toString(),
            );

            if (replyMessage.isDeletedForEveryone || replyDeletedForSender) {
              failure = {
                status: 400,
                message: "Cannot reply to a deleted message",
              };
              return;
            }
          }

          if (post) {
            const sharedPost = await lockPostForReference(post, session);

            if (!sharedPost) {
              failure = { status: 404, message: "Post not found" };
              return;
            }
          }

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
            {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true,
              session,
            },
          );

          const [createdMessage] = await Message.create(
            [
              {
                sender: senderId,
                receiver: receiverId,
                conversation: conversation._id,
                clientMessageId: normalizedClientMessageId,
                text: normalizedText,
                replyTo: replyTo || null,
                post: post || null,
              },
            ],
            { session },
          );
          message = createdMessage;
          messageCreated = true;
        });
      } finally {
        await session.endSession();
      }
    } catch (error) {
      if (error?.code !== 11000 || !normalizedClientMessageId) {
        throw error;
      }

      message = await Message.findOne({
        sender: senderId,
        clientMessageId: normalizedClientMessageId,
      });

      if (!message) throw error;

      if (message.receiver.toString() !== receiverId.toString()) {
        return res.status(409).json({
          message: "Client message ID is already in use",
        });
      }
    }

    if (failure) {
      return res.status(failure.status).json({ message: failure.message });
    }

    const populatedMessage = await populateMessage(message._id);

    const receiverSocketIds = getUserSocketIds(receiverId);

    const io = getIO();

    if (messageCreated && receiverSocketIds.length > 0) {
      io.to(receiverSocketIds).emit("receive-message", {
        ...populatedMessage.toObject(),
        clientMessageId: normalizedClientMessageId,
      });
    }

    res.status(200).json({
      message: populatedMessage,
    });
  } catch (error) {
    logger.error("message.send.failed", error);

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

    const limit = parsePaginationLimit(req.query.limit, 40, 100);
    const before = req.query.before;
    const paginationFilter = buildPaginationFilter("createdAt", before);
    const createdAtFilters = [
      ...(deletedRecord
        ? [{ createdAt: { $gt: deletedRecord.deletedAt } }]
        : []),
      ...(before ? [paginationFilter] : []),
    ];
    const messages = await Message.find({
      conversation: conversation._id,
      ...(createdAtFilters.length > 0 ? { $and: createdAtFilters } : {}),

      deleteFor: {
        $not: {
          $elemMatch: {
            user: currentUserId,
          },
        },
      },
    })
      .sort({ createdAt: -1, _id: -1 })
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
      nextCursor: hasMore
        ? encodePaginationCursor(page[0], "createdAt")
        : null,
    });
  } catch (error) {
    if (
      error instanceof InvalidPaginationCursorError ||
      error instanceof InputValidationError
    ) {
      return res.status(400).json({ message: error.message });
    }

    logger.error("message.list.failed", error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function markMessagesAsSeen(req, res) {
  try {
    const otherUserId = req.params.id;
    const currentUserId = req.user._id;
    const pair = getCanonicalConversationPair(currentUserId, otherUserId);
    const conversation = await Conversation.findOne({
      participantA: pair.participantA,
      participantB: pair.participantB,
    }).select("_id deletedFor");

    if (!conversation) {
      return res.status(200).json({
        message: "Messages marked as seen",
        updatedCount: 0,
      });
    }

    const result = await Message.updateMany(
      {
        ...buildVisibleMessageFilter(conversation, currentUserId),
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
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    logger.error("message.seen.failed", error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function getConversations(req, res) {
  try {
    const currentUserId = req.user._id;
    const limit = parsePaginationLimit(req.query.limit, 20, 50);
    const cursor = req.query.cursor;
    const visibleEntries = [];
    const targetCount = limit + 1;
    const scanBatchSize = Math.max(targetCount, 20);
    let scanCursor = cursor;
    let exhausted = false;

    while (visibleEntries.length < targetCount && !exhausted) {
      const records = await Conversation.find({
        participants: currentUserId,
        ...buildPaginationFilter("updatedAt", scanCursor),
      })
        .sort({ updatedAt: -1, _id: -1 })
        .limit(scanBatchSize + 1)
        .populate("participants", "name profilePic lastSeen");
      const hasMoreRecords = records.length > scanBatchSize;
      const batch = hasMoreRecords
        ? records.slice(0, scanBatchSize)
        : records;

      const summaries = await Promise.all(
        batch.map(async (conversation) => {
          const deletedRecord = conversation.deletedFor?.find(
            (item) => item.user.toString() === currentUserId.toString(),
          );
          const visible = {
            conversation: conversation._id,
            isDeletedForEveryone: false,
            deleteFor: { $not: { $elemMatch: { user: currentUserId } } },
            ...(deletedRecord
              ? { createdAt: { $gt: deletedRecord.deletedAt } }
              : {}),
          };
          const [lastMessage, unreadCount] = await Promise.all([
            Message.findOne(visible).sort({ createdAt: -1 }),
            Message.countDocuments({
              ...visible,
              receiver: currentUserId,
              seen: false,
            }),
          ]);

          if (!lastMessage) return null;

          const otherUser = conversation.participants.find(
            (participant) =>
              participant._id.toString() !== currentUserId.toString(),
          );

          if (!otherUser) return null;

          return {
            document: conversation,
            summary: {
              conversationId: conversation._id,
              user: otherUser,
              lastMessage: lastMessage.text,
              lastMessageTime: lastMessage.createdAt,
              lastMessageId: lastMessage._id,
              unreadCount,
            },
          };
        }),
      );

      for (const entry of summaries) {
        if (entry) visibleEntries.push(entry);
        if (visibleEntries.length === targetCount) break;
      }

      if (visibleEntries.length === targetCount) break;

      if (!hasMoreRecords || batch.length === 0) {
        exhausted = true;
      } else {
        scanCursor = encodePaginationCursor(
          batch[batch.length - 1],
          "updatedAt",
        );
      }
    }

    const hasMore = visibleEntries.length > limit;
    const page = hasMore
      ? visibleEntries.slice(0, limit)
      : visibleEntries;
    const conversations = page.map((entry) => entry.summary);
    const totalUnreadCount = await countVisibleUnreadMessages(currentUserId);

    res.status(200).json({
      conversations,
      totalUnreadCount,
      hasMore,
      nextCursor: hasMore
        ? encodePaginationCursor(
            page[page.length - 1].document,
            "updatedAt",
          )
        : null,
    });
  } catch (error) {
    if (
      error instanceof InvalidPaginationCursorError ||
      error instanceof InputValidationError
    ) {
      return res.status(400).json({ message: error.message });
    }

    logger.error("conversation.list.failed", error);

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
    const deletedAt = new Date();
    const deletionMarkerId = new mongoose.Types.ObjectId();
    const result = await Conversation.updateMany(
      {
        $or: [
          {
            participantA: pair.participantA,
            participantB: pair.participantB,
          },
          {
            participants: {
              $all: pair.participants,
              $size: 2,
            },
          },
        ],
      },
      [
        {
          $set: {
            deletedFor: {
              $cond: [
                {
                  $in: [
                    currentUserId,
                    { $ifNull: ["$deletedFor.user", []] },
                  ],
                },
                {
                  $map: {
                    input: { $ifNull: ["$deletedFor", []] },
                    as: "deletion",
                    in: {
                      $cond: [
                        { $eq: ["$$deletion.user", currentUserId] },
                        { $mergeObjects: ["$$deletion", { deletedAt }] },
                        "$$deletion",
                      ],
                    },
                  },
                },
                {
                  $concatArrays: [
                    { $ifNull: ["$deletedFor", []] },
                    [
                      {
                        _id: deletionMarkerId,
                        user: currentUserId,
                        deletedAt,
                      },
                    ],
                  ],
                },
              ],
            },
            updatedAt: deletedAt,
          },
        },
      ],
      { updatePipeline: true },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }

    res.status(200).json({
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    logger.error("conversation.delete.failed", error);

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
    logger.error("message.delete_for_me.failed", error);

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
    logger.error("message.delete_for_everyone.failed", error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function editMessage(req, res) {
  try {
    const { text } = req.body || {};
    const messageId = req.params.id;

    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        message: "Message text is required",
      });
    }

    if (text.trim().length > INPUT_LIMITS.message) {
      return res.status(400).json({
        message: "Message is too long",
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

    const deletedForCurrentUser = message.deleteFor.some(
      (item) => item.user.toString() === req.user._id.toString(),
    );

    if (message.isDeletedForEveryone || deletedForCurrentUser) {
      return res.status(400).json({
        message: "Deleted message cannot be edited",
      });
    }

    const updatedMessage = await Message.findOneAndUpdate(
      {
        _id: message._id,
        sender: req.user._id,
        isDeletedForEveryone: { $ne: true },
        deleteFor: {
          $not: {
            $elemMatch: { user: req.user._id },
          },
        },
      },
      {
        $set: {
          text: text.trim(),
          edited: true,
        },
      },
      { new: true },
    )
      .populate("sender", "name profilePic")
      .populate("receiver", "name profilePic")
      .populate("post");

    if (!updatedMessage) {
      return res.status(400).json({
        message: "Deleted message cannot be edited",
      });
    }

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
    logger.error("message.edit.failed", error);

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
