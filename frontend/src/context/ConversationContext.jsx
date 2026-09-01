import { createContext, useState, useEffect, useCallback, useRef } from "react";
import { getConversations } from "../services/messageService";
import { useUser } from "../hooks/useUser";
import { useSocket } from "../hooks/useSocket";

export const ConversationContext = createContext();

export function ConversationProvider({ children }) {
  const [conversations, setConversations] = useState([]);
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
          setConversations(response.data.conversations);
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

    if (!currentUserId) return;

    fetchConversations().catch(() => {});
  }, [currentUserId, fetchConversations]);

  useEffect(() => {
    if (!currentUserId) return;

    function handleReceiveMessage(message) {
      if (message.receiver?._id !== currentUserId) {
        return;
      }

      fetchConversations().catch(() => {});
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
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}
