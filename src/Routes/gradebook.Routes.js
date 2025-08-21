import express from "express";
import { isUser } from "../middlewares/Auth.Middleware.js";
import {
  getGradingScale,
  getStudentGradebook,
  getStudentGradeReport,
  setGradingScale,
  getGradebookForCourse
} from "../Contollers/grade.controller.js";

const router = express.Router();

router.get("/getGradebook/:studentId/:courseId", isUser, getStudentGradebook);
router.get("/getOverallGradeReport", isUser, getStudentGradeReport);
router.post("/gradingScale/:courseId", isUser, setGradingScale);
router.get("/getGradingScale/:courseId", isUser, getGradingScale);
router.get("/course/:courseId", getGradebookForCourse);

export default router;
