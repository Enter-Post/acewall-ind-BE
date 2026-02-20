import express from "express";
import {
  allStudent,
  allTeacher,
  getStudentById,
  getTeacherById,
} from "../Contollers/auth.controller.js";
import { getStudentEnrolledCourses } from "../Contollers/enrollment.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";
import { archivedSemester } from "../Contollers/CourseControllers/semester.controller.js";
import { archivedQuarter } from "../Contollers/CourseControllers/quarter.controller.js";
import { getCoursesforAdmin } from "../Contollers/CourseControllers/courses.controller.sch.js";
import { getCategoriesforAdmin } from "../Contollers/category.controller.js";
// import {
//   getAllWithdrawals,
//   updateStripeAccountId,
//   updateWithdrawalStatus,
// } from "../Contollers"

// import { checkRole, isAllowed } from "../Middlewares/admins.Middleware.js";
const router = express.Router();

/**
 * @openapi
 * /api/admin/allTeacher:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get all teachers
 *     responses:
 *       200:
 *         description: List of teachers
 */
router.get("/allTeacher", allTeacher);

/**
 * @openapi
 * /api/admin/allstudent:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get all students
 *     responses:
 *       200:
 *         description: List of students
 */
router.get("/allstudent", allStudent);

/**
 * @openapi
 * /api/admin/student-enrolled-courses/{id}:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get courses a student is enrolled in
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of enrolled courses
 */
router.get("/student-enrolled-courses/:id", getStudentEnrolledCourses);

/**
 * @openapi
 * /api/admin/getStudentById/{id}:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get student details by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student details
 */
router.get("/getStudentById/:id", isUser, getStudentById);

/**
 * @openapi
 * /api/admin/getTeacherById/{id}:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get teacher details by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Teacher details
 */
router.get("/getTeacherById/:id", isUser, getTeacherById);

/**
 * @openapi
 * /api/admin/updateSemArchiveStatus/{semesterId}:
 *   put:
 *     tags:
 *       - Admin
 *     summary: Update semester archive status
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
 *               isArchived:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Archive status updated
 */
router.put("/updateSemArchiveStatus/:semesterId", isUser, archivedSemester);

/**
 * @openapi
 * /api/admin/updateQtrArchiveStatus/{quarterId}:
 *   put:
 *     tags:
 *       - Admin
 *     summary: Update quarter archive status
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
 *               isArchived:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Archive status updated
 */
router.put("/updateQtrArchiveStatus/:quarterId", isUser, archivedQuarter);

/**
 * @openapi
 * /api/admin/adminDeshboard:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get admin dashboard data
 *     responses:
 *       200:
 *         description: Dashboard data with courses
 */
router.get("/adminDeshboard", isUser, getCoursesforAdmin);

/**
 * @openapi
 * /api/admin/getCategories:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get all categories for admin
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get("/getCategories", isUser, getCategoriesforAdmin)
// router.get("/all-Withdrawals", isUser, getAllWithdrawals);
// router.put("/:id/update-stripe-id", isUser, updateStripeAccountId);
// router.put("/:id/status", isUser, updateWithdrawalStatus);
export default router;
