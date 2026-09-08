const express = require("express");

const router = express.Router();

const {
  register,
  login,
  logout,
  changePassword,
} = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const {
  loginLimiter,
  registerLimiter,
  mutationLimiter,
  getLoginRateLimitStatus,
  getRegisterRateLimitStatus,
} = require("../middleware/rateLimiters");

router.get("/rate-limit/login", getLoginRateLimitStatus);
router.get("/rate-limit/register", getRegisterRateLimitStatus);
router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/logout", authMiddleware.allowRevoked, logout);
router.patch(
  "/change-password",
  authMiddleware,
  mutationLimiter,
  changePassword,
);

module.exports = router;
