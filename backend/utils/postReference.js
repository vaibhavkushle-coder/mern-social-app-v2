const Post = require("../models/Post");

function lockPostForReference(postId, session) {
  return Post.findOneAndUpdate(
    { _id: postId },
    { $inc: { referenceVersion: 1 } },
    { new: false, session },
  );
}

module.exports = { lockPostForReference };
