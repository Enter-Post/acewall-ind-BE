import Mail from "nodemailer/lib/mailer/index.js";
import Announcement from "../Models/Annoucement.model.js";
import CourseSch from "../Models/courses.model.sch.js";
import Enrollment from "../Models/Enrollement.model.js";
import User from "../Models/user.model.js";
import nodemailer from "nodemailer";
import { uploadToCloudinary } from "../lib/cloudinary-course.config.js";
import {
  ValidationError,
  NotFoundError,
} from "../Utiles/errors.js";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";
import { notifyNewAnnouncement } from "../Utiles/notificationService.js";


export const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, message, courseId, teacherId, links } = req.body;

  if (!title || !message || !courseId || !teacherId) {
    throw new ValidationError("All fields are required.", "ANN_001");
  }

  // Validate teacher
  const teacher = await User.findById(teacherId);
  if (!teacher || teacher.role !== "teacher") {
    throw new ValidationError("Invalid teacher.", "ANN_002");
  }

  // Validate course
  const course = await CourseSch.findById(courseId);
  if (!course) {
    throw new NotFoundError("Course not found.", "ANN_003");
  }

    // Process links
    const linkArray = links
      ? links
          .split(",")
          .map((l) => l.trim())
          .filter((l) => l.length > 0)
      : [];

    // Upload attachments to Cloudinary
    const attachments = [];
    const files = req.files?.filter((f) => f.fieldname === "attachments") || [];

    for (const file of files) {
      const result = await uploadToCloudinary(
        file.buffer,
        "announcement_files"
      );
      attachments.push({
        url: result.secure_url,
        publicId: result.public_id,
        filename: file.originalname,
        type: file.mimetype,
      });
    }

    // Create announcement
    const announcement = new Announcement({
      title,
      message,
      attachments,
      links: linkArray,
      teacher: teacherId,
      course: courseId,
    });

    await announcement.save();

    // Send notification to enrolled students
    try {
      await notifyNewAnnouncement(
        courseId,
        course.courseTitle,
        title,
        teacherId
      );
    } catch (error) {
      console.error("❌ Announcement notification error:", error.message);
    }

    // Fetch enrolled students + guardians
    const enrollments = await Enrollment.find({ course: courseId }).populate(
      "student",
      "email guardianEmails guardianEmailPreferences firstName lastName"
    );

    const allRecipientEmails = [];

    for (const enroll of enrollments) {
      const student = enroll.student;
      if (!student) continue;

      if (student.email) allRecipientEmails.push(student.email);

      if (
        student.guardianEmails?.length &&
        student.guardianEmailPreferences?.announcement === true
      ) {
        allRecipientEmails.push(...student.guardianEmails);
      }
    }

    const uniqueEmails = [...new Set(allRecipientEmails)];

    // Email sending
    if (uniqueEmails.length > 0) {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: "support@acewallscholars.org",
          pass: "bpwvhmhiivrpkekl",
        },
      });

      const mailAttachments = attachments.map((a) => ({
        filename: a.filename,
        path: a.url,
      }));

      const mailOptions = {
        from: `"Acewall Scholars Team" <support@acewallscholars.org>`,
        to: uniqueEmails,
        subject: `New Announcement: ${title}`,
        html: `
          <div style="font-family: Arial, sans-serif; background-color: #f4f7fb; padding: 20px;">
            <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; padding: 20px;">
                <img src="https://lirp.cdn-website.com/6602115c/dms3rep/multi/opt/acewall+scholars-431w.png" 
                    alt="Acewall Scholars Logo" 
                    style="height: 60px; margin: 0 auto;" />
              </div>
              <div style="background: #28a745; padding: 20px; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 20px;">New Announcement</h1>
              </div>
              <div style="padding: 20px; color: #333;">
                <p style="font-size: 16px;">There’s a new announcement for your course <strong>${
                  course.courseTitle
                }</strong>:</p>
                <div style="margin: 20px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #28a745;">
                  <p style="font-size: 16px; margin: 0;">${message}</p>
                </div>
                ${
                  linkArray.length
                    ? `<p>Links:<br>${linkArray
                        .map((l) => `<a href="${l}" target="_blank">${l}</a>`)
                        .join("<br>")}</p>`
                    : ""
                }
                <p style="font-size: 14px; margin-top: 10px;"><em>From: ${
                  teacher.firstName
                } ${teacher.lastName}</em></p>
              </div>
              <div style="background: #f0f4f8; color: #555; text-align: center; padding: 15px; font-size: 12px;">
                <p style="margin: 0;">Acewall Scholars © ${new Date().getFullYear()}</p>
                <p style="margin: 0;">Do not reply to this automated message.</p>
              </div>
            </div>
          </div>
        `,
        attachments: mailAttachments,
      };

    console.log("Announcement emails sent");
  }

  return res.status(201).json({
    message: "Announcement created and emails sent successfully.",
    announcement,
  });
});

export const getAnnouncementsForCourse = asyncHandler(async (req, res) => {
  const courseId = req.query.courseId || req.params.courseId;
  
  if (!courseId) {
    throw new ValidationError("Course ID is required", "ANN_005");
  }
  
  const announcements = await Announcement.find({ course: courseId })
    .populate("teacher", "firstName lastName email")
    .sort({ createdAt: -1 });

  return res.status(200).json(announcements);
});

export const getAnnouncementsByTeacher = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;
  const { course } = req.query;  // Get the course filter from the query parameters

  // Filter by teacherId and course if provided
  const query = { teacher: teacherId };
  if (course) query.course = course;

  const announcements = await Announcement.find(query)
    .populate("course", "courseTitle")  // Populate course title
    .populate("teacher", "firstName lastName email")  // Populate teacher info
    .select('title message course attachments links createdAt updatedAt');  // Select the fields you want to return, including attachments and links

  return res.status(200).json({ 
    announcements,
    message: "Announcements fetched successfully"
  });
});



export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deleted = await Announcement.findByIdAndDelete(id);
  if (!deleted) {
    throw new NotFoundError("Announcement not found", "ANN_004");
  }

  return res.status(200).json({ 
    message: "Announcement deleted successfully" 
  });
});

export const getAnnouncementsForStudent = asyncHandler(async (req, res) => {
  const studentId = req.user._id;

  // 1. Find all courses the student is enrolled in (exclude CANCELLED)
  const enrollments = await Enrollment.find({ 
    student: studentId,
    status: { $ne: "CANCELLED" }
  }).select("course");
  
  if (!enrollments.length) {
    return res.status(200).json({ announcements: [] });
  }

  const courseIds = enrollments.map((enrollment) => enrollment.course);

  // 2. Fetch announcements for those courses with all necessary fields
  const announcements = await Announcement.find({
    course: { $in: courseIds },
  })
    .populate("course", "courseTitle thumbnail") // Added thumbnail in case you want to show course icons
    .populate("teacher", "firstName lastName")    // Added teacher name so student knows who sent it
    .select('title message course teacher attachments links createdAt updatedAt') 
    .sort({ createdAt: -1 });

  return res.status(200).json({ 
    announcements
  });
});
