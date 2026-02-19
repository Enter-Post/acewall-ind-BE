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
  getUserCoursesforFilter,
  getFullCourseData,
  importCourseFromJSON,
  getCoursesWithMeetings,
  toggleReferral,
} from "../../Contollers/CourseControllers/courses.controller.sch.js";

const router = express.Router();
router.get("/with-meetings", isUser, getCoursesWithMeetings);

router.get("/:courseId/export", getFullCourseData);
/**
 * @openapi
 * /api/course/{courseId}/export:
 *   get:
 *     tags:
 *       - Course
 *     summary: Export full course data (nested)
 *     parameters:
 *       - in: path
 *         name: courseId
 *         schema:
 *           type: string
 *         required: true
 *         description: Course ID to export
 *     responses:
 *       200:
 *         description: Full course export
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 course:
 *                   type: object
 *       404:
 *         description: Course not found
 */
router.post('/import-full-course', isUser, importCourseFromJSON);
/**
 * @openapi
 * /api/course/import-full-course:
 *   post:
 *     tags:
 *       - Course
 *     summary: Import a full course from nested JSON
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Full course JSON (semesters, curriculum, assessments, discussions)
 *     responses:
 *       201:
 *         description: Course imported
 */

router.get("/getUserCoursesforFilter", isUser, getUserCoursesforFilter);

/**
 * @openapi
 * /api/course/create:
 *   post:
 *     tags:
 *       - Course
 *     summary: Create a new course (multipart/form-data)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Course created
 */
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
/**
 * @openapi
 * /api/course/thumbnail/{courseId}:
 *   put:
 *     tags:
 *       - Course
 *     summary: Upload/replace course thumbnail
 *     parameters:
 *       - in: path
 *         name: courseId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Thumbnail updated
 */
router.get("/getCourseBasics/:courseId", isUser, getCourseBasics);
router.put("/editCourseBasics/:courseId", isUser, editCourseInfo);
/**
 * @openapi
 * /api/course/editCourseBasics/{courseId}:
 *   put:
 *     tags:
 *       - Course
 *     summary: Edit basic course information
 *     parameters:
 *       - in: path
 *         name: courseId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               courseTitle:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *               subcategory:
 *                 type: string
 *               language:
 *                 type: string
 *               teachingPoints:
 *                 type: string
 *                 description: JSON-stringified array
 *               requirements:
 *                 type: string
 *                 description: JSON-stringified array
 *               courseDescription:
 *                 type: string
 *     responses:
 *       200:
 *         description: Course updated
 */
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
/**
 * @openapi
 * /api/course/editCourseDocuments/{courseId}:
 *   put:
 *     tags:
 *       - Course
 *     summary: Upload or update course verification documents
 *     parameters:
 *       - in: path
 *         name: courseId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               resume:
 *                 type: string
 *                 format: binary
 *               certificate:
 *                 type: string
 *                 format: binary
 *               governmentId:
 *                 type: string
 *                 format: binary
 *               transcript:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Course documents updated
 */
router.put("/course/:courseId/toggle-grading", toggleGradingSystem);
router.put("/course/:courseId/toggle-referral", isUser, toggleReferral);
router.get('/stats/:courseId', getCourseEnrollmentStats);

/**
 * @openapi
 * /api/course/stats/{courseId}:
 *   get:
 *     tags:
 *       - Course
 *     summary: Get enrollment stats for a course (time series)
 *     parameters:
 *       - in: path
 *         name: courseId
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *         description: time range filter (7d|30d|6m)
 *     responses:
 *       200:
 *         description: Enrollment stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CourseStatsItem'
 */

export default router;