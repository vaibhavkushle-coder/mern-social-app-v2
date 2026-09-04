import { io } from "socket.io-client";

const socketUrl =
  import.meta.env.VITE_SOCKET_URL?.replace(/\/+$/, "") ||
  "https://mern-social-backend-hl8v.onrender.com";

const socket = io(socketUrl, {
  autoConnect: false,
});

export default socket;
