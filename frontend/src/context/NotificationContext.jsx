import {
  getNotifications,
  markAllAsRead,
  deleteSelectedNotifications,
} from "../services/notificationService";
import { createContext, useEffect, useState } from "react";
import { useSocket } from "../hooks/useSocket";
import { useUser } from "../hooks/useUser";

export const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const { socket } = useSocket();
  const { user } = useUser();

  useEffect(() => {
    function handleNewNotification(notification) {
      setNotifications((prev) => [notification, ...prev]);
    }
    socket.on("new-notification", handleNewNotification);

    return () => {
      socket.off("new-notification", handleNewNotification);
    };
  }, [socket]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  async function fetchNotifications() {
    try {
      const response = await getNotifications();

      setNotifications(response.data.notifications);
    } catch (error) {
      console.log(error);
    }
  }

  async function readAllNotifications() {
    try {
      await markAllAsRead();

      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          isRead: true,
        })),
      );
    } catch (error) {
      console.log(error);
    }
  }

  async function deleteSelectedNotificationsFromState(notificationIds) {
    try {
      await deleteSelectedNotifications(notificationIds);

      setNotifications((prev) =>
        prev.filter(
          (notification) => !notificationIds.includes(notification._id),
        ),
      );
    } catch (error) {
      console.log(error);
    }
  }
  return (
    <NotificationContext.Provider
      value={{
        notifications,
        setNotifications,
        fetchNotifications,
        readAllNotifications,
        deleteSelectedNotificationsFromState,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
