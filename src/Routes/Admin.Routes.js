import express from "express";
import {
  allStudent,
  allTeacher,
  getStudentById,
  getTeacherById,
} from "../Contollers/auth.controller.js";
import { getStudentEnrolledCourses } from "../Contollers/enrollment.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";
import { archivedSemester } from "../Contollers/CourseControllers/semester.controller.js";
import { archivedQuarter } from "../Contollers/CourseControllers/quarter.controller.js";
import { getCoursesforAdmin } from "../Contollers/CourseControllers/courses.controller.sch.js";
import { getCategoriesforAdmin } from "../Contollers/category.controller.js";
// import {
//   getAllWithdrawals,
//   updateStripeAccountId,
//   updateWithdrawalStatus,
// } from "../Contollers"

// import { checkRole, isAllowed } from "../Middlewares/admins.Middleware.js";
const router = express.Router();

router.get("/allTeacher", allTeacher);
router.get("/allstudent", allStudent);
router.get("/student-enrolled-courses/:id", getStudentEnrolledCourses);
router.get("/getStudentById/:id", isUser, getStudentById);
router.get("/getTeacherById/:id", isUser, getTeacherById);
router.put("/updateSemArchiveStatus/:semesterId", isUser, archivedSemester);
router.put("/updateQtrArchiveStatus/:quarterId", isUser, archivedQuarter);
router.get("/adminDeshboard", isUser, getCoursesforAdmin);
router.get("/getCategories", isUser, getCategoriesforAdmin)
// router.get("/all-Withdrawals", isUser, getAllWithdrawals);
// router.put("/:id/update-stripe-id", isUser, updateStripeAccountId);
// router.put("/:id/status", isUser, updateWithdrawalStatus);
export default router;
