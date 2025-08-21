import express from "express";
import { isUser } from "../middlewares/Auth.Middleware.js";
import {
  getSubmissionById,
  getSubmissionsforStudent,
  getSubmissionsofAssessment_forTeacher,
  submission,
  teacherGrading,
} from "../Contollers/Submission.controller.js";
import { upload } from "../lib/multer.config.js";

const router = express.Router();

router.post(
  "/submission/:assessmentId",
  isUser,
  upload.array("files"),
  submission
);
router.get("/submission/:submissionId", isUser, getSubmissionById);
router.get(
  "/submission_for_Teacher/:assessmentId",
  isUser,
  getSubmissionsofAssessment_forTeacher
);
router.get("/submissions/:studentId", isUser, getSubmissionsforStudent);
router.put("/teacherGrading/:submissionId", isUser, teacherGrading);

export default router;
