import express from "express";
import { getPurchasedCourses, purchaseCourse } from "../Contollers/purchase.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";

const router = express.Router();

/**
 * @openapi
 * /api/purchase/courses/{id}:
 *   post:
 *     tags:
 *       - Purchase
 *     summary: Purchase a course
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Purchase successful
 */
router.post("/courses/:id", isUser, purchaseCourse);

/**
 * @openapi
 * /api/purchase/courses:
 *   get:
 *     tags:
 *       - Purchase
 *     summary: Get purchased courses for current user
 *     responses:
 *       200:
 *         description: List of purchased courses
 */
router.get("/courses", isUser, getPurchasedCourses);

export default router;