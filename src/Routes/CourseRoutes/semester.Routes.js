import express from "express";
import {
  createSemester,
  editSemester,
  getSemesterbyId,
  getSemesterOfCourse,
  getSemesterwithQuarter,
  selectingNewSemesterwithQuarter,
} from "../../Contollers/CourseControllers/semester.controller.js";
import { isUser } from "../../middlewares/Auth.Middleware.js";

const router = express.Router();

router.post("/create/:courseId", isUser, createSemester);
router.get("/getSemesterOfCourse/:courseId", isUser, getSemesterOfCourse);
router.get("/getSemesterwithQuarter", isUser, getSemesterwithQuarter);
router.post(
  "/selectingNewSemesterwithQuarter/:courseId",
  isUser,
  selectingNewSemesterwithQuarter
);

router.put("/editSemester/:semesterId", isUser, editSemester);
router.get("/getSemesterWithId/:semesterId", isUser, getSemesterbyId);
export default router;
