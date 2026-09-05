const mongoose = require("mongoose");

const INPUT_LIMITS = Object.freeze({
  name: 100,
  email: 254,
  passwordBytes: 72,
  bio: 500,
  caption: 300,
  comment: 1000,
  message: 5000,
  search: 100,
  notificationBatch: 100,
});

class InputValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "InputValidationError";
  }
}

function isValidObjectId(value) {
  return (
    typeof value === "string" &&
    /^[a-f\d]{24}$/i.test(value) &&
    mongoose.isObjectIdOrHexString(value)
  );
}

function parsePaginationLimit(value, fallback, maximum) {
  if (value === undefined) return fallback;

  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new InputValidationError("Invalid pagination limit");
  }

  const limit = Number(value);

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > maximum) {
    throw new InputValidationError("Invalid pagination limit");
  }

  return limit;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  INPUT_LIMITS,
  InputValidationError,
  escapeRegex,
  isValidObjectId,
  parsePaginationLimit,
};
