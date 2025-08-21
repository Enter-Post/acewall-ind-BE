import express from "express";
import {
  getReplyCount,
  getreplyofComment,
  sendReplyofComment,
} from "../../Contollers/Discussion/replyDiscussion.controller.js";
import { isUser } from "../../middlewares/Auth.Middleware.js";

const router = express.Router();

router.post("/send/:commentId", isUser, sendReplyofComment);
router.get("/get/:commentId", isUser, getreplyofComment);
router.get("/replycount/:commentId", getReplyCount);

export default router;
