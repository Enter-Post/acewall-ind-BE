import express from "express";
import { isUser } from "../../middlewares/Auth.Middleware.js";
import {
  deleteComment,
  getDiscussionComments,
  gradeDiscussionofStd,
  isCommentedInDiscussion,
  sendDiscussionComment,
} from "../../Contollers/Discussion/discussionComment.controller.js";
import { isEnrolledMiddleware } from "../../middlewares/isEnrolled.middleware.js";
import { resolveEnrollmentFromDiscussion } from "../../middlewares/enrollment-resolvers.js";

const router = express.Router();

router.get("/get/:id", isUser, resolveEnrollmentFromDiscussion, isEnrolledMiddleware, getDiscussionComments);
router.post("/sendComment/:id", isUser, resolveEnrollmentFromDiscussion, isEnrolledMiddleware, sendDiscussionComment);
router.delete("/delete/:id", isUser, deleteComment);

////grades
router.put("/gradeDiscussionofStd/:discID/:discussionCommentId", isUser, gradeDiscussionofStd)
router.get("/isCommentedInDiscussion/:id", isUser, isCommentedInDiscussion)
export default router;