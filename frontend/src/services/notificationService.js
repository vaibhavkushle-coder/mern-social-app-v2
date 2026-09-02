import api from "./api";

async function getNotifications(cursor) {
  return await api.get("/notification", { params: { limit: 20, cursor } });
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
