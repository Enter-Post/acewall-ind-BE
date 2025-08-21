import {
  allCommentsofTeacher,
  deleteComment,
  getCourseComments,
  sendComment,
} from "../Contollers/comment.controller.js";
import express from "express";
import { isUser } from "../middlewares/Auth.Middleware.js";

const router = express.Router();

router.get("/:id", isUser, getCourseComments);
router.post("/sendComment/:id", isUser, sendComment);

router.get('/teacher/allComment', isUser , allCommentsofTeacher);
router.delete('/:courseId/comment/:commentId', isUser, deleteComment);


export default router;
