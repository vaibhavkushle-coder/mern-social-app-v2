const mongoose = require("mongoose");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

function buildVisibleMessageFilter(conversation, currentUserId) {
  const deletedRecord = conversation.deletedFor?.find(
    (item) => item.user.toString() === currentUserId.toString(),
  );

  return {
    conversation: conversation._id,
    isDeletedForEveryone: { $ne: true },
    deleteFor: {
      $not: {
        $elemMatch: { user: currentUserId },
      },
    },
    ...(deletedRecord
      ? { createdAt: { $gt: deletedRecord.deletedAt } }
      : {}),
  };
}

async function countVisibleUnreadMessages(userId) {
  const normalizedUserId = new mongoose.Types.ObjectId(userId.toString());
  const [result] = await Message.aggregate([
    {
      $match: {
        receiver: normalizedUserId,
        seen: false,
        isDeletedForEveryone: { $ne: true },
        deleteFor: { $not: { $elemMatch: { user: normalizedUserId } } },
      },
    },
    {
      $lookup: {
        from: Conversation.collection.name,
        localField: "conversation",
        foreignField: "_id",
        as: "conversation",
      },
    },
    { $unwind: "$conversation" },
    {
      $set: {
        currentDeletion: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$conversation.deletedFor",
                as: "deletion",
                cond: { $eq: ["$$deletion.user", normalizedUserId] },
              },
            },
            0,
          ],
        },
      },
    },
    {
      $match: {
        $expr: {
          $or: [
            { $eq: [{ $ifNull: ["$currentDeletion", null] }, null] },
            { $gt: ["$createdAt", "$currentDeletion.deletedAt"] },
          ],
        },
      },
    },
    { $count: "count" },
  ]);

  return result?.count || 0;
}

module.exports = { buildVisibleMessageFilter, countVisibleUnreadMessages };
