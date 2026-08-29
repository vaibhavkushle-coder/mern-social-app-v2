import { useContext } from "react";
import { NotificationContext } from "../context/NotificationContext";

export function useNotification() {
  return useContext(NotificationContext);
}
