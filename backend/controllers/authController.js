const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { INPUT_LIMITS } = require("../utils/validation");
const RevokedToken = require("../models/RevokedToken");
const { getIO } = require("../socket");
const { createTokenId, getTokenSocketRoom } = require("../utils/tokenUtils");
const logger = require("../utils/logger");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function register(req, res) {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedName.length > INPUT_LIMITS.name) {
      return res.status(400).json({ message: "Name is too long" });
    }

    if (
      normalizedEmail.length > INPUT_LIMITS.email ||
      !EMAIL_PATTERN.test(normalizedEmail)
    ) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const passwordBytes = Buffer.byteLength(password, "utf8");

    if (passwordBytes < 8 || passwordBytes > INPUT_LIMITS.passwordBytes) {
      return res.status(400).json({
        message: "Password must be 8 to 72 bytes long",
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
    });

    const token = jwt.sign(
      { id: user._id, jti: createTokenId() },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: safeUser,
    });
  } catch (error) {
    logger.error("auth.register.failed", error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      { id: user._id, jti: createTokenId() },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(200).json({
      message: "Login successful",
      token,
      user: safeUser,
    });
  } catch (error) {
    logger.error("auth.login.failed", error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function logout(req, res) {
  try {
    const { tokenHash, expiresAt } = req.auth;

    if (Number.isNaN(expiresAt.getTime())) {
      throw new Error("Authenticated token is missing a valid expiry");
    }

    await RevokedToken.updateOne(
      { tokenHash },
      { $setOnInsert: { tokenHash, expiresAt } },
      { upsert: true },
    );

    const io = getIO();

    if (io) {
      io.in(getTokenSocketRoom(tokenHash)).disconnectSockets(true);
    }

    res.status(200).json({
      message: "Logout successful",
    });
  } catch (error) {
    logger.error("auth.logout.failed", error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function changePassword(req, res) {
  const { currentPassword, newPassword, confirmPassword } = req.body || {};

  if (
    typeof currentPassword !== "string" ||
    typeof newPassword !== "string" ||
    typeof confirmPassword !== "string" ||
    !currentPassword ||
    !newPassword ||
    !confirmPassword
  ) {
    return res.status(400).json({ message: "All password fields are required" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "New passwords do not match" });
  }

  if (Buffer.byteLength(currentPassword, "utf8") > INPUT_LIMITS.passwordBytes) {
    return res.status(400).json({ message: "Current password is incorrect" });
  }

  const passwordBytes = Buffer.byteLength(newPassword, "utf8");

  if (passwordBytes < 8 || passwordBytes > INPUT_LIMITS.passwordBytes) {
    return res.status(400).json({
      message: "Password must be 8 to 72 bytes long",
    });
  }

  let session;

  try {
    const user = await User.findById(req.user._id).select("password");

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const currentPasswordMatches = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!currentPasswordMatches) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({
        message: "New password must be different from current password",
      });
    }

    const { tokenHash, expiresAt } = req.auth;

    if (Number.isNaN(expiresAt.getTime())) {
      throw new Error("Authenticated token is missing a valid expiry");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const replacementToken = jwt.sign(
      { id: user._id, jti: createTokenId() },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );
    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const passwordUpdate = await User.updateOne(
        { _id: user._id, password: user.password },
        { $set: { password: hashedPassword } },
        { session },
      );

      if (passwordUpdate.modifiedCount !== 1) {
        throw new Error("Password could not be updated");
      }

      await RevokedToken.updateOne(
        { tokenHash },
        { $setOnInsert: { tokenHash, expiresAt } },
        { upsert: true, session },
      );
    });

    try {
      const io = getIO();

      if (io) {
        io.in(getTokenSocketRoom(tokenHash)).disconnectSockets(true);
      }
    } catch (socketError) {
      logger.error("auth.change_password.realtime_failed", socketError);
    }

    return res.status(200).json({
      message: "Password changed successfully.",
      token: replacementToken,
    });
  } catch (error) {
    logger.error("auth.change_password.failed", error);

    return res.status(500).json({ message: "Server Error" });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

module.exports = { register, login, logout, changePassword };
