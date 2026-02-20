import express from "express";
import { isUser } from "../middlewares/Auth.Middleware.js";
import {
  getGradingScale,
  getStudentGradebook,
  getStudentGradeReport,
  setGradingScale,
  getGradebookForCourse
} from "../Contollers/grade.controller.js";
import { getGradebooksOfCourseFormatted, getGradebooksOfStudentCourseFormatted, getStudentCourseAnalytics, getStudentGradebooksFormatted, getTeacherStudentAnalytics } from "../Contollers/gradebookUpdated.controller.js";

const router = express.Router();

/**
 * @openapi
 * /api/gradebook/getGradebook/{studentId}/{courseId}:
 *   get:
 *     tags:
 *       - Gradebook
 *     summary: Get student gradebook for a course
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student gradebook
 */
router.get("/getGradebook/:studentId/:courseId", isUser, getStudentGradebook);

/**
 * @openapi
 * /api/gradebook/getOverallGradeReport:
 *   get:
 *     tags:
 *       - Gradebook
 *     summary: Get overall grade report for student
 *     responses:
 *       200:
 *         description: Overall grade report
 */
router.get("/getOverallGradeReport", isUser, getStudentGradeReport);

/**
 * @openapi
 * /api/gradebook/gradingScale/{courseId}:
 *   post:
 *     tags:
 *       - Gradebook
 *     summary: Set grading scale for a course
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
 *         description: Grading scale set successfully
 */
router.post("/gradingScale/:courseId", isUser, setGradingScale);

/**
 * @openapi
 * /api/gradebook/getGradingScale/{courseId}:
 *   get:
 *     tags:
 *       - Gradebook
 *     summary: Get grading scale for a course
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Grading scale
 */
router.get("/getGradingScale/:courseId", isUser, getGradingScale);

/**
 * @openapi
 * /api/gradebook/course/{courseId}:
 *   get:
 *     tags:
 *       - Gradebook
 *     summary: Get gradebook for a course
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course gradebook
 */
router.get("/course/:courseId", getGradebookForCourse);

//////updated APIS
/**
 * @openapi
 * /api/gradebook/getStudentGradebooksFormatted:
 *   get:
 *     tags:
 *       - Gradebook
 *     summary: Get student gradebooks in formatted view
 *     responses:
 *       200:
 *         description: Formatted gradebooks
 */
router.get("/getStudentGradebooksFormatted", isUser, getStudentGradebooksFormatted)

/**
 * @openapi
 * /api/gradebook/course-analytics/{courseId}:
 *   get:
 *     tags:
 *       - Gradebook
 *     summary: Get course analytics for student
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course analytics
 */
router.get("/course-analytics/:courseId", isUser, getStudentCourseAnalytics);

/**
 * @openapi
 * /api/gradebook/getGradebooksOfCourseFormatted/{courseId}:
 *   get:
 *     tags:
 *       - Gradebook
 *     summary: Get formatted gradebooks for a course
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Formatted course gradebooks
 */
router.get("/getGradebooksOfCourseFormatted/:courseId", isUser, getGradebooksOfCourseFormatted)

/**
 * @openapi
 * /api/gradebook/getGradebooksOfStudentCourseFormatted/{studentId}/{courseId}:
 *   get:
 *     tags:
 *       - Gradebook
 *     summary: Get formatted gradebook for a student in a course
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Formatted student-course gradebook
 */
router.get("/getGradebooksOfStudentCourseFormatted/:studentId/:courseId", isUser, getGradebooksOfStudentCourseFormatted)

/**
 * @openapi
 * /api/gradebook/getTeacherStudentAnalytics/{courseId}/{studentId}:
 *   get:
 *     tags:
 *       - Gradebook
 *     summary: Get teacher view of student analytics
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student analytics
 */
router.get("/getTeacherStudentAnalytics/:courseId/:studentId", isUser, getTeacherStudentAnalytics);
export default router;
