import express from "express";
import {
  trackShare,
  getShareAnalytics,
} from "../Contollers/CourseShare.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";
import { checkRole } from "../middlewares/admins.middleware.js";

const router = express.Router();

// Public route for tracking shares
router.post("/track", trackShare);

// Admin route for viewing analytics
router.get("/analytics", isUser, checkRole, getShareAnalytics);

export default router;
