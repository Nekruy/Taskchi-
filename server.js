"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const url_1 = require("url");
const next_1 = __importDefault(require("next"));
const socket_io_1 = require("socket.io");
const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);
const app = (0, next_1.default)({ dev, hostname, port });
const handle = app.getRequestHandler();
app.prepare().then(() => {
    const httpServer = (0, http_1.createServer)((req, res) => {
        const parsedUrl = (0, url_1.parse)(req.url, true);
        handle(req, res, parsedUrl);
    });
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: process.env.NEXT_PUBLIC_APP_URL || "*",
            methods: ["GET", "POST"],
        },
        path: "/socket.io",
    });
    // ─── Socket.io chat logic ──────────────────────────────────────────────────
    const chatRooms = new Map(); // chatId -> Set of socketIds
    io.on("connection", (socket) => {
        console.log(`[Socket] Connected: ${socket.id}`);
        // Join a chat room
        socket.on("join-chat", (chatId) => {
            socket.join(chatId);
            if (!chatRooms.has(chatId)) {
                chatRooms.set(chatId, new Set());
            }
            chatRooms.get(chatId).add(socket.id);
            console.log(`[Socket] ${socket.id} joined chat ${chatId}`);
        });
        // Leave a chat room
        socket.on("leave-chat", (chatId) => {
            var _a;
            socket.leave(chatId);
            (_a = chatRooms.get(chatId)) === null || _a === void 0 ? void 0 : _a.delete(socket.id);
        });
        // Send message
        socket.on("send-message", (data) => {
            // Broadcast to everyone in the room except sender
            socket.to(data.chatId).emit("new-message", data);
        });
        // Typing indicator
        socket.on("typing", (data) => {
            socket.to(data.chatId).emit("user-typing", data);
        });
        socket.on("stop-typing", (data) => {
            socket.to(data.chatId).emit("user-stop-typing", data);
        });
        socket.on("disconnect", () => {
            console.log(`[Socket] Disconnected: ${socket.id}`);
            chatRooms.forEach((sockets) => sockets.delete(socket.id));
        });
    });
    // Make io available globally for API routes
    global.io = io;
    httpServer.listen(port, hostname, () => {
        console.log(`✅ Taskchi готов: http://${hostname}:${port}`);
    });
});
