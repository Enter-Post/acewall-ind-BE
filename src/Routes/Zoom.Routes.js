import express from "express";
import {
  scheduleMeeting,
  getCourseMeetings,
  deleteMeeting,
  joinMeeting,
  getActiveMeetings,
  handleZoomWebhook,
  endMeeting,
  getUpcomingStudentMeeting,
} from "../Contollers/Zoom.Controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";

const router = express.Router();

// 1. Get meetings for a course
router.get("/course/:courseId", isUser, getCourseMeetings);
router.get("/upcoming", isUser, getUpcomingStudentMeeting);

// 1.1 Get all active meetings for enrolled courses
router.get("/active", isUser, getActiveMeetings);

// 2. Schedule a new meeting
router.post("/schedule", isUser, scheduleMeeting);

// 3. Join a meeting (Get URL) - For both Host (Start) and Student (Join)
// Frontend should call this when user clicks "Start" or "Join"
router.get("/join/:meetingId", isUser, joinMeeting);

// 4. Delete a meeting
router.delete("/:meetingId", isUser, deleteMeeting);

// 5. End a meeting manually
router.put("/end/:meetingId", isUser, endMeeting);

// 6. Zoom Webhook
router.post("/webhook", handleZoomWebhook);

export default router;
