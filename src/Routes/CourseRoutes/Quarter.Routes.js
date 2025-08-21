import express from "express";
import {
  createQuarter,
  editQuarter,
  getDatesofQuarter,
  getQuarter,
  getQuartersofSemester,
  getSemesterQuarter,
} from "../../Contollers/CourseControllers/quarter.controller.js";

const router = express.Router();

router.post("/create", createQuarter);
router.get("/get", getQuarter);
router.post("/getquarters/:semesterId", getQuartersofSemester);
router.get("/get/:semesterId", getSemesterQuarter);
router.get(`/getDatesofQuarter/:quarterId`, getDatesofQuarter);

router.put("/editQuarter/:quarterId", editQuarter);

export default router;
