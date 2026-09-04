import { createContext, useState, useEffect, useCallback, useRef } from "react";
import { getConversations } from "../services/messageService";
import { useUser } from "../hooks/useUser";
import { useSocket } from "../hooks/useSocket";

export const ConversationContext = createContext();

export function ConversationProvider({ children }) {
  const [conversations, setConversations] = useState([]);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [messageCache, setMessageCache] = useState({});
  const conversationsRequestRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const { user } = useUser();
  const { socket } = useSocket();
  const currentUserId = user?._id?.toString() || null;

  currentUserIdRef.current = currentUserId;

  const fetchConversations = useCallback(async () => {
    const requestUserId = currentUserIdRef.current;

    if (!requestUserId) return;

    if (conversationsRequestRef.current?.userId === requestUserId) {
      return conversationsRequestRef.current.promise;
    }

    const request = getConversations()
      .then((response) => {
        if (currentUserIdRef.current === requestUserId) {
          setConversations((prev) => {
            const map = new Map(response.data.conversations.map((item) => [item.user._id, item]));
            prev.forEach((item) => { if (!map.has(item.user._id)) map.set(item.user._id, item); });
            return [...map.values()].sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
          });
          setConversationsLoaded(true);
        }

        return response;
      })
      .catch((error) => {
        console.log(error);
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

  useEffect(() => {
    setConversations([]);
    setConversationsLoaded(false);
    setMessageCache({});
    conversationsRequestRef.current = null;

    if (!currentUserId) return;

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
        conversationsLoaded,
        messageCache,
        setMessageCache,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}
