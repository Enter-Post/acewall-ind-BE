import express from "express";
import { isUser } from "../../middlewares/Auth.Middleware.js";
import { upload } from "../../lib/multer.config.js";
import {
  createCourseSch,
  deleteCourseSch,
  getAllCoursesSch,
  getCourseDetails,
  getCoursesbySubcategorySch,
  getCoursesByTeacherSch,
  getCoursesforadminofteacher,
  getunPurchasedCourseByIdSch,
  getallcoursesforteacher,
  getDueDate,
  thumnailChange,
  getCourseBasics,
  editCourseInfo,
  verifyCourse,
  teacherCourseForDesboard,
  archivedCourse,
  getVerifiedCourses,
  getCoursesforAdmin,
  rejectCourse,
  applyCourseReverification,
  getRequiredDocumentforEdit,
  editCoureDocument,
  getunPurchasedCourseByIdStdPrew,
  courseDetailsStdPre,
  toggleGradingSystem,
  getCourseEnrollmentStats,
} from "../../Contollers/CourseControllers/courses.controller.sch.js";

const router = express.Router();

router.post(
  "/create",
  isUser,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "resume", maxCount: 1 },
    { name: "certificate", maxCount: 1 },
    { name: "governmentId", maxCount: 1 },
    { name: "transcript", maxCount: 1 },
  ]),
  createCourseSch
);
router.get("/getVerifiedCourses", isUser, getVerifiedCourses);
router.get("/all", getAllCoursesSch);
router.get("/getindividualcourse", isUser, getCoursesByTeacherSch);
router.get("/getCoursesforadminofteacher", isUser, getCoursesforadminofteacher);
router.get("/getallCoursesforTeacher", isUser, getallcoursesforteacher);
router.get("/getTeacherCoursesForDesboard", isUser, teacherCourseForDesboard)
router.get("/:subCategoryId", getCoursesbySubcategorySch);
router.get("/details/:courseId", isUser, getCourseDetails);
router.get("/get/:id", getunPurchasedCourseByIdSch);
router.get("/getstdprew/:id", isUser, getunPurchasedCourseByIdStdPrew);
router.get("/courseDetailsStdPre/:courseId", isUser, courseDetailsStdPre);
router.delete("/delete/:courseId", isUser, deleteCourseSch);
router.get("/getcourseDueDate/:courseId", isUser, getDueDate);
router.put(
  "/thumbnail/:courseId",
  isUser,
  upload.single("thumbnail"),
  thumnailChange
);
router.get("/getCourseBasics/:courseId", isUser, getCourseBasics);
router.put("/editCourseBasics/:courseId", isUser, editCourseInfo);
router.put("/verifyCourse/:courseId", isUser, verifyCourse);
router.put("/reapply/:courseId", isUser, applyCourseReverification);
router.put("/rejectCourse/:courseId", isUser, rejectCourse);
router.put("/archive/:courseId", isUser, archivedCourse);
router.get("/getCourseDocuments/:courseId", isUser, getRequiredDocumentforEdit);
router.put("/editCourseDocuments/:courseId", isUser, upload.fields([
  { name: "resume", maxCount: 1 },
  { name: "certificate", maxCount: 1 },
  { name: "governmentId", maxCount: 1 },
  { name: "transcript", maxCount: 1 }
]), editCoureDocument);
router.put("/course/:courseId/toggle-grading", toggleGradingSystem);
router.get('/stats/:courseId', getCourseEnrollmentStats);

export default router;