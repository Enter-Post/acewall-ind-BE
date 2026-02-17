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

/**
 * @openapi
 * /api/conversation/create:
 *   post:
 *     tags:
 *       - Conversation
 *     summary: Create a conversation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Conversation created
 */
router.post("/create", isUser, createConversation);

/**
 * @openapi
 * /api/conversation/get:
 *   get:
 *     tags:
 *       - Conversation
 *     summary: Get current user's conversations
 *     responses:
 *       200:
 *         description: Conversations list
 */
router.get("/get", isUser, getMyConversations);

/**
 * @openapi
 * /api/conversation/lastSeen/{conversationId}:
 *   patch:
 *     tags:
 *       - Conversation
 *     summary: Update last seen for a conversation
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Last seen updated
 */
router.patch("/lastSeen/:conversationId", isUser, updateLastSeen)

/**
 * @openapi
 * /api/conversation/getTeacherforStudent:
 *   get:
 *     tags:
 *       - Conversation
 *     summary: Get teachers for the student to start conversation with
 *     responses:
 *       200:
 *         description: Teachers list
 */
router.get("/getTeacherforStudent", isUser, getTeacherforStudent)

/**
 * @openapi
 * /api/conversation/getStudentsByOfTeacher/{courseId}:
 *   get:
 *     tags:
 *       - Conversation
 *     summary: Get students of a teacher for a course
 *     parameters:
 *       - in: path
 *         name: courseId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Students list
 */
router.get("/getStudentsByOfTeacher/:courseId", isUser, getStudentsByOfTeacher)

export default router;
