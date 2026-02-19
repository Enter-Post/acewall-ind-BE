import express from "express";
import { isUser } from "../../middlewares/Auth.Middleware.js";
import {
  deleteComment,
  getDiscussionComments,
  gradeDiscussionofStd,
  isCommentedInDiscussion,
  sendDiscussionComment,
} from "../../Contollers/Discussion/discussionComment.controller.js";
import { isEnrolledMiddleware } from "../../middlewares/isEnrolled.middleware.js";
import { resolveEnrollmentFromDiscussion } from "../../middlewares/enrollment-resolvers.js";

const router = express.Router();

/**
 * @openapi
 * /api/discussion-comment/get/{id}:
 *   get:
 *     tags:
 *       - Discussion Comment
 *     summary: Get comments for a discussion (requires enrollment)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of comments
 */
router.get("/get/:id", isUser, resolveEnrollmentFromDiscussion, isEnrolledMiddleware, getDiscussionComments);

/**
 * @openapi
 * /api/discussion-comment/sendComment/{id}:
 *   post:
 *     tags:
 *       - Discussion Comment
 *     summary: Send a comment on discussion (requires enrollment)
 *     parameters:
 *       - in: path
 *         name: id
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
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment sent successfully
 */
router.post("/sendComment/:id", isUser, resolveEnrollmentFromDiscussion, isEnrolledMiddleware, sendDiscussionComment);

/**
 * @openapi
 * /api/discussion-comment/delete/{id}:
 *   delete:
 *     tags:
 *       - Discussion Comment
 *     summary: Delete a discussion comment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 */
router.delete("/delete/:id", isUser, deleteComment);

////grades
/**
 * @openapi
 * /api/discussion-comment/gradeDiscussionofStd/{discID}/{discussionCommentId}:
 *   put:
 *     tags:
 *       - Discussion Comment
 *     summary: Grade a student's discussion comment
 *     parameters:
 *       - in: path
 *         name: discID
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: discussionCommentId
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
 *               grade:
 *                 type: number
 *     responses:
 *       200:
 *         description: Discussion comment graded
 */
router.put("/gradeDiscussionofStd/:discID/:discussionCommentId", isUser, gradeDiscussionofStd)

/**
 * @openapi
 * /api/discussion-comment/isCommentedInDiscussion/{id}:
 *   get:
 *     tags:
 *       - Discussion Comment
 *     summary: Check if user has commented in discussion
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment status
 */
router.get("/isCommentedInDiscussion/:id", isUser, isCommentedInDiscussion)
export default router;