const mongoose = require("mongoose");
const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    participantA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    participantB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    deletedFor: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        deletedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

conversationSchema.index({ participants: 1, updatedAt: -1 });
conversationSchema.index(
  { participantA: 1, participantB: 1 },
  {
    unique: true,
    name: "unique_conversation_participant_pair",
    partialFilterExpression: {
      participantA: { $exists: true },
      participantB: { $exists: true },
    },
  },
);

module.exports = mongoose.model("Conversation", conversationSchema);
