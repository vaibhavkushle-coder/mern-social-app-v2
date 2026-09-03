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

const dotenv = require("dotenv");
dotenv.config();

const connectDB = require("./config/db");
connectDB();

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const postRoutes = require("./routes/postRoutes");
const notificationRoutes = require("./routes/notificationRouters");
const messageRoutes = require("./routes/messageRouters");
const reportRoutes = require("./routes/reportRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://frontend-one-omega-14.vercel.app",
      "https://frontend-git-main-vaibhavkushle-coders-projects.vercel.app",
    ],
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
    if (!profileUserId) return;

    socket.join(`profile:${profileUserId}`);
  });

  socket.on("leave-profile", (profileUserId) => {
    if (!profileUserId) return;

    socket.leave(`profile:${profileUserId}`);
  });

  socket.on("typing", ({ receiverId }) => {
    const receiverSocketIds = getUserSocketIds(receiverId);

    if (receiverSocketIds.length > 0) {
      io.to(receiverSocketIds).emit("typing", { senderId: socket.userId });
    }
  });

  socket.on("stop-typing", ({ receiverId }) => {
    const receiverSocketIds = getUserSocketIds(receiverId);

    if (receiverSocketIds.length > 0) {
      io.to(receiverSocketIds).emit("stop-typing", { senderId: socket.userId });
    }
  });

  socket.on("message-seen", ({ senderId }) => {
    const senderSocketIds = getUserSocketIds(senderId);

    if (senderSocketIds.length > 0) {
      io.to(senderSocketIds).emit("message-seen", {
        receiverId: socket.userId,
      });
    }
  });

  socket.on("message-delivered", async ({ messageId, clientMessageId }) => {
    try {
      const message = await Message.findById(messageId).select(
        "sender receiver delivered",
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
          clientMessageId,
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
    origin: [
      "http://localhost:5173",
      "https://frontend-one-omega-14.vercel.app",
    ],
  }),
);

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

server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
