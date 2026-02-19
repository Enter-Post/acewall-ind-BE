import express from "express";
import {
  allAssessmentByTeacher,
  createAssessment,
  deleteAssessment,
  deleteFile,
  editAssessmentInfo,
  findReminderTime,
  getAllassessmentforStudent,
  getAssesmentbyID,
  getAssessmentStats,
  sendAssessmentReminder,
  setReminderTime,
  uploadFiles,
} from "../Contollers/Assessment.controller.js";
import { upload } from "../lib/multer.config.js";
import { isUser } from "../middlewares/Auth.Middleware.js";
import { getResultsMiddleware } from "../middlewares/isSubmitted.middleware.js";
import { createAssessment_updated } from "../Contollers/UPDATED_API_CONTROLLER/assessment.controller.web.js";
import { isEnrolledMiddleware } from "../middlewares/isEnrolled.middleware.js";
import { resolveEnrollmentFromAssessment } from "../middlewares/enrollment-resolvers.js";

const router = express.Router();

/**
 * @openapi
 * /api/assessment/{assessmentId}/send-reminder:
 *   post:
 *     tags:
 *       - Assessment
 *     summary: Send reminder for an assessment
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Reminder sent successfully
 */
router.post(
  "/:assessmentId/send-reminder",
  isUser, // ensures the sender is authenticated
  sendAssessmentReminder
);

/**
 * @openapi
 * /api/assessment/stats/{assessmentId}:
 *   get:
 *     tags:
 *       - Assessment
 *     summary: Get assessment statistics
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assessment statistics
 */
router.get("/stats/:assessmentId", isUser, getAssessmentStats);

/**
 * @openapi
 * /api/assessment/findReminderTime/{assessmentId}:
 *   get:
 *     tags:
 *       - Assessment
 *     summary: Get reminder time for assessment
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reminder time details
 */
router.get("/findReminderTime/:assessmentId", isUser, findReminderTime)

/**
 * @openapi
 * /api/assessment/setReminder/{assessmentId}:
 *   put:
 *     tags:
 *       - Assessment
 *     summary: Set reminder time for assessment
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Reminder set successfully
 */
router.put("/setReminder/:assessmentId", isUser, setReminderTime)

/**
 * @openapi
 * /api/assessment/create:
 *   post:
 *     tags:
 *       - Assessment
 *     summary: Create a new assessment
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
 *               courseId:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Assessment created successfully
 */
router.post("/create", upload.array("files"), isUser, createAssessment);

/**
 * @openapi
 * /api/assessment/allAssessmentByTeacher:
 *   get:
 *     tags:
 *       - Assessment
 *     summary: Get all assessments created by the teacher
 *     responses:
 *       200:
 *         description: List of assessments
 */
router.get("/allAssessmentByTeacher", isUser, allAssessmentByTeacher);

/**
 * @openapi
 * /api/assessment/getAllassessmentforStudent:
 *   get:
 *     tags:
 *       - Assessment
 *     summary: Get all assessments for the student
 *     responses:
 *       200:
 *         description: List of assessments
 */
router.get("/getAllassessmentforStudent", isUser, getAllassessmentforStudent);

/**
 * @openapi
 * /api/assessment/delete/{id}:
 *   delete:
 *     tags:
 *       - Assessment
 *     summary: Delete an assessment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assessment deleted successfully
 */
router.delete("/delete/:id", deleteAssessment);

/**
 * @openapi
 * /api/assessment/uploadFiles/{assessmentId}/{fileId}:
 *   put:
 *     tags:
 *       - Assessment
 *     summary: Upload files to an assessment
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: fileId
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
 *       200:
 *         description: Files uploaded successfully
 */
router.put(
  "/uploadFiles/:assessmentId/:fileId",
  upload.array("files"),
  uploadFiles
);

/**
 * @openapi
 * /api/assessment/deleteFile/{assessmentId}/{fileId}:
 *   delete:
 *     tags:
 *       - Assessment
 *     summary: Delete a file from assessment
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File deleted successfully
 */
router.delete("/deleteFile/:assessmentId/:fileId", deleteFile);

/**
 * @openapi
 * /api/assessment/{assessmentId}:
 *   get:
 *     tags:
 *       - Assessment
 *     summary: Get assessment by ID (requires enrollment)
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assessment details
 */
router.get("/:assessmentId", isUser, resolveEnrollmentFromAssessment, isEnrolledMiddleware, getResultsMiddleware, getAssesmentbyID);

/**
 * @openapi
 * /api/assessment/editAssessment/{assessmentId}:
 *   put:
 *     tags:
 *       - Assessment
 *     summary: Edit assessment information
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Assessment updated successfully
 */
router.put("/editAssessment/:assessmentId", isUser, editAssessmentInfo);


// prev used api -- router.post("/create", upload.array("files"), isUser, createAssessment);
/**
 * @openapi
 * /api/assessment/createAssessment/updated:
 *   post:
 *     tags:
 *       - Assessment
 *     summary: Create assessment (updated version)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Assessment created successfully
 */
router.post("/createAssessment/updated", upload.any(), isUser, createAssessment_updated);


export default router;
