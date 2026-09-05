import { createContext, useState, useEffect } from "react";
import socket from "../socket";
import { useUser } from "../hooks/useUser";

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [lastSeenUsers, setLastSeenUsers] = useState({});

  const { user } = useUser();

  useEffect(() => {
    socket.on("online-users", (users) => {
      setOnlineUsers(users);
    });

    socket.on("user-online", (userId) => {
      setOnlineUsers((prev) => {
        if (prev.includes(userId)) {
          return prev;
        }

        return [...prev, userId];
      });
    });

    socket.on("user-offline", ({ userId, lastSeen }) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));

      setLastSeenUsers((prev) => ({
        ...prev,
        [userId]: lastSeen,
      }));
    });

    return () => {
      socket.off("online-users");
      socket.off("user-online");
      socket.off("user-offline");
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!user?._id || !token) {
      socket.disconnect();
      socket.auth = {};
      setOnlineUsers([]);
      setLastSeenUsers({});
      return;
    }

    socket.auth = { token };
    socket.connect();

    return () => {
      socket.disconnect();
      socket.auth = {};
      setOnlineUsers([]);
      setLastSeenUsers({});
    };
  }, [user?._id]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        setOnlineUsers,
        lastSeenUsers,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export default SocketContext;
