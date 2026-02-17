

import express from "express";
import { isUser } from "../../middlewares/Auth.Middleware.js";
import { isPostLiked, likePost } from "../../Contollers/PostControllers/postLikes.controller.js";

const router = express.Router();

/**
 * @openapi
 * /api/post-likes/like/{id}:
 *   post:
 *     tags:
 *       - Post Likes
 *     summary: Like or unlike a post
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Like status toggled
 */
router.post("/like/:id", isUser, likePost);

/**
 * @openapi
 * /api/post-likes/isPostLiked/{id}:
 *   get:
 *     tags:
 *       - Post Likes
 *     summary: Check if user has liked a post
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Like status
 */
router.get("/isPostLiked/:id", isUser, isPostLiked);

export default router;