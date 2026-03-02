import CourseProgress from "../Models/CourseProgress.model.js";
import CourseSch from "../Models/courses.model.sch.js";
import User from "../Models/user.model.js";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";
import {
  NotFoundError,
  AuthenticationError,
  ValidationError,
} from "../Utiles/errors.js";
import PDFDocument from "pdfkit";

export const getCertificateEligibility = asyncHandler(async (req, res) => {
  const studentId = req.user._id;
  const { courseId } = req.params;

  const progress = await CourseProgress.findOne({
    studentId,
    courseId,
  });

  const course = await CourseSch.findById(courseId);
  if (!course) throw new NotFoundError("Course not found", "CRS_001");

  if (!progress || !progress.isCompleted) {
    return res.status(200).json({
      eligible: false,
      message: "You have not completed this course yet.",
    });
  }

  if (!course.offersCertificate) {
    return res.status(200).json({
      eligible: false,
      message: "This course does not offer a certificate.",
    });
  }

  return res.status(200).json({ eligible: true });
});

export const generateCertificate = asyncHandler(async (req, res) => {
  const studentId = req.user._id;
  const { courseId } = req.params;

  const progress = await CourseProgress.findOne({ studentId, courseId });
  const course = await CourseSch.findById(courseId);
  const student = await User.findById(studentId);

  if (!progress || !progress.isCompleted) {
    throw new AuthenticationError("Course not completed", "CRS_002");
  }

  if (!course.offersCertificate) {
    throw new ValidationError(
      "This course does not offer a certificate",
      "CRS_003",
    );
  }

  const doc = new PDFDocument({
    layout: "landscape",
    size: "A4",
  });

  // Set response headers
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${course.courseTitle.replace(/\s+/g, "_")}_Certificate.pdf`,
  );

  doc.pipe(res);

  // Background or border (optional)
  doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke("#10b981");

  // Certificate Content
  doc.moveDown(4);
  doc
    .fontSize(40)
    .font("Helvetica-Bold")
    .fillColor("#10b981")
    .text("Certificate of Completion", { align: "center" });

  doc.moveDown(2);
  doc
    .fontSize(20)
    .font("Helvetica")
    .fillColor("#333")
    .text("This is to certify that", { align: "center" });

  doc.moveDown(1);
  doc
    .fontSize(30)
    .font("Helvetica-Bold")
    .fillColor("#000")
    .text(`${student.firstName} ${student.lastName}`, { align: "center" });

  doc.moveDown(1);
  doc
    .fontSize(20)
    .font("Helvetica")
    .fillColor("#333")
    .text("has successfully completed the course", { align: "center" });

  doc.moveDown(1);
  doc
    .fontSize(25)
    .font("Helvetica-Bold")
    .fillColor("#10b981")
    .text(course.courseTitle, { align: "center" });

  doc.moveDown(2);
  doc
    .fontSize(15)
    .font("Helvetica")
    .fillColor("#777")
    .text(`Completed on: ${progress.completedAt.toLocaleDateString()}`, {
      align: "center",
    });

  doc.moveDown(4);
  doc
    .fontSize(12)
    .font("Helvetica")
    .fillColor("#999")
    .text("Acewall Scholars Academy", { align: "center" });

  doc.end();
});

export const getCourseProgress = asyncHandler(async (req, res) => {
  const studentId = req.user._id;
  const { courseId } = req.params;

  const progress = await CourseProgress.findOne({ studentId, courseId });

  return res.status(200).json({
    progress: progress || { isCompleted: false },
  });
});
