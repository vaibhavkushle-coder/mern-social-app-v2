const http = require("http");
const { Server } = require("socket.io");

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const {
  setIO,
  addUserSocket,
  removeUserSocket,
  getUserSocketIds,
  getOnlineUserIds,
} = require("./socket");
const User = require("./models/User");
const Message = require("./models/Message");
const Conversation = require("./models/Conversation");
const RevokedToken = require("./models/RevokedToken");
const { isValidObjectId } = require("./utils/validation");
const { getCanonicalConversationPair } = require("./utils/conversationPair");
const { buildVisibleMessageFilter } = require("./utils/messageVisibility");
const { hashToken, getTokenSocketRoom } = require("./utils/tokenUtils");
const logger = require("./utils/logger");

const dotenv = require("dotenv");
dotenv.config();

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "https://frontend-one-omega-14.vercel.app",
  "https://frontend-git-main-vaibhavkushle-coders-projects.vercel.app",
];
const getAllowedOrigins = (value, fallback) => {
  const configuredOrigins = (value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configuredOrigins.length > 0 ? configuredOrigins : fallback;
};
const allowedOrigins = getAllowedOrigins(
  process.env.CORS_ALLOWED_ORIGINS,
  defaultAllowedOrigins,
);

function createSocketEventLimiter(capacity, refillPerSecond) {
  let tokens = capacity;
  let lastRefill = Date.now();

  return () => {
    const now = Date.now();
    const elapsedSeconds = (now - lastRefill) / 1000;
    tokens = Math.min(capacity, tokens + elapsedSeconds * refillPerSecond);
    lastRefill = now;

    if (tokens < 1) return false;

    tokens -= 1;
    return true;
  };
}

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const postRoutes = require("./routes/postRoutes");
const notificationRoutes = require("./routes/notificationRouters");
const messageRoutes = require("./routes/messageRouters");
const reportRoutes = require("./routes/reportRoutes");
const { apiLimiter } = require("./middleware/rateLimiters");

const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});
setIO(io);

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Unauthorized"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("_id");

    if (!user) {
      return next(new Error("Unauthorized"));
    }

    const tokenHash = hashToken(token);

    if (await RevokedToken.exists({ tokenHash })) {
      return next(new Error("Unauthorized"));
    }

    socket.userId = user._id.toString();
    socket.tokenHash = tokenHash;
    socket.tokenId = decoded.jti || null;
    next();
  } catch (error) {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", async (socket) => {
  socket.join(getTokenSocketRoom(socket.tokenHash));

  const allowTyping = createSocketEventLimiter(40, 8);
  const allowStopTyping = createSocketEventLimiter(20, 4);
  const allowMessageSeen = createSocketEventLimiter(20, 2);
  const allowMessageDelivered = createSocketEventLimiter(40, 5);

  let isRevoked;

  try {
    isRevoked = await RevokedToken.exists({ tokenHash: socket.tokenHash });
  } catch {
    socket.disconnect(true);
    return;
  }

  if (isRevoked) {
    socket.disconnect(true);
    return;
  }

  const becameOnline = addUserSocket(socket.userId, socket.id);

  if (becameOnline) {
    socket.broadcast.emit("user-online", socket.userId);
  }
  socket.emit("online-users", getOnlineUserIds());

  socket.on("join-profile", (profileUserId) => {
    if (!isValidObjectId(profileUserId)) return;

    socket.join(`profile:${profileUserId}`);
  });

  socket.on("leave-profile", (profileUserId) => {
    if (!isValidObjectId(profileUserId)) return;

    socket.leave(`profile:${profileUserId}`);
  });

  socket.on("typing", (payload) => {
    const receiverId = payload?.receiverId;

    if (!isValidObjectId(receiverId)) return;
    if (!allowTyping()) return;

    const receiverSocketIds = getUserSocketIds(receiverId);

    if (receiverSocketIds.length > 0) {
      io.to(receiverSocketIds).emit("typing", { senderId: socket.userId });
    }
  });

  socket.on("stop-typing", (payload) => {
    const receiverId = payload?.receiverId;

    if (!isValidObjectId(receiverId)) return;
    if (!allowStopTyping()) return;

    const receiverSocketIds = getUserSocketIds(receiverId);

    if (receiverSocketIds.length > 0) {
      io.to(receiverSocketIds).emit("stop-typing", { senderId: socket.userId });
    }
  });

  socket.on("message-seen", async (payload) => {
    try {
      const senderId = payload?.senderId;

      if (
        !isValidObjectId(senderId) ||
        senderId === socket.userId
      ) {
        return;
      }

      if (!allowMessageSeen()) return;

      const pair = getCanonicalConversationPair(socket.userId, senderId);
      const conversation = await Conversation.findOne({
        participantA: pair.participantA,
        participantB: pair.participantB,
      }).select("_id deletedFor");

      if (!conversation) return;

      const visibleMessageFilter = buildVisibleMessageFilter(
        conversation,
        socket.userId,
      );

      const [seenMessageExists, unseenMessageExists] = await Promise.all([
        Message.exists({
          ...visibleMessageFilter,
          sender: senderId,
          receiver: socket.userId,
          seen: true,
        }),
        Message.exists({
          ...visibleMessageFilter,
          sender: senderId,
          receiver: socket.userId,
          seen: false,
        }),
      ]);

      if (!seenMessageExists || unseenMessageExists) return;

      const senderSocketIds = getUserSocketIds(senderId.toString());

      if (senderSocketIds.length > 0) {
        io.to(senderSocketIds).emit("message-seen", {
          receiverId: socket.userId,
        });
      }
    } catch (error) {
      logger.error("socket.message_seen.failed", error);
    }
  });

  socket.on("message-delivered", async (payload) => {
    try {
      const requestedIds = Array.isArray(payload?.messageIds)
        ? payload.messageIds
        : [payload?.messageId];

      if (requestedIds.length === 0 || requestedIds.length > 100) return;

      const messageIds = [...new Set(requestedIds)].filter(isValidObjectId);

      if (messageIds.length === 0) return;
      if (!allowMessageDelivered()) return;

      const messages = await Message.find({
        _id: { $in: messageIds },
        receiver: socket.userId,
        delivered: false,
      }).select("sender receiver clientMessageId");

      if (messages.length === 0) return;

      const deliveredIds = messages.map((message) => message._id);
      const result = await Message.updateMany(
        {
          _id: { $in: deliveredIds },
          receiver: socket.userId,
          delivered: false,
        },
        { $set: { delivered: true } },
      );

      if (result.modifiedCount === 0) return;

      for (const message of messages) {
        const senderSocketIds = getUserSocketIds(message.sender.toString());

        if (senderSocketIds.length > 0) {
          io.to(senderSocketIds).emit("message-delivered", {
            messageId: message._id,
            clientMessageId: message.clientMessageId,
          });
        }
      }
    } catch (error) {
      logger.error("socket.message_delivered.failed", error);
    }
  });

  socket.on("disconnect", async () => {
    if (socket.userId) {
      const becameOffline = removeUserSocket(socket.userId, socket.id);

      if (becameOffline) {
        try {
          const lastSeen = new Date();
          await User.findByIdAndUpdate(socket.userId, { lastSeen });

          socket.broadcast.emit("user-offline", {
            userId: socket.userId,
            lastSeen: lastSeen.toISOString(),
          });
        } catch (error) {
          logger.error("socket.disconnect_presence.failed", error);
        }
      }
    }
  });
});

app.use(express.json());
app.use(
  cors({
    origin: allowedOrigins,
  }),
);

app.use("/api", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/post", postRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/report", reportRoutes);

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Backend Running🚀");
});

async function startServer() {
  await connectDB();
  await Promise.all([Message.init(), RevokedToken.init()]);

  server.listen(PORT, () => {
    logger.info("server.listening", { port: Number(PORT) || PORT });
  });
}

startServer().catch((error) => {
  logger.error("server.startup.failed", error);
  process.exit(1);
});
