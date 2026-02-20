import express from "express";
import {
  chapterDetails,
  chapterDetailsStdPre,
  enrollmentforTeacher,
  getMyEnrolledCourses,
  isEnrolled,
  studenCourses,
  studentCourseDetails,
  studentsEnrolledinCourse,
  unEnrollment,
  enrollment,
} from "../Contollers/enrollment.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";
import { isEnrolledMiddleware } from "../middlewares/isEnrolled.middleware.js";
import { resolveEnrollmentFromChapter } from "../middlewares/enrollment-resolvers.js";

const router = express.Router();

/**
 * @openapi
 * /api/enrollment/my-courses:
 *   get:
 *     tags:
 *       - Enrollment
 *     summary: Get current user's enrolled courses
 *     responses:
 *       200:
 *         description: Enrolled courses list
 */
router.get("/my-courses", isUser, getMyEnrolledCourses);

/**
 * @openapi
 * /api/enrollment/create/{courseId}:
 *   post:
 *     tags:
 *       - Enrollment
 *     summary: Enroll in a course
 *     parameters:
 *       - in: path
 *         name: courseId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       201:
 *         description: Enrollment created
 */
router.post("/create/:courseId", isUser, enrollment);

/**
 * @openapi
 * /api/enrollment/isEnrolled/{courseId}:
 *   get:
 *     tags:
 *       - Enrollment
 *     summary: Check if current user is enrolled in a course
 *     parameters:
 *       - in: path
 *         name: courseId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Enrollment status
 */
router.get("/isEnrolled/:courseId", isUser, isEnrolled);

router.get("/studentCourses", isUser, studenCourses);
router.get("/studentCourseDetails/:enrollmentId", isUser, studentCourseDetails);
router.get("/getChapterstdpre/:chapterId", isUser, chapterDetailsStdPre);


router.get(
  "/studentEnrolledinCourse/:courseId",
  isUser,
  studentsEnrolledinCourse
);
// routes/adminRoutes.js

router.get("/getChapter/:chapterId", isUser, resolveEnrollmentFromChapter, isEnrolledMiddleware, chapterDetails);

/**
 * @openapi
 * /api/enrollment/unenroll/{courseId}:
 *   delete:
 *     tags:
 *       - Enrollment
 *     summary: Unenroll from a course
 *     parameters:
 *       - in: path
 *         name: courseId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Unenrolled successfully
 */
router.delete("/unenroll/:courseId", isUser, unEnrollment);

router.post("/enrollmentforTeacher", isUser, enrollmentforTeacher);
export default router;
