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

router.get("/my-courses", isUser, getMyEnrolledCourses);

router.post("/create/:courseId", isUser, enrollment);
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
router.delete("/unenroll/:courseId", isUser, unEnrollment);
router.post("/enrollmentforTeacher", isUser, enrollmentforTeacher);
export default router;
