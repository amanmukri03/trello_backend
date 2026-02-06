const socketIO = require("socket.io");

let io;

const initSocket = (server) => {
  io = socketIO(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://amanmukri03.github.io'
    ],
    methods: ["GET", "POST","PUT","DELETE"],
    credentials: true
  },
  });

  io.on("connection", (socket) => {
    console.log("User connected: ", socket.id);

    // Join Board room
    socket.on("joinBoard", (boardId) => {
      socket.join(boardId);
      console.log(`User joined board ${boardId}`);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected: ", socket.id);
    });
  });
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

module.exports = { initSocket, getIO };
