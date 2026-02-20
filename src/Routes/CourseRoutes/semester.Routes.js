import express from "express";
import {
  createSemester,
  editSemester,
  getSemesterbyId,
  getSemesterOfCourse,
  getSemesterwithQuarter,
  selectingNewSemesterwithQuarter,
} from "../../Contollers/CourseControllers/semester.controller.js";
import { isUser } from "../../middlewares/Auth.Middleware.js";

const router = express.Router();

/**
 * @openapi
 * /api/semester/create/{courseId}:
 *   post:
 *     tags:
 *       - Semester
 *     summary: Create a semester for a course
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
 *             properties:
 *               title:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Semester created successfully
 */
router.post("/create/:courseId", isUser, createSemester);

/**
 * @openapi
 * /api/semester/getSemesterOfCourse/{courseId}:
 *   get:
 *     tags:
 *       - Semester
 *     summary: Get all semesters of a course
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of semesters
 */
router.get("/getSemesterOfCourse/:courseId", isUser, getSemesterOfCourse);

/**
 * @openapi
 * /api/semester/getSemesterwithQuarter:
 *   get:
 *     tags:
 *       - Semester
 *     summary: Get semester with quarters
 *     responses:
 *       200:
 *         description: Semester with quarters
 */
router.get("/getSemesterwithQuarter", isUser, getSemesterwithQuarter);

/**
 * @openapi
 * /api/semester/selectingNewSemesterwithQuarter/{courseId}:
 *   post:
 *     tags:
 *       - Semester
 *     summary: Select a new semester with quarters for a course
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
 *       200:
 *         description: Semester selected successfully
 */
router.post(
  "/selectingNewSemesterwithQuarter/:courseId",
  isUser,
  selectingNewSemesterwithQuarter
);

/**
 * @openapi
 * /api/semester/editSemester/{semesterId}:
 *   put:
 *     tags:
 *       - Semester
 *     summary: Edit a semester
 *     parameters:
 *       - in: path
 *         name: semesterId
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
 *               title:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Semester updated successfully
 */
router.put("/editSemester/:semesterId", isUser, editSemester);

/**
 * @openapi
 * /api/semester/getSemesterWithId/{semesterId}:
 *   get:
 *     tags:
 *       - Semester
 *     summary: Get semester by ID
 *     parameters:
 *       - in: path
 *         name: semesterId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Semester details
 */
router.get("/getSemesterWithId/:semesterId", isUser, getSemesterbyId);
export default router;
