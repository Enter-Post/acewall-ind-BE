import express from "express";
import { getUserNotifications, markAllAsRead, markAsRead } from "../Contollers/notification.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";

const router = express.Router();

router.get("/get", isUser, getUserNotifications);
router.put("/mark-all", isUser, markAllAsRead);
router.put("/:id", isUser, markAsRead);

export default router;