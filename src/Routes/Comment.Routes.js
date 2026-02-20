import {
  allCommentsofTeacher,
  deleteComment,
  getCourseComments,
  sendComment,
} from "../Contollers/comment.controller.js";
import express from "express";
import { isUser } from "../middlewares/Auth.Middleware.js";

const router = express.Router();

/**
 * @openapi
 * /api/comment/{id}:
 *   get:
 *     tags:
 *       - Comment
 *     summary: Get comments for a course
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Course ID
 *     responses:
 *       200:
 *         description: List of comments
 */
router.get("/:id", isUser, getCourseComments);

/**
 * @openapi
 * /api/comment/sendComment/{id}:
 *   post:
 *     tags:
 *       - Comment
 *     summary: Send a comment for a course
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Course ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment created
 */
router.post("/sendComment/:id", isUser, sendComment);

/**
 * @openapi
 * /api/comment/teacher/allComment:
 *   get:
 *     tags:
 *       - Comment
 *     summary: Get all comments for teacher's courses
 *     responses:
 *       200:
 *         description: Comments list
 */
router.get('/teacher/allComment', isUser , allCommentsofTeacher);

/**
 * @openapi
 * /api/comment/{courseId}/comment/{commentId}:
 *   delete:
 *     tags:
 *       - Comment
 *     summary: Delete a comment
 *     parameters:
 *       - in: path
 *         name: courseId
 *         schema:
 *           type: string
 *         required: true
 *       - in: path
 *         name: commentId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Comment deleted
 */
router.delete('/:courseId/comment/:commentId', isUser, deleteComment);


export default router;
