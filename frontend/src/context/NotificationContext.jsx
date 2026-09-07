import {
  getNotifications,
  markAllAsRead,
  deleteSelectedNotifications,
} from "../services/notificationService";
import {
  createContext,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useSocket } from "../hooks/useSocket";
import { useUser } from "../hooks/useUser";

export const NotificationContext = createContext();
const INITIAL_NOTIFICATION_META = {
  nextCursor: null,
  hasMore: true,
  loaded: false,
  loadingMore: false,
};

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [notificationMeta, setNotificationMeta] = useState(
    INITIAL_NOTIFICATION_META,
  );
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const notificationsRequestRef = useRef(null);
  const notificationLoadMoreRequestRef = useRef(null);
  const notificationsRef = useRef([]);
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
          const map = new Map(
            [...response.data.notifications, ...notificationsRef.current].map(
              (item) => [item._id, item],
            ),
          );
          const nextNotifications = [...map.values()].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
          );
          notificationsRef.current = nextNotifications;
          setNotifications(nextNotifications);
          setNotificationMeta((meta) => ({ ...meta, loaded: true, hasMore: response.data.hasMore, nextCursor: response.data.nextCursor }));
          setNotificationUnreadCount(response.data.unreadCount || 0);
        }

        return response;
      })
      .catch((error) => {
      logger.error("notification.fetch.failed", error);
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
      const notificationUserId =
        notification.toUser?._id || notification.toUser;

      if (
        !currentUserIdRef.current ||
        notificationUserId?.toString() !== currentUserIdRef.current
      ) {
        return;
      }

      const existingNotification = notificationsRef.current.some(
        (item) => item._id === notification._id,
      );
      const nextNotifications = [
        notification,
        ...notificationsRef.current.filter(
          (item) => item._id !== notification._id,
        ),
      ];
      notificationsRef.current = nextNotifications;
      setNotifications(nextNotifications);
      if (!existingNotification && !notification.isRead) {
        setNotificationUnreadCount((count) => count + 1);
      }
    }
    function handleNotificationRemoved({ notificationId } = {}) {
      if (!notificationId) return;

      const removedNotification = notificationsRef.current.find(
        (notification) =>
          notification._id?.toString() === notificationId.toString(),
      );
      const nextNotifications = notificationsRef.current.filter(
        (notification) =>
          notification._id?.toString() !== notificationId.toString(),
      );
      notificationsRef.current = nextNotifications;
      setNotifications(nextNotifications);
      if (removedNotification && !removedNotification.isRead) {
        setNotificationUnreadCount((count) => Math.max(0, count - 1));
      }
    }
    function handlePostDeleted({ postId }) {
      const removedUnreadCount = notificationsRef.current.filter(
        (notification) =>
          !notification.isRead &&
          (notification.post?._id || notification.post)?.toString() === postId,
      ).length;
      const nextNotifications = notificationsRef.current.filter(
        (notification) =>
          (notification.post?._id || notification.post)?.toString() !== postId,
      );
      notificationsRef.current = nextNotifications;
      setNotifications(nextNotifications);
      if (removedUnreadCount > 0) {
        setNotificationUnreadCount((count) =>
          Math.max(0, count - removedUnreadCount),
        );
      }
    }
    socket.on("new-notification", handleNewNotification);
    socket.on("notification-removed", handleNotificationRemoved);
    socket.on("post-deleted", handlePostDeleted);

    return () => {
      socket.off("new-notification", handleNewNotification);
      socket.off("notification-removed", handleNotificationRemoved);
      socket.off("post-deleted", handlePostDeleted);
    };
  }, [socket]);

  useLayoutEffect(() => {
    setNotifications([]);
    notificationsRef.current = [];
    setNotificationMeta(INITIAL_NOTIFICATION_META);
    setNotificationUnreadCount(0);
    notificationsRequestRef.current = null;
    notificationLoadMoreRequestRef.current = null;

    if (currentUserId) {
      fetchNotifications().catch(() => {});
    }
  }, [currentUserId, fetchNotifications]);

  async function loadMoreNotifications() {
    if (
      !notificationMeta.hasMore ||
      !notificationMeta.nextCursor ||
      notificationMeta.loadingMore ||
      notificationLoadMoreRequestRef.current
    ) {
      return;
    }
    const requestUserId = currentUserIdRef.current;

    if (!requestUserId) return;

    const requestMarker = { userId: requestUserId };
    notificationLoadMoreRequestRef.current = requestMarker;
    setNotificationMeta((meta) => ({ ...meta, loadingMore: true }));
    try {
      const response = await getNotifications(notificationMeta.nextCursor);

      if (currentUserIdRef.current !== requestUserId) return;

      const map = new Map(
        [...notificationsRef.current, ...response.data.notifications].map(
          (item) => [item._id, item],
        ),
      );
      const nextNotifications = [...map.values()];
      notificationsRef.current = nextNotifications;
      setNotifications(nextNotifications);
      setNotificationMeta((meta) => ({ ...meta, hasMore: response.data.hasMore, nextCursor: response.data.nextCursor }));
      setNotificationUnreadCount(response.data.unreadCount || 0);
    } finally {
      if (notificationLoadMoreRequestRef.current === requestMarker) {
        notificationLoadMoreRequestRef.current = null;
      }
      if (currentUserIdRef.current === requestUserId) {
        setNotificationMeta((meta) => ({ ...meta, loadingMore: false }));
      }
    }
  }

  const readAllNotifications = useCallback(async () => {
    const requestUserId = currentUserIdRef.current;

    if (!requestUserId) return;

    try {
      await markAllAsRead();

      if (currentUserIdRef.current !== requestUserId) return;

      const nextNotifications = notificationsRef.current.map(
        (notification) => ({
          ...notification,
          isRead: true,
        }),
      );
      notificationsRef.current = nextNotifications;
      setNotifications(nextNotifications);
      setNotificationUnreadCount(0);
    } catch (error) {
      logger.error("notification.read_all.failed", error);
    }
  }, []);

  async function deleteSelectedNotificationsFromState(notificationIds) {
    const requestUserId = currentUserIdRef.current;

    if (!requestUserId) return;

    try {
      await deleteSelectedNotifications(notificationIds);

      if (currentUserIdRef.current !== requestUserId) return;

      const removedUnreadCount = notificationsRef.current.filter(
        (notification) =>
          !notification.isRead && notificationIds.includes(notification._id),
      ).length;
      const nextNotifications = notificationsRef.current.filter(
        (notification) => !notificationIds.includes(notification._id),
      );
      notificationsRef.current = nextNotifications;
      setNotifications(nextNotifications);
      if (removedUnreadCount > 0) {
        setNotificationUnreadCount((count) =>
          Math.max(0, count - removedUnreadCount),
        );
      }
    } catch (error) {
      logger.error("notification.delete_selected.failed", error);
    }
  }
  return (
    <NotificationContext.Provider
      value={{
        notifications,
        setNotifications,
        fetchNotifications,
        loadMoreNotifications,
        notificationMeta,
        notificationUnreadCount,
        readAllNotifications,
        deleteSelectedNotificationsFromState,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
import logger from "../utils/logger";
