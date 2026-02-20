import express from "express";
import { getUserNotifications, markAllAsRead, markAsRead } from "../Contollers/notification.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";

const router = express.Router();

/**
 * @openapi
 * /api/notifications/get:
 *   get:
 *     tags:
 *       - Notification
 *     summary: Get current user's notifications
 *     responses:
 *       200:
 *         description: Notifications list
 */
router.get("/get", isUser, getUserNotifications);

/**
 * @openapi
 * /api/notifications/mark-all:
 *   put:
 *     tags:
 *       - Notification
 *     summary: Mark all notifications as read
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.put("/mark-all", isUser, markAllAsRead);

/**
 * @openapi
 * /api/notifications/{id}:
 *   put:
 *     tags:
 *       - Notification
 *     summary: Mark a single notification as read
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.put("/:id", isUser, markAsRead);

export default router;