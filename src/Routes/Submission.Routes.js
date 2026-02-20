import express from "express";
import { isUser } from "../middlewares/Auth.Middleware.js";
import {
  getSubmissionById,
  getSubmissionsforStudent,
  getSubmissionsofAssessment_forTeacher,
  submission,
  teacherGrading,
} from "../Contollers/Submission.controller.js";
import { upload } from "../lib/multer.config.js";
import { isEnrolledMiddleware } from "../middlewares/isEnrolled.middleware.js";
import { resolveEnrollmentFromAssessment, resolveEnrollmentFromSubmission } from "../middlewares/enrollment-resolvers.js";

const router = express.Router();

/**
 * @openapi
 * /api/submission/submission/{assessmentId}:
 *   post:
 *     tags:
 *       - Submission
 *     summary: Submit an assessment (requires enrollment)
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Submission created successfully
 */
router.post(
  "/submission/:assessmentId",
  isUser,
  resolveEnrollmentFromAssessment,
  isEnrolledMiddleware,
  upload.array("files"),
  submission
);

/**
 * @openapi
 * /api/submission/submission/{submissionId}:
 *   get:
 *     tags:
 *       - Submission
 *     summary: Get submission by ID (requires enrollment)
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Submission details
 */
router.get("/submission/:submissionId", isUser, resolveEnrollmentFromSubmission, isEnrolledMiddleware, getSubmissionById);

/**
 * @openapi
 * /api/submission/submission_for_Teacher/{assessmentId}:
 *   get:
 *     tags:
 *       - Submission
 *     summary: Get all submissions for an assessment (teacher view)
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of submissions
 */
router.get(
  "/submission_for_Teacher/:assessmentId",
  isUser,
  getSubmissionsofAssessment_forTeacher
);

/**
 * @openapi
 * /api/submission/submissions/{studentId}:
 *   get:
 *     tags:
 *       - Submission
 *     summary: Get all submissions for a student
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of submissions
 */
router.get("/submissions/:studentId", isUser, getSubmissionsforStudent);

/**
 * @openapi
 * /api/submission/teacherGrading/{submissionId}:
 *   put:
 *     tags:
 *       - Submission
 *     summary: Grade a student submission (teacher)
 *     parameters:
 *       - in: path
 *         name: submissionId
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
 *               feedback:
 *                 type: string
 *     responses:
 *       200:
 *         description: Submission graded successfully
 */
router.put("/teacherGrading/:submissionId", isUser, teacherGrading);

export default router;
