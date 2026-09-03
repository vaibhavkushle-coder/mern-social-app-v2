const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

function sendRateLimitResponse(message) {
  return (req, res) => res.status(429).json({ message });
}

function authenticatedKey(req) {
  return req.user?._id?.toString() || ipKeyGenerator(req.ip);
}

const commonOptions = {
  standardHeaders: "draft-8",
  legacyHeaders: false,
};

const apiLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  limit: 3000,
  handler: sendRateLimitResponse("Too many requests. Please try again later."),
});

const loginLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  handler: sendRateLimitResponse(
    "Too many failed login attempts. Please try again in 15 minutes.",
  ),
});

const registerLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 60 * 1000,
  limit: 10,
  handler: sendRateLimitResponse(
    "Too many registration attempts. Please try again later.",
  ),
});

const mutationLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 1000,
  limit: 180,
  keyGenerator: authenticatedKey,
  handler: sendRateLimitResponse(
    "Too many actions. Please wait a moment and try again.",
  ),
});

const uploadLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: authenticatedKey,
  handler: sendRateLimitResponse(
    "Too many image uploads. Please try again later.",
  ),
});

const reportLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: authenticatedKey,
  handler: sendRateLimitResponse(
    "Too many reports. Please try again later.",
  ),
});

module.exports = {
  apiLimiter,
  loginLimiter,
  registerLimiter,
  mutationLimiter,
  uploadLimiter,
  reportLimiter,
};
