const jwt = require("jsonwebtoken");
const User = require("../models/User");
const RevokedToken = require("../models/RevokedToken");
const { hashToken } = require("../utils/tokenUtils");
const logger = require("../utils/logger");

async function authenticateRequest(req, res, next, allowRevoked = false) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        message: "Unouthorized",
      });
    }

    const tokenHash = hashToken(token);
    const isRevoked = Boolean(await RevokedToken.exists({ tokenHash }));

    if (isRevoked && !allowRevoked) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    req.user = user;
    req.auth = {
      token,
      tokenHash,
      expiresAt: new Date(decoded.exp * 1000),
      isRevoked,
    };

    next();
  } catch (error) {
    logger.error("auth.middleware.failed", error);

    res.status(401).json({
      message: "Unauthorized",
    });
  }
}

function authMiddleware(req, res, next) {
  return authenticateRequest(req, res, next);
}

authMiddleware.allowRevoked = function allowRevoked(req, res, next) {
  return authenticateRequest(req, res, next, true);
};

module.exports = authMiddleware;
