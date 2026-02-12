import express from "express";
import {
  chapterDiscussions,
  courseDiscussions,
  createDiscussion,
  discussionforStudent,
  getDiscussionbyId,
  getDiscussionsOfTeacher,
  lessonDiscussions,
} from "../../Contollers/Discussion/discussion.controller.js";
import { upload } from "../../lib/multer.config.js";
import { isUser } from "../../middlewares/Auth.Middleware.js";
import { isEnrolledMiddleware } from "../../middlewares/isEnrolled.middleware.js";
import { resolveEnrollmentFromChapter, resolveEnrollmentFromDiscussion } from "../../middlewares/enrollment-resolvers.js";

const router = express.Router();

router.post("/create", isUser, upload.array("files"), createDiscussion);
router.get("/studentDiscussion", isUser, discussionforStudent);
router.get("/all", isUser, getDiscussionsOfTeacher);
router.get("/:id", isUser, resolveEnrollmentFromDiscussion, isEnrolledMiddleware, getDiscussionbyId);
router.get("/chapter/:chapterId", isUser, resolveEnrollmentFromChapter, isEnrolledMiddleware, chapterDiscussions);
router.get("/lesson/:lessonId", isUser, lessonDiscussions);
router.get("/course/:courseId", isUser, isEnrolledMiddleware, courseDiscussions);

export default router;