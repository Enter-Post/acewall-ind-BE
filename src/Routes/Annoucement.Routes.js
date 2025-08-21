import express from "express";
import {
  createAnnouncement,
  getAnnouncementsForCourse,
  getAnnouncementsByTeacher,
  deleteAnnouncement,
  getAnnouncementsForStudent,
} from "../Contollers/announcement.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";

const router = express.Router();

router.get("/getbystudent/:studentId", isUser, getAnnouncementsForStudent);
router.get("/getannouncementforcourse", isUser, getAnnouncementsForCourse);
router.post("/createannouncement", createAnnouncement);
router.get("/getbyteacher/:teacherId", isUser, getAnnouncementsByTeacher);
router.delete("/:id", isUser, deleteAnnouncement);

export default router;