import express from "express";
import { isUser } from "../middlewares/Auth.Middleware.js";
import { getGPAScale, setGPAscale } from "../Contollers/GPA.controller.js";

const router = express.Router();

/**
 * @openapi
 * /api/gpa/setGPAscale/{courseId}:
 *   post:
 *     tags:
 *       - GPA
 *     summary: Set GPA scale for a course
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
 *         description: GPA scale set successfully
 */
router.post("/setGPAscale/:courseId", isUser, setGPAscale);

/**
 * @openapi
 * /api/gpa/get/{courseId}:
 *   get:
 *     tags:
 *       - GPA
 *     summary: Get GPA scale for a course
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: GPA scale
 */
router.get("/get/:courseId", isUser, getGPAScale);


export default router;