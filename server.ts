import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "*",
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
  });

  // ─── Socket.io chat logic ──────────────────────────────────────────────────

  const chatRooms = new Map<string, Set<string>>(); // chatId -> Set of socketIds

  io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // Join a chat room
    socket.on("join-chat", (chatId: string) => {
      socket.join(chatId);
      if (!chatRooms.has(chatId)) {
        chatRooms.set(chatId, new Set());
      }
      chatRooms.get(chatId)!.add(socket.id);
      console.log(`[Socket] ${socket.id} joined chat ${chatId}`);
    });

    // Leave a chat room
    socket.on("leave-chat", (chatId: string) => {
      socket.leave(chatId);
      chatRooms.get(chatId)?.delete(socket.id);
    });

    // Send message
    socket.on(
      "send-message",
      (data: {
        chatId: string;
        messageId: string;
        senderId: string;
        senderName: string;
        senderAvatar: string | null;
        content: string;
        createdAt: string;
      }) => {
        // Broadcast to everyone in the room except sender
        socket.to(data.chatId).emit("new-message", data);
      }
    );

    // Typing indicator
    socket.on("typing", (data: { chatId: string; userId: string; userName: string }) => {
      socket.to(data.chatId).emit("user-typing", data);
    });

    socket.on("stop-typing", (data: { chatId: string; userId: string }) => {
      socket.to(data.chatId).emit("user-stop-typing", data);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      chatRooms.forEach((sockets) => sockets.delete(socket.id));
    });
  });

  // Make io available globally for API routes
  (global as Record<string, unknown>).io = io;

  httpServer.listen(port, () => {
    console.log(`✅ Taskchi готов: http://${hostname}:${port}`);
  });
});
