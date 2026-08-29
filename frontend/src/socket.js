import { io } from "socket.io-client";

const socket = io("https://mern-social-backend-hl8v.onrender.com", {
  autoConnect: false,
});

export default socket;
