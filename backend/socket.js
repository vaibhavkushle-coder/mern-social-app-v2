let io;

const onlineUsers = {};

function setIO(socketIO) {
  io = socketIO;
}

function getIO() {
  return io;
}

module.exports = { setIO, getIO, onlineUsers };
