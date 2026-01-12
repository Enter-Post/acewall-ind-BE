import express from "express";
import { isUser } from "../middlewares/Auth.Middleware.js";
import { joinMeeting } from "../Contollers/MeetingController.js";


const router = express.Router();
router.get("/join/:meetingId", isUser, joinMeeting);

export default router;