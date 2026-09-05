const crypto = require("crypto");

function createTokenId() {
  return crypto.randomUUID();
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getTokenSocketRoom(tokenHash) {
  return `token:${tokenHash}`;
}

module.exports = { createTokenId, hashToken, getTokenSocketRoom };
