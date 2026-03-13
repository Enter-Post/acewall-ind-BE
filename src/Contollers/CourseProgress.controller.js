import CourseProgress from "../Models/CourseProgress.model.js";
import CourseSch from "../Models/courses.model.sch.js";
import User from "../Models/user.model.js";
import TranscriptRequest from "../Models/TranscriptRequest.model.js";
import Assessment from "../Models/Assessment.model.js";
import Submission from "../Models/submission.model.js";
import Gradebook from "../Models/Gradebook.model.js";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";
import { createTransporter } from "../Utiles/nodemailer.tranporter.js";
import {
  NotFoundError,
  AuthenticationError,
  ValidationError,
} from "../Utiles/errors.js";
import PDFDocument from "pdfkit";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getOverallCoursePercentage = async (studentId, courseId) => {
  const gradebook = await Gradebook.findOne({ studentId, courseId });
  return gradebook ? gradebook.finalPercentage || 0 : 0;
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
      message:
        "Please attempt the final assessment to be eligible for the certificate.",
    });
  }

  if (!course.offersCertificate) {
    return res.status(200).json({
      eligible: false,
      message: "This course does not offer a certificate.",
    });
  }

  const percentage = await getOverallCoursePercentage(studentId, courseId);
  const passingPercentage = course.passingPercentage || 80;
  if (percentage < passingPercentage) {
    return res.status(200).json({
      eligible: false,
      message: `Your overall course score is ${percentage.toFixed(1)}%. Please achieve at least ${passingPercentage}% overall to get the certificate.`,
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
    throw new AuthenticationError(
      "Please attempt the final assessment first.",
      "CRS_002",
    );
  }

  const percentage = await getOverallCoursePercentage(studentId, courseId);
  const passingPercentage = course.passingPercentage || 80;
  if (percentage < passingPercentage) {
    throw new ValidationError(
      `Your overall course score is ${percentage.toFixed(1)}%. Please achieve at least ${passingPercentage}% overall to get the certificate.`,
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

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  // Colors
  const darkGreen = "#008000"; 
  const accentBlue = "#2a4365";
  const gold = "#d4af37";
  const white = "#ffffff";
  const black = "#000000";
  const gray = "#4a5568";

  // --- Background and Borders ---
  doc.rect(0, 0, pageWidth, pageHeight).fill(white);

  // Decorative Corners (Triangles)
  const corners = [
    { x: 0, y: 0, dx: 250, dy: 250 }, // Top Left
    { x: pageWidth, y: 0, dx: -250, dy: 250 }, // Top Right
    { x: 0, y: pageHeight, dx: 250, dy: -250 }, // Bottom Left
    { x: pageWidth, y: pageHeight, dx: -250, dy: -250 }, // Bottom Right
  ];

  corners.forEach((c) => {
    doc.moveTo(c.x, c.y).lineTo(c.x + c.dx, c.y).lineTo(c.x, c.y + c.dy).fill(darkGreen);
    doc.moveTo(c.x, c.y).lineTo(c.x + c.dx * 0.8, c.y).lineTo(c.x, c.y + c.dy * 0.8).fill(accentBlue);
  });

  // Gold accent lines in corners
  doc.lineWidth(2).strokeColor(gold);
  doc.moveTo(10, 10).lineTo(230, 10).lineTo(10, 230).closePath().stroke();
  doc.moveTo(pageWidth - 10, 10).lineTo(pageWidth - 230, 10).lineTo(pageWidth - 10, 230).closePath().stroke();
  doc.moveTo(10, pageHeight - 10).lineTo(230, pageHeight - 10).lineTo(10, pageHeight - 230).closePath().stroke();
  doc.moveTo(pageWidth - 10, pageHeight - 10).lineTo(pageWidth - 230, pageHeight - 10).lineTo(pageWidth - 10, pageHeight - 230).closePath().stroke();

  // Internal gold border
  doc.rect(40, 40, pageWidth - 80, pageHeight - 80).lineWidth(1).strokeColor(gold).stroke();

  // --- 1. Certificate ID (Top Center, Small, Not Bold) ---
  const uniqueId = progress._id.toString().toUpperCase().slice(-8);
  doc
    .fontSize(11)
    .font("Helvetica")
    .fillColor(gray)
    .text(`Certificate ID: AS-${uniqueId}`, 0, 20, {
      align: "center",
      width: pageWidth,
    });

  // --- 2. Main Title Section ---
  doc
    .fontSize(42)
    .font("Helvetica-Bold")
    .fillColor(black)
    .text("CERTIFICATE", 0, 100, { align: "center", width: pageWidth });

  doc
    .fontSize(20)
    .font("Helvetica")
    .fillColor(gray)
    .text("OF COMPLETION", 0, 145, { align: "center", width: pageWidth });

  doc
    .fontSize(14)
    .font("Helvetica")
    .fillColor(gray)
    .text("This certificate of completion is presented to", 0, 190, {
      align: "center",
      width: pageWidth,
    });

  // Student Name
  doc
    .fontSize(32)
    .font("Helvetica-Bold")
    .fillColor(darkGreen)
    .text(`${student.firstName} ${student.lastName}`, 0, 220, {
      align: "center",
      width: pageWidth,
    });

  // Name Underline
  doc.moveTo(pageWidth / 4, 255).lineTo((3 * pageWidth) / 4, 255).lineWidth(1).strokeColor(black).stroke();

  doc
    .fontSize(14)
    .font("Helvetica")
    .fillColor(gray)
    .text("Who has successfully completed and passed the course requirements of", 0, 275, {
      align: "center",
      width: pageWidth,
    });

  // Course Name
  doc
    .fontSize(22)
    .font("Helvetica-Bold")
    .fillColor(black)
    .text(course.courseTitle, 0, 305, {
      align: "center",
      width: pageWidth,
    });

  // Course Underline
  doc.moveTo(pageWidth / 6, 335).lineTo((5 * pageWidth) / 6, 335).lineWidth(0.5).strokeColor(gray).stroke();

  // Date
  const date = progress.completedAt || new Date();
  const day = date.getDate();
  const month = date.toLocaleString("default", { month: "long" });
  const year = date.getFullYear();

  // Ordinal suffix logic
  const j = day % 10;
  const k = day % 100;
  let suffix = "th";
  if (j === 1 && k !== 11) suffix = "st";
  if (j === 2 && k !== 12) suffix = "nd";
  if (j === 3 && k !== 13) suffix = "rd";

  doc
    .fontSize(14)
    .font("Helvetica")
    .fillColor(gray)
    .text(`On this ${day}${suffix} Day of ${month} in the year of ${year}`, 0, 360, {
      align: "center",
      width: pageWidth,
    });

  // --- 3. Footer Section (Instructor & Co-Founder) ---
  // footerY set to 450 to give more gap from the bottom corner shapes
  const footerY = 450; 

  // Instructor logic
  let instructorName = "N/A";
  if (course.createdby) {
    const teacher = await User.findById(course.createdby);
    if (teacher) instructorName = `${teacher.firstName} ${teacher.lastName}`;
  }

  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .fillColor(black)
    .text(`Instructor: ${instructorName}`, 120, footerY, {
      width: 200,
      align: "left",
    });

  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .fillColor(black)
    .text("CEO/Founder: Keisha Wallace", pageWidth - 320, footerY, {
      width: 200,
      align: "right",
    });

  // Seal Image (Centered Bottom)
  const sealWidth = 90;
  try {
    const sealPath = path.join(__dirname, "..", "image", "Seal", "sealimage.png");
    doc.image(sealPath, (pageWidth - sealWidth) / 2, pageHeight - 140, {
      width: sealWidth,
    });
  } catch (error) {
    console.error("Seal image not found:", error.message);
  }

  // Organization Name
  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(gray)
    .text("Acewall Scholars Academy", 0, pageHeight - 35, {
      align: "center",
      width: pageWidth,
    });

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
      "Please attempt the final assessment first to be eligible for a transcript.",
      "CRS_007",
    );
  }

  const percentage = await getOverallCoursePercentage(studentId, courseId);
  const passingPercentage = course.passingPercentage || 80;
  if (percentage < passingPercentage) {
    throw new ValidationError(
      `Your overall course score is ${percentage.toFixed(1)}%. Please achieve at least ${passingPercentage}% overall to request a transcript.`,
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

  const completionPercentage = await getOverallCoursePercentage(
    studentId,
    courseId,
  );

  return res.status(200).json({
    progress: progress
      ? { ...progress.toObject(), completionPercentage }
      : { isCompleted: false, completionPercentage: 0 },
  });
});
