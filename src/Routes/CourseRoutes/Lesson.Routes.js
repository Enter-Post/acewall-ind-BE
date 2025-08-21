import express from "express";
import {
  addMoreFiles,
  createLesson,
  deleteFile,
  deleteLesson,
  editLesson,
  getLessons,
} from "../../Contollers/CourseControllers/lesson.controller.js";
import { isUser } from "../../middlewares/Auth.Middleware.js";
import { upload } from "../../lib/multer.config.js";

const router = express.Router();

router.post("/create", isUser, upload.array("pdfFiles"), createLesson);
router.get(":chapterId", isUser, getLessons);
router.delete("/:lessonId", isUser, deleteLesson);
router.put("/edit/:lessonId", isUser, editLesson);
router.delete("/delete/:lessonId/:fileId", isUser, deleteFile);


router.put(
  `/addMoreFiles/:lessonId`,
  isUser,
  upload.array("pdfFiles"),
  addMoreFiles
);
export default router;
