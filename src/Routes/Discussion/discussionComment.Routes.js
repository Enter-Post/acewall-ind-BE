import express from "express";
import { isUser } from "../../middlewares/Auth.Middleware.js";
import {
  deleteComment,
  getDiscussionComments,
  gradeDiscussionofStd,
  isCommentedInDiscussion,
  sendDiscussionComment,
} from "../../Contollers/Discussion/discussionComment.controller.js";

const router = express.Router();

router.get("/get/:id", isUser, getDiscussionComments);
router.post("/sendComment/:id", isUser, sendDiscussionComment);
router.delete("/delete/:id", isUser, deleteComment);

////grades
router.put("/gradeDiscussionofStd/:discID/:discussionCommentId", isUser, gradeDiscussionofStd)
router.get("/isCommentedInDiscussion/:id", isUser, isCommentedInDiscussion)
export default router;
