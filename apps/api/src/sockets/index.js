import { Server } from "socket.io";

let io;

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true
    }
  });

  io.on("connection", socket => {
    console.log("Socket connected:", socket.id);

    socket.on("team:join", teamId => {
      socket.join(`team:${teamId}`);
      console.log(`Socket ${socket.id} joined team:${teamId}`);
    });

    socket.on("team:leave", teamId => {
      socket.leave(`team:${teamId}`);
      console.log(`Socket ${socket.id} left team:${teamId}`);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.io has not been initialized");
  }

  return io;
}