import express from "express";
import {
  addMoreFiles,
  createLesson,
  deleteFile,
  deleteLesson,
  editLesson,
  getLessons,
} from "../../Contollers/CourseControllers/lesson.controller.js";
import { isUser } from "../../middlewares/Auth.Middleware.js";
import { upload } from "../../lib/multer.config.js";

const router = express.Router();

/**
 * @openapi
 * /api/lesson/create:
 *   post:
 *     tags:
 *       - Lesson
 *     summary: Create a lesson with optional PDF files
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               chapter:
 *                 type: string
 *               pdfFiles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Lesson created
 */
router.post("/create", isUser, upload.array("pdfFiles"), createLesson);

/**
 * @openapi
 * /api/lesson/{chapterId}:
 *   get:
 *     tags:
 *       - Lesson
 *     summary: Get lessons for a chapter
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Lessons list
 */
router.get(":chapterId", isUser, getLessons);

/**
 * @openapi
 * /api/lesson/{lessonId}:
 *   delete:
 *     tags:
 *       - Lesson
 *     summary: Delete a lesson
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Lesson deleted
 */
router.delete("/:lessonId", isUser, deleteLesson);

/**
 * @openapi
 * /api/lesson/edit/{lessonId}:
 *   put:
 *     tags:
 *       - Lesson
 *     summary: Edit lesson details
 *     parameters:
 *       - in: path
 *         name: lessonId
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
 *               youtubeLinks:
 *                 type: string
 *               otherLink:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lesson updated
 */
router.put("/edit/:lessonId", isUser, editLesson);

/**
 * @openapi
 * /api/lesson/delete/{lessonId}/{fileId}:
 *   delete:
 *     tags:
 *       - Lesson
 *     summary: Delete a file from a lesson
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         schema:
 *           type: string
 *         required: true
 *       - in: path
 *         name: fileId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: File deleted
 */
router.delete("/delete/:lessonId/:fileId", isUser, deleteFile);


/**
 * @openapi
 * /api/lesson/addMoreFiles/{lessonId}:
 *   put:
 *     tags:
 *       - Lesson
 *     summary: Add more PDF files to a lesson
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               pdfFiles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Files added
 */
router.put(
  `/addMoreFiles/:lessonId`,
  isUser,
  upload.array("pdfFiles"),
  addMoreFiles
);
export default router;
