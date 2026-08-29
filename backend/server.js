const http = require("http");
const { Server } = require("socket.io");

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { setIO, onlineUsers } = require("./socket");
const User = require("./models/User");

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

  onlineUsers[socket.userId] = socket.id;

  socket.broadcast.emit("user-online", socket.userId);
  socket.emit("online-users", Object.keys(onlineUsers));

  console.log("Online Users:", onlineUsers);

  socket.on("typing", ({ receiverId }) => {
    const receiverSocketId = onlineUsers[receiverId];

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { senderId: socket.userId });
    }
  });

  socket.on("stop-typing", ({ receiverId }) => {
    const receiverSocketId = onlineUsers[receiverId];

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stop-typing", { senderId: socket.userId });
    }
  });

  socket.on("message-seen", ({ senderId }) => {
    const senderSocketId = onlineUsers[senderId];

    if (senderSocketId) {
      io.to(senderSocketId).emit("message-seen", {
        receiverId: socket.userId,
      });
    }
  });

  socket.on("disconnect", async () => {
    console.log("DISCONNECTED uSER:", socket.userId);

    if (socket.userId) {
      const currentSocketId = onlineUsers[socket.userId];

      if (currentSocketId === socket.id) {
        delete onlineUsers[socket.userId];

        await User.findByIdAndUpdate(socket.userId, { lastSeen: new Date() });

        socket.broadcast.emit("user-offline", {
          userId: socket.userId,
          lastSeen: new Date().toISOString(),
        });
      }
    }

    console.log("❌ User Disconnected");
    console.log("Online Users:", onlineUsers);
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
