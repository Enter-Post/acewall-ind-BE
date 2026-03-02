import CourseProgress from "../Models/CourseProgress.model.js";
import CourseSch from "../Models/courses.model.sch.js";
import User from "../Models/user.model.js";
import TranscriptRequest from "../Models/TranscriptRequest.model.js";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";
import { createTransporter } from "../Utiles/nodemailer.tranporter.js";
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
  doc.moveDown(2);
  doc
    .fontSize(15)
    .font("Helvetica-Bold")
    .fillColor("#000")
    .text("Acewall Scholars Academy", { align: "center" });

  doc.moveDown(2);
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
    .text(`${student.firstName} ${student.lastName}`, {
      align: "center",
      underline: true,
    });

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
    .fontSize(16)
    .font("Helvetica")
    .fillColor("#777")
    .text(`Completion Date: ${progress.completedAt.toLocaleDateString()}`, {
      align: "center",
    });

  const uniqueId = progress._id.toString().toUpperCase().slice(-8);
  doc.text(`Certificate ID: AS-${uniqueId}`, { align: "center" });

  doc.moveDown(2);
  // Instructor Name
  if (course.createdby) {
    const teacher = await User.findById(course.createdby);
    if (teacher) {
      doc
        .fontSize(14)
        .text(`Instructor: ${teacher.firstName} ${teacher.lastName}`, {
          align: "center",
        });
    }
  }

  doc.end();
});

export const requestTranscript = asyncHandler(async (req, res) => {
  const studentId = req.user._id;
  const { courseId } = req.params;
  const {
    fullName,
    email,
    phone,
    institutionName,
    deliveryMethod,
    additionalNotes,
  } = req.body;

  const course = await CourseSch.findById(courseId);
  if (!course) throw new NotFoundError("Course not found", "CRS_001");

  if (!course.offersTranscript) {
    throw new ValidationError(
      "This course does not offer a transcript.",
      "CRS_004",
    );
  }

  // Verify enrollment
  const progress = await CourseProgress.findOne({ studentId, courseId });
  if (!progress) {
    throw new AuthenticationError(
      "You are not enrolled in this course.",
      "CRS_005",
    );
  }

  const teacherId = course.createdby;
  const teacher = await User.findById(teacherId);
  if (!teacher) throw new NotFoundError("Teacher not found", "TCH_001");

  const transcriptRequest = await TranscriptRequest.create({
    studentId,
    teacherId,
    courseId,
    fullName,
    email,
    phone,
    institutionName,
    deliveryMethod,
    additionalNotes,
  });

  // Send email to teacher
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.MAIL_USER,
      to: teacher.email,
      subject: `New Transcript Request - ${course.courseTitle}`,
      html: `
        <h3>New Transcript Request Received</h3>
        <p><strong>Student Name:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Institution:</strong> ${institutionName}</p>
        <p><strong>Delivery Method:</strong> ${deliveryMethod}</p>
        <p><strong>Additional Notes:</strong> ${additionalNotes || "N/A"}</p>
        <br>
        <p><strong>Course:</strong> ${course.courseTitle}</p>
        <p><strong>Requested On:</strong> ${new Date().toLocaleDateString()}</p>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Failed to send transcript request email:", err);
    // We still return success as the request is saved in the DB
  }

  return res.status(200).json({
    message: "Transcript request sent successfully.",
    transcriptRequest,
  });
});

export const getCourseProgress = asyncHandler(async (req, res) => {
  const studentId = req.user._id;
  const { courseId } = req.params;

  const progress = await CourseProgress.findOne({ studentId, courseId });

  return res.status(200).json({
    progress: progress || { isCompleted: false },
  });
});
