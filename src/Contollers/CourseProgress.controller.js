import CourseProgress from "../Models/CourseProgress.model.js";
import CourseSch from "../Models/courses.model.sch.js";
import User from "../Models/user.model.js";
import TranscriptRequest from "../Models/TranscriptRequest.model.js";
import Assessment from "../Models/Assessment.model.js";
import Submission from "../Models/submission.model.js";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";
import { createTransporter } from "../Utiles/nodemailer.tranporter.js";
import {
  NotFoundError,
  AuthenticationError,
  ValidationError,
} from "../Utiles/errors.js";
import PDFDocument from "pdfkit";

const getFinalAssessmentPercentage = async (studentId, courseId) => {
  const progress = await CourseProgress.findOne({ studentId, courseId });
  if (!progress || !progress.finalAssessmentId) return 0;

  const assessment = await Assessment.findById(progress.finalAssessmentId);
  const submission = await Submission.findOne({
    studentId,
    assessment: progress.finalAssessmentId,
  });

  if (!assessment || !submission) return 0;

  const totalPossiblePoints = assessment.questions.reduce(
    (acc, q) => acc + (q.points || 0),
    0,
  );
  if (totalPossiblePoints === 0) return 0;

  return (submission.totalScore / totalPossiblePoints) * 100;
};

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

  const percentage = await getFinalAssessmentPercentage(studentId, courseId);
  if (percentage < 80) {
    return res.status(200).json({
      eligible: false,
      message: "Please score above or equal to 80% to get the certificate.",
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

  const percentage = await getFinalAssessmentPercentage(studentId, courseId);
  if (percentage < 80) {
    throw new ValidationError(
      "Please score above or equal to 80% to get the certificate.",
      "CRS_006",
    );
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
    margin: 0,
    autoFirstPage: true,
  });

  // Set response headers
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${course.courseTitle.replace(/\s+/g, "_")}_Certificate.pdf`,
  );

  doc.pipe(res);

  const pageWidth = doc.page.width; // ~841 pt (landscape A4)
  const pageHeight = doc.page.height; // ~595 pt (landscape A4)

  // Outer decorative border
  doc
    .rect(20, 20, pageWidth - 40, pageHeight - 40)
    .lineWidth(2)
    .stroke("#10b981");
  // Inner thin border
  doc
    .rect(28, 28, pageWidth - 56, pageHeight - 56)
    .lineWidth(0.5)
    .stroke("#10b981");

  // --- Academy name ---
  doc
    .fontSize(13)
    .font("Helvetica-Bold")
    .fillColor("#555")
    .text("Acewall Scholars Academy", 0, 55, {
      align: "center",
      width: pageWidth,
    });

  // --- Main heading ---
  doc
    .fontSize(36)
    .font("Helvetica-Bold")
    .fillColor("#10b981")
    .text("Certificate of Completion", 0, 90, {
      align: "center",
      width: pageWidth,
    });

  // Decorative divider line
  const divY = 142;
  doc
    .moveTo(pageWidth * 0.25, divY)
    .lineTo(pageWidth * 0.75, divY)
    .lineWidth(1)
    .stroke("#10b981");

  // --- "This is to certify that" ---
  doc
    .fontSize(16)
    .font("Helvetica")
    .fillColor("#555")
    .text("This is to certify that", 0, 158, {
      align: "center",
      width: pageWidth,
    });

  // --- Student name ---
  doc
    .fontSize(28)
    .font("Helvetica-Bold")
    .fillColor("#111")
    .text(`${student.firstName} ${student.lastName}`, 0, 185, {
      align: "center",
      width: pageWidth,
      underline: true,
    });

  // --- "has successfully completed" ---
  doc
    .fontSize(16)
    .font("Helvetica")
    .fillColor("#555")
    .text("has successfully completed the course", 0, 228, {
      align: "center",
      width: pageWidth,
    });

  // --- Course title ---
  doc
    .fontSize(22)
    .font("Helvetica-Bold")
    .fillColor("#10b981")
    .text(course.courseTitle, 0, 256, { align: "center", width: pageWidth });

  // Divider line below course title
  const divY2 = 294;
  doc
    .moveTo(pageWidth * 0.25, divY2)
    .lineTo(pageWidth * 0.75, divY2)
    .lineWidth(1)
    .stroke("#10b981");

  // --- Completion date & Certificate ID ---
  const uniqueId = progress._id.toString().toUpperCase().slice(-8);
  doc
    .fontSize(13)
    .font("Helvetica")
    .fillColor("#777")
    .text(
      `Completion Date: ${progress.completedAt.toLocaleDateString()}`,
      0,
      308,
      {
        align: "center",
        width: pageWidth,
      },
    );

  doc
    .fontSize(13)
    .font("Helvetica")
    .fillColor("#777")
    .text(`Certificate ID: AS-${uniqueId}`, 0, 328, {
      align: "center",
      width: pageWidth,
    });

  // --- Instructor name ---
  if (course.createdby) {
    const teacher = await User.findById(course.createdby);
    if (teacher) {
      doc
        .fontSize(13)
        .font("Helvetica-Bold")
        .fillColor("#333")
        .text(`Instructor: ${teacher.firstName} ${teacher.lastName}`, 0, 360, {
          align: "center",
          width: pageWidth,
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

  if (!progress.isCompleted) {
    throw new ValidationError(
      "You have not completed this course yet.",
      "CRS_007",
    );
  }

  const percentage = await getFinalAssessmentPercentage(studentId, courseId);
  if (percentage < 80) {
    throw new ValidationError(
      "Please score above or equal to 80% to request a transcript.",
      "CRS_006",
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

  let completionPercentage = 0;
  if (progress && progress.isCompleted) {
    completionPercentage = await getFinalAssessmentPercentage(
      studentId,
      courseId,
    );
  }

  return res.status(200).json({
    progress: progress
      ? { ...progress.toObject(), completionPercentage }
      : { isCompleted: false, completionPercentage: 0 },
  });
});
