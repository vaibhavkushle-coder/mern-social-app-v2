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
const { isValidObjectId } = require("./utils/validation");

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

    socket.userId = user._id.toString();
    next();
  } catch (error) {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  console.log("✅ User Connected:", socket.id);

  const becameOnline = addUserSocket(socket.userId, socket.id);

  if (becameOnline) {
    socket.broadcast.emit("user-online", socket.userId);
  }
  socket.emit("online-users", getOnlineUserIds());

  console.log("Online Users:", getOnlineUserIds());

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

    const receiverSocketIds = getUserSocketIds(receiverId);

    if (receiverSocketIds.length > 0) {
      io.to(receiverSocketIds).emit("typing", { senderId: socket.userId });
    }
  });

  socket.on("stop-typing", (payload) => {
    const receiverId = payload?.receiverId;

    if (!isValidObjectId(receiverId)) return;

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

      const [seenMessageExists, unseenMessageExists] = await Promise.all([
        Message.exists({
          sender: senderId,
          receiver: socket.userId,
          seen: true,
        }),
        Message.exists({
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
      console.log(error);
    }
  });

  socket.on("message-delivered", async (payload) => {
    try {
      const messageId = payload?.messageId;

      if (!isValidObjectId(messageId)) return;

      const message = await Message.findById(messageId).select(
        "sender receiver delivered clientMessageId",
      );

      if (!message || message.receiver.toString() !== socket.userId) {
        return;
      }

      if (!message.delivered) {
        message.delivered = true;
        await message.save();
      }

      const senderSocketIds = getUserSocketIds(message.sender.toString());

      if (senderSocketIds.length > 0) {
        io.to(senderSocketIds).emit("message-delivered", {
          messageId: message._id,
          clientMessageId: message.clientMessageId,
        });
      }
    } catch (error) {
      console.log(error);
    }
  });

  socket.on("disconnect", async () => {
    console.log("DISCONNECTED uSER:", socket.userId);

    if (socket.userId) {
      const becameOffline = removeUserSocket(socket.userId, socket.id);

      if (becameOffline) {
        const lastSeen = new Date();
        await User.findByIdAndUpdate(socket.userId, { lastSeen });

        socket.broadcast.emit("user-offline", {
          userId: socket.userId,
          lastSeen: lastSeen.toISOString(),
        });
      }
    }

    console.log("❌ User Disconnected");
    console.log("Online Users:", getOnlineUserIds());
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
  await Message.init();

  server.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});
