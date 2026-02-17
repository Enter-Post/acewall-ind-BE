import express from "express";
import { createPost, deletePost, getPosts, specificUserPosts } from "../../Contollers/PostControllers/post.controller.js";
import { upload } from "../../lib/DSmulter.config.js";
import { isUser } from "../../middlewares/Auth.Middleware.js";

const router = express.Router();

/**
 * @openapi
 * /api/posts:
 *   post:
 *     tags:
 *       - Posts
 *     summary: Create a post (with assets)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               assets:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Post created
 */
router.post("/", upload.array("assets"), isUser, createPost);

/**
 * @openapi
 * /api/posts/getPosts:
 *   get:
 *     tags:
 *       - Posts
 *     summary: Get posts for current user feed
 *     responses:
 *       200:
 *         description: Posts list
 */
router.get("/getPosts", isUser, getPosts);

/**
 * @openapi
 * /api/posts/specificUserPosts/{id}:
 *   get:
 *     tags:
 *       - Posts
 *     summary: Get posts by a specific user
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: User posts
 */
router.get("/specificUserPosts/:id", isUser, specificUserPosts);

/**
 * @openapi
 * /api/posts/deletePost/{postId}:
 *   delete:
 *     tags:
 *       - Posts
 *     summary: Delete a post
 *     parameters:
 *       - in: path
 *         name: postId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Post deleted
 */
router.delete("/deletePost/:postId", isUser, deletePost)

export default router;