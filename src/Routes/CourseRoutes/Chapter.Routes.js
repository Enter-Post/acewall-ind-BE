import express from "express";
import {
  ChapterofCourse,
  createChapter,
  deleteChapter,
  editChapter,
  getChapterofCourse,
  getChapterOfQuarter,
  getChapterwithLessons,
} from "../../Contollers/CourseControllers/chapter.controller.js";
import { isUser } from "../../middlewares/Auth.Middleware.js";
import { isEnrolledMiddleware } from "../../middlewares/isEnrolled.middleware.js";
import { resolveEnrollmentFromChapter } from "../../middlewares/enrollment-resolvers.js";

const router = express.Router();

/**
 * @openapi
 * /api/chapter/chapterofCourse/{courseId}:
 *   get:
 *     tags:
 *       - Chapter
 *     summary: Get chapters for a course (requires enrollment)
 *     parameters:
 *       - in: path
 *         name: courseId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Chapters list
 */
router.get("/chapterofCourse/:courseId", isUser, isEnrolledMiddleware, ChapterofCourse);

/**
 * @openapi
 * /api/chapter/create/{courseId}:
 *   post:
 *     tags:
 *       - Chapter
 *     summary: Create a chapter for a course
 *     parameters:
 *       - in: path
 *         name: courseId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               quarter:
 *                 type: string
 *     responses:
 *       201:
 *         description: Chapter created
 */
router.post("/create/:courseId", isUser, createChapter);

/**
 * @openapi
 * /api/chapter/{chapterId}:
 *   delete:
 *     tags:
 *       - Chapter
 *     summary: Delete a chapter
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Chapter deleted
 */
router.delete("/:chapterId", isUser, deleteChapter);

/**
 * @openapi
 * /api/chapter/{courseId}/{quarterId}:
 *   get:
 *     tags:
 *       - Chapter
 *     summary: Get chapters for a course and quarter
 *     parameters:
 *       - in: path
 *         name: courseId
 *         schema:
 *           type: string
 *         required: true
 *       - in: path
 *         name: quarterId
 *         schema:
 *           type: string
 *         required: true
   responses:
 *       200:
 *         description: Chapters list for quarter
 */
router.get("/:courseId/:quarterId", isUser, getChapterOfQuarter);

/**
 * @openapi
 * /api/chapter/chapter&lessons/{chapterId}:
 *   get:
 *     tags:
 *       - Chapter
 *     summary: Get a chapter with nested lessons (requires enrollment)
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Chapter with lessons
 */
router.get("/chapter/chapter&lessons/:chapterId", isUser, resolveEnrollmentFromChapter, isEnrolledMiddleware, getChapterwithLessons);

/**
 * @openapi
 * /api/chapter/edit/{chapterId}:
 *   put:
 *     tags:
 *       - Chapter
 *     summary: Edit chapter details
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Chapter updated
 */
router.put("/edit/:chapterId", isUser, editChapter);


export default router;
