import express from "express";
import {
  chapterDiscussions,
  courseDiscussions,
  createDiscussion,
  discussionforStudent,
  editDiscussionInfo,
  getDiscussionbyId,
  getDiscussionsOfTeacher,
  lessonDiscussions,
  setDueDateForStudentsDiscussion,
  toggleAllowResubmission,
} from "../../Contollers/Discussion/discussion.controller.js";
import { upload } from "../../lib/multer.config.js";
import { isUser } from "../../middlewares/Auth.Middleware.js";
import { isEnrolledMiddleware } from "../../middlewares/isEnrolled.middleware.js";
import { resolveEnrollmentFromChapter, resolveEnrollmentFromDiscussion } from "../../middlewares/enrollment-resolvers.js";

const router = express.Router();

/**
 * @openapi
 * /api/discussion/create:
 *   post:
 *     tags:
 *       - Discussion
 *     summary: Create a discussion
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Discussion created successfully
 */
router.post("/create", isUser, upload.array("files"), createDiscussion);

/**
 * @openapi
 * /api/discussion/studentDiscussion:
 *   get:
 *     tags:
 *       - Discussion
 *     summary: Get discussions for student
 *     responses:
 *       200:
 *         description: List of discussions
 */
router.get("/studentDiscussion", isUser, discussionforStudent);

/**
 * @openapi
 * /api/discussion/all:
 *   get:
 *     tags:
 *       - Discussion
 *     summary: Get all discussions for teacher
 *     responses:
 *       200:
 *         description: List of discussions
 */
router.get("/all", isUser, getDiscussionsOfTeacher);

/**
 * @openapi
 * /api/discussion/{id}:
 *   get:
 *     tags:
 *       - Discussion
 *     summary: Get discussion by ID (requires enrollment)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Discussion details
 */
router.get("/v2/:id", isUser, resolveEnrollmentFromDiscussion, isEnrolledMiddleware, getDiscussionbyId);
router.get("/:id", isUser, resolveEnrollmentFromDiscussion, getDiscussionbyId);

/**
 * @openapi
 * /api/discussion/chapter/{chapterId}:
 *   get:
 *     tags:
 *       - Discussion
 *     summary: Get discussions for a chapter (requires enrollment)
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of chapter discussions
 */
router.get("/v2/chapter/:chapterId", isUser, resolveEnrollmentFromChapter, isEnrolledMiddleware, chapterDiscussions);
router.get("/chapter/:chapterId", isUser, resolveEnrollmentFromChapter, chapterDiscussions);

/**
 * @openapi
 * /api/discussion/lesson/{lessonId}:
 *   get:
 *     tags:
 *       - Discussion
 *     summary: Get discussions for a lesson
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of lesson discussions
 */
router.get("/v2/lesson/:lessonId", isUser, isEnrolledMiddleware, lessonDiscussions);
router.get("/lesson/:lessonId", isUser, lessonDiscussions);

/**
 * @openapi
 * /api/discussion/course/{courseId}:
 *   get:
 *     tags:
 *       - Discussion
 *     summary: Get discussions for a course (requires enrollment)
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of course discussions
 */
router.get("/v2/course/:courseId", isUser, isEnrolledMiddleware, courseDiscussions);
router.get("/course/:courseId", isUser, courseDiscussions);

router.put("/editDiscussion/:discussionId", isUser, editDiscussionInfo);
router.put("/setDueDateForStudent/:discussionId", isUser, setDueDateForStudentsDiscussion);
router.put("/toggleAllowResubmission/:discussionId", isUser, toggleAllowResubmission);

export default router;