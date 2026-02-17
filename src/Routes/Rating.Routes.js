import express from "express";
import { isUser } from "../middlewares/Auth.Middleware.js";
import {
  createRating,
  getSingleCourseRating,
  isRatedbyUser,
} from "../Contollers/rating.controller.js";

const router = express.Router();

/**
 * @openapi
 * /api/rating/create/{id}:
 *   post:
 *     tags:
 *       - Rating
 *     summary: Create a rating for a course
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
 *               rating:
 *                 type: number
 *     responses:
 *       201:
 *         description: Rating created
 */
router.post("/create/:id", isUser, createRating);

/**
 * @openapi
 * /api/rating/course/{id}:
 *   get:
 *     tags:
 *       - Rating
 *     summary: Get aggregated rating for a course
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Course rating
 */
router.get("/course/:id", isUser, getSingleCourseRating);

/**
 * @openapi
 * /api/rating/isRated/{id}:
 *   get:
 *     tags:
 *       - Rating
 *     summary: Check if current user rated the course
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: isRated boolean
 */
router.get("/isRated/:id", isUser, isRatedbyUser);

export default router;
