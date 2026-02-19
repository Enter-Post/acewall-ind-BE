import express from 'express';
import { getStandardGradingScale, SetStandardGradingScale } from '../Contollers/StandardGrading.controller.js';
import { isUser } from "../middlewares/Auth.Middleware.js";

const router = express.Router();

/**
 * @openapi
 * /api/standard-grading/get/{courseId}:
 *   get:
 *     tags:
 *       - Standard Grading
 *     summary: Get standard grading scale for a course
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Standard grading scale
 */
router.get("/get/:courseId", isUser, getStandardGradingScale);

/**
 * @openapi
 * /api/standard-grading/set/{courseId}:
 *   post:
 *     tags:
 *       - Standard Grading
 *     summary: Set standard grading scale for a course
 *     parameters:
 *       - in: path
 *         name: courseId
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
 *       201:
 *         description: Standard grading scale set successfully
 */
router.post("/set/:courseId", isUser, SetStandardGradingScale);

export default router;