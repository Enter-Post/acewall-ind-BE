import express from "express";
import { createMessage, getAllUnreadCounts, getConversationMessages, markMessagesAsRead } from "../Contollers/message.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";

const router = express.Router();

router.post("/create/:conversationId", isUser, createMessage);
router.get("/get/:conversationId", isUser, getConversationMessages);
router.post("/markAsRead/:conversationId", isUser, markMessagesAsRead);
router.get("/getUnreadCount", isUser, getAllUnreadCounts);

export default router;
