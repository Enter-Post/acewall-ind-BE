import express from "express";
import {
  ChapterofCourse,
  createChapter,
  deleteChapter,
  editChapter,
  getChapterofCourse,
  getChapterOfQuarter,
  getChapterwithLessons,
} from "../../Contollers/CourseControllers/chapter.controller.js";
import { isUser } from "../../middlewares/Auth.Middleware.js";
import { isEnrolledMiddleware } from "../../middlewares/isEnrolled.middleware.js";
import { resolveEnrollmentFromChapter } from "../../middlewares/enrollment-resolvers.js";

const router = express.Router();

router.get("/chapterofCourse/:courseId", isUser, isEnrolledMiddleware, ChapterofCourse);
router.post("/create/:courseId", isUser, createChapter);
// router.get("/:quarterId", isUser, getChapterofCourse);
router.delete("/:chapterId", isUser, deleteChapter);
router.get("/:courseId/:quarterId", isUser, getChapterOfQuarter);
router.get("/chapter/chapter&lessons/:chapterId", isUser, resolveEnrollmentFromChapter, isEnrolledMiddleware, getChapterwithLessons);
router.put("/edit/:chapterId", isUser, editChapter);


export default router;
