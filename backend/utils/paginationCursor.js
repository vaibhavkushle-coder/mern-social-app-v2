const mongoose = require("mongoose");

class InvalidPaginationCursorError extends Error {
  constructor() {
    super("Invalid pagination cursor");
    this.name = "InvalidPaginationCursorError";
  }
}

function parseTimestamp(value) {
  const timestamp = new Date(value);

  return Number.isNaN(timestamp.getTime()) ? null : timestamp;
}

function decodePaginationCursor(cursor) {
  if (!cursor) return null;

  try {
    const decoded = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );
    const timestamp = parseTimestamp(decoded.timestamp);

    if (
      !timestamp ||
      typeof decoded._id !== "string" ||
      !/^[a-f\d]{24}$/i.test(decoded._id) ||
      !mongoose.isObjectIdOrHexString(decoded._id)
    ) {
      throw new InvalidPaginationCursorError();
    }

    return {
      timestamp,
      id: new mongoose.Types.ObjectId(decoded._id),
    };
  } catch (error) {
    if (error instanceof InvalidPaginationCursorError) throw error;

    throw new InvalidPaginationCursorError();
  }
}

function buildPaginationFilter(field, cursor) {
  const decoded = decodePaginationCursor(cursor);

  if (!decoded) return {};

  return {
    $or: [
      { [field]: { $lt: decoded.timestamp } },
      { [field]: decoded.timestamp, _id: { $lt: decoded.id } },
    ],
  };
}

function encodePaginationCursor(document, field) {
  return Buffer.from(
    JSON.stringify({
      timestamp: document[field].toISOString(),
      _id: document._id.toString(),
    }),
  ).toString("base64url");
}

module.exports = {
  InvalidPaginationCursorError,
  buildPaginationFilter,
  encodePaginationCursor,
};
