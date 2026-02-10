import express from "express";
import {
  createAnnouncement,
  getAnnouncementsForCourse,
  getAnnouncementsByTeacher,
  deleteAnnouncement,
  getAnnouncementsForStudent,
} from "../Contollers/announcement.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";
import { upload } from "../lib/multer.config.js";
import { isEnrolledMiddleware } from "../middlewares/isEnrolled.middleware.js";
import { resolveEnrollmentFromQuery } from "../middlewares/enrollment-resolvers.js";

const router = express.Router();

router.get("/getbystudent/:studentId", isUser, getAnnouncementsForStudent);
router.get("/getannouncementforcourse", isUser, resolveEnrollmentFromQuery, isEnrolledMiddleware, getAnnouncementsForCourse);
router.post("/createannouncement", isUser, upload.any(), createAnnouncement);
router.get("/getbyteacher/:teacherId", isUser, getAnnouncementsByTeacher);
router.delete("/:id", isUser, deleteAnnouncement);

export default router;
