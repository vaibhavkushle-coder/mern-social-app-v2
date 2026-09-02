import api from "./api";

async function sendMessage(
  userId,
  text,
  postId = null,
  replyTo = null,
  clientMessageId = null,
) {
  return await api.post(`/message/${userId}`, {
    text,
    post: postId,
    replyTo,
    clientMessageId,
  });
}

async function getMessages(userId, before) {
  return await api.get(`/message/${userId}`, {
    params: { limit: 40, before },
  });
}

async function markMessageAsSeen(userId) {
  return await api.put(`/message/seen/${userId}`, {});
}

async function getConversations(cursor) {
  return await api.get("/message/conversations", {
    params: { limit: 20, cursor },
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
  deleteConversation,
  deleteMessageForMe,
  deleteMessageForEveryone,
  editMessage,
};
