import express from "express";
import {
  getReplyCount,
  getreplyofComment,
  sendReplyofComment,
} from "../../Contollers/Discussion/replyDiscussion.controller.js";
import { isUser } from "../../middlewares/Auth.Middleware.js";

const router = express.Router();

/**
 * @openapi
 * /api/reply-discussion/send/{commentId}:
 *   post:
 *     tags:
 *       - Discussion Reply
 *     summary: Send a reply to a discussion comment
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reply:
 *                 type: string
 *     responses:
 *       201:
 *         description: Reply sent successfully
 */
router.post("/send/:commentId", isUser, sendReplyofComment);

/**
 * @openapi
 * /api/reply-discussion/get/{commentId}:
 *   get:
 *     tags:
 *       - Discussion Reply
 *     summary: Get replies for a comment
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of replies
 */
router.get("/get/:commentId", isUser, getreplyofComment);

/**
 * @openapi
 * /api/reply-discussion/replycount/{commentId}:
 *   get:
 *     tags:
 *       - Discussion Reply
 *     summary: Get reply count for a comment
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reply count
 */
router.get("/replycount/:commentId", getReplyCount);

export default router;
