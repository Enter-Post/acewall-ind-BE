import express from "express";
import {
  allAssessmentByTeacher,
  createAssessment,
  deleteAssessment,
  deleteFile,
  editAssessmentInfo,
  findReminderTime,
  getAllassessmentforStudent,
  getAssesmentbyID,
  getAssessmentStats,
  sendAssessmentReminder,
  setReminderTime,
  uploadFiles,
} from "../Contollers/Assessment.controller.js";
import { upload } from "../lib/multer.config.js";
import { isUser } from "../middlewares/Auth.Middleware.js";
import { getResultsMiddleware } from "../middlewares/isSubmitted.middleware.js";
import { createAssessment_updated } from "../Contollers/UPDATED_API_CONTROLLER/assessment.controller.web.js";

const router = express.Router();

router.post(
  "/:assessmentId/send-reminder",
  isUser, // ensures the sender is authenticated
  sendAssessmentReminder
);

router.get("/stats/:assessmentId", isUser, getAssessmentStats);
router.get("/findReminderTime/:assessmentId", isUser, findReminderTime)
router.put("/setReminder/:assessmentId", isUser, setReminderTime)
router.post("/create", upload.array("files"), isUser, createAssessment);
router.get("/allAssessmentByTeacher", isUser, allAssessmentByTeacher);
router.get("/getAllassessmentforStudent", isUser, getAllassessmentforStudent);
router.delete("/delete/:id", deleteAssessment);
router.put(
  "/uploadFiles/:assessmentId/:fileId",
  upload.array("files"),
  uploadFiles
);
router.delete("/deleteFile/:assessmentId/:fileId", deleteFile);
router.get("/:assessmentId", isUser, getResultsMiddleware, getAssesmentbyID);

router.put("/editAssessment/:assessmentId", isUser, editAssessmentInfo);


// prev used api -- router.post("/create", upload.array("files"), isUser, createAssessment);
router.post("/createAssessment/updated", upload.any(), isUser, createAssessment_updated);


export default router;
