//PostComment.Routes.js

import express from "express";
import { isUser } from "../../middlewares/Auth.Middleware.js";
import { getPostComment, sendPostComment } from "../../Contollers/PostControllers/postComment.controller.js";

const router = express.Router();

/**
 * @openapi
 * /api/post-comment/sendComment/{id}:
 *   post:
 *     tags:
 *       - Post Comment
 *     summary: Send a comment on a post
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment sent successfully
 */
router.post("/sendComment/:id", isUser, sendPostComment);

/**
 * @openapi
 * /api/post-comment/getPostComment/{id}:
 *   get:
 *     tags:
 *       - Post Comment
 *     summary: Get comments for a post
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: List of comments
 */
router.get("/getPostComment/:id", isUser, getPostComment)

export default router;