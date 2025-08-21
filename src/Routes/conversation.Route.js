import express from "express";
import {
  createConversation,
  //   getConversationbyId,
  getMyConversations,
  getTeacherforStudent,
  updateLastSeen,
} from "../Contollers/conversation.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";

const router = express.Router();

router.post("/create", isUser, createConversation);
router.get("/get", isUser, getMyConversations);
router.patch("/lastSeen/:conversationId", isUser, updateLastSeen)
router.get("/getTeacherforStudent", isUser, getTeacherforStudent)


export default router;
