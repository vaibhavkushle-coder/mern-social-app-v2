import api from "./api";

async function sendMessage(userId, text, postId = null, replyTo = null) {
  return await api.post(`/message/${userId}`, { text, post: postId, replyTo });
}

async function getMessages(userId) {
  return await api.get(`/message/${userId}`);
}

async function markMessageAsSeen(userId) {
  return await api.put(`/message/seen/${userId}`, {});
}

async function getConversations() {
  return await api.get("/message/conversations");
}

async function deleteSelectedMessages(messageIds) {
  return await api.delete("/message/deleteMessage", {
    data: {
      messageIds,
    },
  });
}

async function deleteConversation(userId) {
  return await api.delete(`/message/conversation/${userId}`);
}

async function deleteMessageForMe(messageId) {
  return await api.delete(`/message/delete-for-me/${messageId}`);
}

async function deleteMessageForEveryone(messageId) {
  return await api.delete(`/message/delete-for-everyone/${messageId}`);
}
async function editMessage(messageid, text) {
  return await api.put(`/message/edit/${messageid}`, { text });
}

export {
  sendMessage,
  getMessages,
  markMessageAsSeen,
  getConversations,
  deleteSelectedMessages,
  deleteConversation,
  deleteMessageForMe,
  deleteMessageForEveryone,
  editMessage,
};
