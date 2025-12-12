import express from "express";
import { isUser } from "../middlewares/Auth.Middleware.js";
import {
  getGradingScale,
  getStudentGradebook,
  getStudentGradeReport,
  setGradingScale,
  getGradebookForCourse
} from "../Contollers/grade.controller.js";
import { getGradebooksOfCourseFormatted, getGradebooksOfStudentCourseFormatted, getStudentGradebooksFormatted } from "../Contollers/gradebookUpdated.controller.js";

const router = express.Router();

router.get("/getGradebook/:studentId/:courseId", isUser, getStudentGradebook);
router.get("/getOverallGradeReport", isUser, getStudentGradeReport);
router.post("/gradingScale/:courseId", isUser, setGradingScale);
router.get("/getGradingScale/:courseId", isUser, getGradingScale);
router.get("/course/:courseId", getGradebookForCourse);

//////updated APIS
router.get("/getStudentGradebooksFormatted", isUser, getStudentGradebooksFormatted)
router.get("/getGradebooksOfCourseFormatted/:courseId", isUser, getGradebooksOfCourseFormatted)
router.get("/getGradebooksOfStudentCourseFormatted/:studentId/:courseId", isUser, getGradebooksOfStudentCourseFormatted)

export default router;
