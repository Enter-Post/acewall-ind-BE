import express from "express";
import {
  chapterDetails,
  chapterDetailsStdPre,
  enrollment,
  enrollmentforTeacher,
  isEnrolled,
  studenCourses,
  studentCourseDetails,
  studentsEnrolledinCourse,
  unEnrollment,
} from "../Contollers/enrollment.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";
import { isEnrolledMiddleware } from "../middlewares/isEnrolled.middleware.js";

const router = express.Router();

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

router.get("/getChapter/:chapterId", isUser, chapterDetails);
router.delete("/unenroll/:courseId", isUser, unEnrollment);
router.post("/enrollmentforTeacher", isUser, enrollmentforTeacher);
export default router;
