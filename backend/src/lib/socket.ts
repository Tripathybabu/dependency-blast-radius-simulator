import { Server } from "socket.io";

let io: Server;

export function initSocket(server: Server): void {
  io = server;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}
