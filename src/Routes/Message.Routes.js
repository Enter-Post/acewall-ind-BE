import express from "express";
import { createMessage, getAllUnreadCounts, getConversationMessages, markMessagesAsRead } from "../Contollers/message.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";

const router = express.Router();

/**
 * @openapi
 * /api/message/create/{conversationId}:
 *   post:
 *     tags:
 *       - Message
 *     summary: Create a message in a conversation
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message created
 */
router.post("/create/:conversationId", isUser, createMessage);

/**
 * @openapi
 * /api/message/get/{conversationId}:
 *   get:
 *     tags:
 *       - Message
 *     summary: Get messages for a conversation
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Conversation messages
 */
router.get("/get/:conversationId", isUser, getConversationMessages);

/**
 * @openapi
 * /api/message/markAsRead/{conversationId}:
 *   post:
 *     tags:
 *       - Message
 *     summary: Mark messages as read in a conversation
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Messages marked as read
 */
router.post("/markAsRead/:conversationId", isUser, markMessagesAsRead);

/**
 * @openapi
 * /api/message/getUnreadCount:
 *   get:
 *     tags:
 *       - Message
 *     summary: Get unread message counts for current user
 *     responses:
 *       200:
 *         description: Unread counts
 */
router.get("/getUnreadCount", isUser, getAllUnreadCounts);

export default router;
