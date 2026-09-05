const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { INPUT_LIMITS } = require("../utils/validation");
const RevokedToken = require("../models/RevokedToken");
const { getIO } = require("../socket");
const {
  createTokenId,
  getTokenSocketRoom,
} = require("../utils/tokenUtils");

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
    console.log(error);

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
        message: "User not found",
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
    console.log(error);

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
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

module.exports = { register, login, logout };
