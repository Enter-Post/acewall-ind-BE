import express from "express";
import {
  createQuarter,
  editQuarter,
  getDatesofQuarter,
  getQuarter,
  getQuartersofSemester,
  getSemesterQuarter,
} from "../../Contollers/CourseControllers/quarter.controller.js";

const router = express.Router();

/**
 * @openapi
 * /api/quarter/create:
 *   post:
 *     tags:
 *       - Quarter
 *     summary: Create a quarter
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               semesterId:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Quarter created successfully
 */
router.post("/create", createQuarter);

/**
 * @openapi
 * /api/quarter/get:
 *   get:
 *     tags:
 *       - Quarter
 *     summary: Get all quarters
 *     responses:
 *       200:
 *         description: List of quarters
 */
router.get("/get", getQuarter);

/**
 * @openapi
 * /api/quarter/getquarters/{semesterId}:
 *   post:
 *     tags:
 *       - Quarter
 *     summary: Get quarters of a semester
 *     parameters:
 *       - in: path
 *         name: semesterId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of quarters
 */
router.post("/getquarters/:semesterId", getQuartersofSemester);

/**
 * @openapi
 * /api/quarter/get/{semesterId}:
 *   get:
 *     tags:
 *       - Quarter
 *     summary: Get quarters for a semester
 *     parameters:
 *       - in: path
 *         name: semesterId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quarters with semester info
 */
router.get("/get/:semesterId", getSemesterQuarter);

/**
 * @openapi
 * /api/quarter/getDatesofQuarter/{quarterId}:
 *   get:
 *     tags:
 *       - Quarter
 *     summary: Get dates of a quarter
 *     parameters:
 *       - in: path
 *         name: quarterId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quarter dates
 */
router.get(`/getDatesofQuarter/:quarterId`, getDatesofQuarter);

/**
 * @openapi
 * /api/quarter/editQuarter/{quarterId}:
 *   put:
 *     tags:
 *       - Quarter
 *     summary: Edit a quarter
 *     parameters:
 *       - in: path
 *         name: quarterId
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
 *         description: Quarter updated successfully
 */
router.put("/editQuarter/:quarterId", editQuarter);

export default router;
