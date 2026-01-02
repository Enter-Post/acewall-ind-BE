import express from "express";
import {
  createConversation,
  //   getConversationbyId,
  getMyConversations,
  getStudentsByOfTeacher,
  getTeacherforStudent,
  updateLastSeen,
} from "../Contollers/conversation.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";

const router = express.Router();

router.post("/create", isUser, createConversation);
router.get("/get", isUser, getMyConversations);
router.patch("/lastSeen/:conversationId", isUser, updateLastSeen)
router.get("/getTeacherforStudent", isUser, getTeacherforStudent)
router.get("/getStudentsByOfTeacher/:courseId", isUser, getStudentsByOfTeacher)

export default router;
