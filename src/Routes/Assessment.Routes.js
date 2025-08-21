import express from "express";
import {
  allAssessmentByTeacher,
  createAssessment,
  deleteAssessment,
  deleteFile,
  editAssessmentInfo,
  getAllassessmentforStudent,
  getAssesmentbyID,
  uploadFiles,
} from "../Contollers/Assessment.controller.js";
import { upload } from "../lib/multer.config.js";
import { isUser } from "../middlewares/Auth.Middleware.js";
import { getResultsMiddleware } from "../middlewares/isSubmitted.middleware.js";
import { createAssessment_updated } from "../Contollers/UPDATED_API_CONTROLLER/assessment.controller.web.js";

const router = express.Router();

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
