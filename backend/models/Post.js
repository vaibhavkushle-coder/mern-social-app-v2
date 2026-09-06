const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    caption: {
      type: String,
      trim: true,
    },

    image: {
      type: String,
      required: true,
    },

    referenceVersion: {
      type: Number,
      default: 0,
      select: false,
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        text: {
          type: String,
        },
        createdAt: {
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

postSchema.index({ createdAt: -1, _id: -1 });
postSchema.index({ user: 1, createdAt: -1, _id: -1 });

module.exports = mongoose.model("Post", postSchema);
