import "express-async-errors";
import express from "express";
import cors from "cors";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import dotenv from "dotenv";

import { errorHandler } from "./middleware/errorHandler";
import { initSocket } from "./lib/socket";
import servicesRouter from "./routes/services";
import dependenciesRouter from "./routes/dependencies";
import simulationsRouter from "./routes/simulations";

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: frontendUrl,
    methods: ["GET", "POST"],
  },
});

initSocket(io);

app.use(cors({ origin: frontendUrl }));
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/services", servicesRouter);
app.use("/api/dependencies", dependenciesRouter);
app.use("/api/simulations", simulationsRouter);

io.on("connection", (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

app.use(errorHandler);

const PORT = parseInt(process.env.PORT ?? "4000", 10);
httpServer.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
