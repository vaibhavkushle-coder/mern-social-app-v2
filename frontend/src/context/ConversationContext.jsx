import { createContext, useState, useEffect, useCallback } from "react";
import { getConversations } from "../services/messageService";
import { useUser } from "../hooks/useUser";
import { useSocket } from "../hooks/useSocket";

export const ConversationContext = createContext();

export function ConversationProvider({ children }) {
  const [conversations, setConversations] = useState([]);
  const { user } = useUser();
  const { socket } = useSocket();

  const fetchConversations = useCallback(async () => {
    try {
      const response = await getConversations();

      setConversations(response.data.conversations);
    } catch (error) {
      console.log(error);
    }
  }, []);

  useEffect(() => {
    if (!user?._id) return;

    fetchConversations();
  }, [user?._id, fetchConversations]);

  useEffect(() => {
    if (!user?._id) return;

    function handleReceiveMessage(message) {
      if (message.receiver?._id !== user._id) {
        return;
      }

      fetchConversations();
    }

    socket.on("receive-message", handleReceiveMessage);

    return () => {
      socket.off("receive-message", handleReceiveMessage);
    };
  }, [socket, user?._id, fetchConversations]);

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
