import {
  getNotifications,
  markAllAsRead,
  deleteSelectedNotifications,
} from "../services/notificationService";
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "../hooks/useSocket";
import { useUser } from "../hooks/useUser";

export const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const notificationsRequestRef = useRef(null);
  const currentUserIdRef = useRef(null);

  const { socket } = useSocket();
  const { user } = useUser();
  const currentUserId = user?._id?.toString() || null;

  currentUserIdRef.current = currentUserId;

  const fetchNotifications = useCallback(async () => {
    const requestUserId = currentUserIdRef.current;

    if (!requestUserId) return;

    if (notificationsRequestRef.current?.userId === requestUserId) {
      return notificationsRequestRef.current.promise;
    }

    const request = getNotifications()
      .then((response) => {
        if (currentUserIdRef.current === requestUserId) {
          setNotifications(response.data.notifications);
        }

        return response;
      })
      .catch((error) => {
        console.log(error);
        throw error;
      })
      .finally(() => {
        if (notificationsRequestRef.current?.promise === request) {
          notificationsRequestRef.current = null;
        }
      });

    notificationsRequestRef.current = {
      userId: requestUserId,
      promise: request,
    };

    return request;
  }, []);

  useEffect(() => {
    function handleNewNotification(notification) {
      if (!currentUserIdRef.current) return;

      setNotifications((prev) => [notification, ...prev]);
    }
    socket.on("new-notification", handleNewNotification);

    return () => {
      socket.off("new-notification", handleNewNotification);
    };
  }, [socket]);

  useEffect(() => {
    setNotifications([]);

    if (!currentUserId) return;

    fetchNotifications().catch(() => {});
  }, [currentUserId, fetchNotifications]);

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
