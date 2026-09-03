let io;

const onlineUsers = {};

function addUserSocket(userId, socketId) {
  const wasOffline = !onlineUsers[userId]?.size;

  if (!onlineUsers[userId]) {
    onlineUsers[userId] = new Set();
  }

  onlineUsers[userId].add(socketId);
  return wasOffline;
}

function removeUserSocket(userId, socketId) {
  const userSockets = onlineUsers[userId];

  if (!userSockets) return false;

  userSockets.delete(socketId);

  if (userSockets.size > 0) return false;

  delete onlineUsers[userId];
  return true;
}

function getUserSocketIds(userId) {
  return [...(onlineUsers[userId] || [])];
}

function getOnlineUserIds() {
  return Object.keys(onlineUsers);
}

function setIO(socketIO) {
  io = socketIO;
}

function getIO() {
  return io;
}

module.exports = {
  setIO,
  getIO,
  addUserSocket,
  removeUserSocket,
  getUserSocketIds,
  getOnlineUserIds,
};
