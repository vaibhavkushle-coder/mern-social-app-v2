import { useContext } from "react";
import { ConversationContext } from "../context/ConversationContext";

export function useConversation() {
  return useContext(ConversationContext);
}
