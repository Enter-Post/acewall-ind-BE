import dotenv from "dotenv";
import express from "express";
import { Server } from "socket.io";
import http from "http";

dotenv.config();
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      'https://acewall.vercel.app',
      'https://acewallscholars.vercel.app',
      'https://acewall-admin.vercel.app',
      'https://acewall-admin-independent.vercel.app',
      'https://acewallscholarslearningonline.org',
      'https://admin.acewallscholarslearningonline.org',
      'http://localhost:5173',
      'http://localhost:5174',
    ],
    credentials: true,
  },
});


// Store user socket mappings
const userSocketMap = {};

// Store users who are currently typing
const typingUsers = {};

export const getRecieverSocketId = (userId) => {
  return userSocketMap[userId];
};

io.on("connection", (socket) => {
  // console.log(`User connected: ${socket.id}`);

  const userId = socket.handshake.query.userId;

  if (userId) {
    // Map user ID to socket ID
    userSocketMap[userId] = socket.id;
    // console.log(`User ${userId} connected with socket ${socket.id}`);

    // Broadcast online users to all clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  }

  // Handle disconnection
  socket.on("disconnect", () => {
    // console.log(`User disconnected: ${socket.id}`);

    // Find and remove the user from userSocketMap
    const disconnectedUserId = Object.keys(userSocketMap).find(
      (key) => userSocketMap[key] === socket.id
    );

    if (disconnectedUserId) {
      // console.log(`User ${disconnectedUserId} disconnected`);
      delete userSocketMap[disconnectedUserId];

      // Clean up typing indicators for this user
      Object.keys(typingUsers).forEach((key) => {
        if (key.includes(disconnectedUserId)) {
          delete typingUsers[key];
        }
      });
    }

    // Broadcast updated online users list
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { app, server, io };
