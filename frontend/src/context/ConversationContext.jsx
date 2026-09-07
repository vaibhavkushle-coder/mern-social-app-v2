import {
  createContext,
  useState,
  useLayoutEffect,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { getConversations } from "../services/messageService";
import { useUser } from "../hooks/useUser";
import { useSocket } from "../hooks/useSocket";

export const ConversationContext = createContext();
const INITIAL_CONVERSATION_META = {
  hasMore: true,
  nextCursor: null,
  loadingMore: false,
};

export function ConversationProvider({ children }) {
  const [conversations, setConversations] = useState([]);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [conversationMeta, setConversationMeta] = useState(
    INITIAL_CONVERSATION_META,
  );
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [messageCache, setMessageCache] = useState({});
  const conversationsRequestRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const conversationMetaRef = useRef(INITIAL_CONVERSATION_META);
  const requestVersionRef = useRef(0);
  const { user } = useUser();
  const { socket } = useSocket();
  const currentUserId = user?._id?.toString() || null;

  if (currentUserIdRef.current !== currentUserId) {
    currentUserIdRef.current = currentUserId;
    conversationMetaRef.current = INITIAL_CONVERSATION_META;
    conversationsRequestRef.current = null;
    requestVersionRef.current += 1;
  } else {
    conversationMetaRef.current = conversationMeta;
  }

  const fetchConversations = useCallback(async () => {
    const requestUserId = currentUserIdRef.current;
    const requestVersion = requestVersionRef.current;

    if (!requestUserId) return;

    if (conversationsRequestRef.current?.userId === requestUserId) {
      return conversationsRequestRef.current.promise;
    }

    const request = getConversations()
      .then((response) => {
        if (
          currentUserIdRef.current === requestUserId &&
          requestVersionRef.current === requestVersion
        ) {
          setConversations((prev) => {
            const map = new Map(response.data.conversations.map((item) => [item.user._id, item]));
            prev.forEach((item) => { if (!map.has(item.user._id)) map.set(item.user._id, item); });
            return [...map.values()].sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
          });
          setConversationMeta({
            hasMore: response.data.hasMore,
            nextCursor: response.data.nextCursor,
            loadingMore: false,
          });
          setMessageUnreadCount(response.data.totalUnreadCount || 0);
          setConversationsLoaded(true);
        }

        return response;
      })
      .catch((error) => {
      logger.error("conversation.fetch.failed", error);
        throw error;
      })
      .finally(() => {
        if (conversationsRequestRef.current?.promise === request) {
          conversationsRequestRef.current = null;
        }
      });

    conversationsRequestRef.current = {
      userId: requestUserId,
      promise: request,
    };

    return request;
  }, []);

  const loadMoreConversations = useCallback(async () => {
    const requestUserId = currentUserIdRef.current;
    const requestVersion = requestVersionRef.current;
    const { hasMore, nextCursor, loadingMore } = conversationMetaRef.current;

    if (
      !requestUserId ||
      !hasMore ||
      !nextCursor ||
      loadingMore ||
      conversationsRequestRef.current
    ) {
      return;
    }

    const loadingMeta = {
      ...conversationMetaRef.current,
      loadingMore: true,
    };
    conversationMetaRef.current = loadingMeta;
    setConversationMeta(loadingMeta);

    const request = getConversations(nextCursor)
      .then((response) => {
        if (
          currentUserIdRef.current !== requestUserId ||
          requestVersionRef.current !== requestVersion
        ) {
          return response;
        }

        setConversations((prev) => {
          const map = new Map(
            response.data.conversations.map((item) => [item.user._id, item]),
          );
          prev.forEach((item) => map.set(item.user._id, item));
          return [...map.values()].sort(
            (a, b) =>
              new Date(b.lastMessageTime) - new Date(a.lastMessageTime),
          );
        });
        setConversationMeta({
          hasMore: response.data.hasMore,
          nextCursor: response.data.nextCursor,
          loadingMore: false,
        });
        setMessageUnreadCount(response.data.totalUnreadCount || 0);

        return response;
      })
      .catch((error) => {
        logger.error("conversation.load_more.failed", error);
        throw error;
      })
      .finally(() => {
        if (conversationsRequestRef.current?.promise === request) {
          conversationsRequestRef.current = null;
        }
        if (
          currentUserIdRef.current === requestUserId &&
          requestVersionRef.current === requestVersion
        ) {
          setConversationMeta((meta) => ({ ...meta, loadingMore: false }));
        }
      });

    conversationsRequestRef.current = {
      userId: requestUserId,
      promise: request,
    };

    return request;
  }, []);

  const clearConversationUnread = useCallback((otherUserId, clearedCount) => {
    const targetUserId = otherUserId?.toString();

    if (!targetUserId) return;

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.user?._id?.toString() === targetUserId
          ? { ...conversation, unreadCount: 0 }
          : conversation,
      ),
    );

    if (Number.isInteger(clearedCount) && clearedCount > 0) {
      setMessageUnreadCount((count) => Math.max(0, count - clearedCount));
    }
  }, []);

  const clearConversationMessageCache = useCallback((otherUserIds) => {
    const targetUserIds = new Set(
      (Array.isArray(otherUserIds) ? otherUserIds : [otherUserIds])
        .filter(Boolean)
        .map((userId) => userId.toString()),
    );

    if (targetUserIds.size === 0) return;

    setMessageCache((cache) => {
      const nextCache = { ...cache };

      targetUserIds.forEach((userId) => {
        delete nextCache[userId];
      });

      return nextCache;
    });
  }, []);

  const getConversationAccountGeneration = useCallback(
    () => ({
      userId: currentUserIdRef.current,
      version: requestVersionRef.current,
    }),
    [],
  );

  const isConversationAccountGenerationCurrent = useCallback(
    ({ userId, version }) =>
      currentUserIdRef.current === userId &&
      requestVersionRef.current === version,
    [],
  );

  useLayoutEffect(() => {
    setConversations([]);
    setConversationsLoaded(false);
    setConversationMeta(INITIAL_CONVERSATION_META);
    setMessageUnreadCount(0);
    setMessageCache({});
    conversationsRequestRef.current = null;

    if (currentUserId) {
      fetchConversations().catch(() => {});
    }
  }, [currentUserId, fetchConversations]);

  useEffect(() => {
    if (!currentUserId) return;

    function handleReceiveMessage(message) {
      if (message.receiver?._id !== currentUserId) {
        return;
      }

      socket.emit("message-delivered", {
        messageId: message._id,
        clientMessageId: message.clientMessageId,
      });
      setMessageUnreadCount((count) => count + 1);

      setConversations((prev) => {
        const other = message.sender;
        const next = { user: other, lastMessage: message.text, lastMessageTime: message.createdAt, lastMessageId: message._id, unreadCount: 1 };
        const existing = prev.find((item) => item.user._id === other._id);
        if (existing) next.unreadCount = (existing.unreadCount || 0) + 1;
        return [next, ...prev.filter((item) => item.user._id !== other._id)];
      });
    }

    socket.on("receive-message", handleReceiveMessage);

    return () => {
      socket.off("receive-message", handleReceiveMessage);
    };
  }, [socket, currentUserId, fetchConversations]);

  return (
    <ConversationContext.Provider
      value={{
        conversations,
        setConversations,
        fetchConversations,
        loadMoreConversations,
        conversationsLoaded,
        conversationMeta,
        messageUnreadCount,
        clearConversationUnread,
        clearConversationMessageCache,
        getConversationAccountGeneration,
        isConversationAccountGenerationCurrent,
        messageCache,
        setMessageCache,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}
import logger from "../utils/logger";
