const { rateLimit, ipKeyGenerator, MemoryStore } = require("express-rate-limit");

const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const REGISTER_LIMIT = 10;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;
const loginStore = new MemoryStore();
const registerStore = new MemoryStore();

function sendRateLimitResponse(message) {
  return (req, res) =>
    res.status(429).json({
      message,
      rateLimit: req.rateLimit
        ? {
            limit: req.rateLimit.limit,
            remaining: req.rateLimit.remaining,
            resetAt: req.rateLimit.resetTime?.toISOString() || null,
          }
        : undefined,
    });
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
  windowMs: LOGIN_WINDOW_MS,
  limit: LOGIN_LIMIT,
  store: loginStore,
  skipSuccessfulRequests: true,
  handler: sendRateLimitResponse(
    "Too many failed login attempts. Please try again in 15 minutes.",
  ),
});

const registerLimiter = rateLimit({
  ...commonOptions,
  windowMs: REGISTER_WINDOW_MS,
  limit: REGISTER_LIMIT,
  store: registerStore,
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

function createAuthRateLimitStatus(store, limit) {
  return async (req, res, next) => {
    try {
      const client = await store.get(ipKeyGenerator(req.ip));
      const activeClient = client?.resetTime?.getTime() > Date.now() ? client : null;

      return res.json({
        limit,
        remaining: Math.max(0, limit - (activeClient?.totalHits || 0)),
        resetAt: activeClient?.resetTime?.toISOString() || null,
      });
    } catch (error) {
      next(error);
    }
  };
}

const getLoginRateLimitStatus = createAuthRateLimitStatus(loginStore, LOGIN_LIMIT);
const getRegisterRateLimitStatus = createAuthRateLimitStatus(
  registerStore,
  REGISTER_LIMIT,
);

module.exports = {
  apiLimiter,
  loginLimiter,
  registerLimiter,
  mutationLimiter,
  uploadLimiter,
  reportLimiter,
  getLoginRateLimitStatus,
  getRegisterRateLimitStatus,
};
