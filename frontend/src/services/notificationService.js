import api from "./api";

async function getNotifications() {
  return await api.get("/notification");
}

async function markAllAsRead() {
  return await api.patch("/notification/read", {});
}

async function deleteSelectedNotifications(notificationIds) {
  return await api.delete("/notification/select", {
    data: {
      notificationIds,
    },
  });
}

export { getNotifications, markAllAsRead, deleteSelectedNotifications };
