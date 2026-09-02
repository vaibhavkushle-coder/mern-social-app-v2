const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
    type: {
      type: String,
      enum: ["follow", "like", "comment"],
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

notificationSchema.index({ toUser: 1, createdAt: -1 });
notificationSchema.index({ toUser: 1, isRead: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
