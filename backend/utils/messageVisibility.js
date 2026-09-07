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

module.exports = { buildVisibleMessageFilter };
