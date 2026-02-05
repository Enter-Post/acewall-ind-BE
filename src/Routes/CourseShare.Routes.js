import express from "express";
import {
  trackShare,
  getShareAnalytics,
  getCourseShareAnalytics,
  getGlobalShareAnalytics,
} from "../Contollers/CourseShare.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";
import { checkRole } from "../middlewares/admins.middleware.js";

const router = express.Router();

// Public route for tracking shares
router.post("/track", trackShare);

// Admin routes for viewing analytics
router.use(isUser, checkRole);

router.get("/analytics", getShareAnalytics); // Legacy support
router.get("/analytics/global", getGlobalShareAnalytics);
router.get("/analytics/course/:courseId", getCourseShareAnalytics);

export default router;
