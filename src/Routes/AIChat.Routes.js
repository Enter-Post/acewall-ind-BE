import express from "express";
import { askAI, askAIupdated, generateContentForTeacher, generateImage, getChatHistory } from "../Contollers/aiChat.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";
import { upload } from "../lib/DSmulter.config.js";

const router = express.Router();

/**
 * @openapi
 * /api/ai/ask:
 *   post:
 *     tags:
 *       - AI Chat
 *     summary: Ask AI a question
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: AI response
 */
router.post("/ask", upload.single("file"), isUser, askAI);

/**
 * @openapi
 * /api/ai/getChatHistory:
 *   get:
 *     tags:
 *       - AI Chat
 *     summary: Get chat history for current user
 *     responses:
 *       200:
 *         description: Chat history
 */
router.get("/getChatHistory", isUser, getChatHistory)

/**
 * @openapi
 * /api/ai/askupdated:
 *   post:
 *     tags:
 *       - AI Chat
 *     summary: Ask AI (updated version)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: AI response
 */
router.post("/askupdated", upload.single("file"), isUser, askAIupdated);

/**
 * @openapi
 * /api/ai/generateContentForTeacher:
 *   post:
 *     tags:
 *       - AI Chat
 *     summary: Generate content for teachers
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *     responses:
 *       200:
 *         description: Generated content
 */
router.post("/generateContentForTeacher", isUser, generateContentForTeacher);

/**
 * @openapi
 * /api/ai/generateImage:
 *   post:
 *     tags:
 *       - AI Chat
 *     summary: Generate an image using AI
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *     responses:
 *       200:
 *         description: Generated image URL
 */
router.post("/generateImage", isUser, generateImage);

export default router;