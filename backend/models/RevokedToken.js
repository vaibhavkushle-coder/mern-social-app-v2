const mongoose = require("mongoose");

const revokedTokenSchema = new mongoose.Schema({
  tokenHash: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

revokedTokenSchema.index(
  { tokenHash: 1 },
  { unique: true, name: "unique_revoked_token_hash" },
);
revokedTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: "expire_revoked_tokens" },
);

module.exports = mongoose.model("RevokedToken", revokedTokenSchema);
