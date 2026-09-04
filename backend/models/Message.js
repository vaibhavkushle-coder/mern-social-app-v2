const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    clientMessageId: {
      type: String,
      default: null,
    },
    deleteFor: [
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
    isDeletedForEveryone: {
      type: Boolean,
      default: false,
    },
    text: {
      type: String,
      default: "",
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    edited: {
      type: Boolean,
      default: false,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },
    seen: {
      type: Boolean,
      default: false,
    },
    delivered: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, seen: 1 });
messageSchema.index(
  { sender: 1, clientMessageId: 1 },
  {
    unique: true,
    partialFilterExpression: { clientMessageId: { $type: "string" } },
  },
);

module.exports = mongoose.model("Message", messageSchema);
