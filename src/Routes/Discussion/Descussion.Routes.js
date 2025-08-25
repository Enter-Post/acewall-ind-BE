import express from "express";
import {
  chapterDiscussions,
  createDiscussion,
  discussionforStudent,
  getDiscussionbyId,
  getDiscussionsOfTeacher,
  lessonDiscussions,
} from "../../Contollers/Discussion/discussion.controller.js";
import { upload } from "../../lib/multer.config.js";
import { isUser } from "../../middlewares/Auth.Middleware.js";

const router = express.Router();

router.post("/create", isUser, upload.array("files"), createDiscussion);
router.get("/studentDiscussion", isUser, discussionforStudent);
router.get("/all", isUser, getDiscussionsOfTeacher);
router.get("/:id", isUser, getDiscussionbyId);
router.get("/chapter/:chapterId", isUser, chapterDiscussions);
router.get("/lesson/:lessonId", isUser, lessonDiscussions);

export default router;
