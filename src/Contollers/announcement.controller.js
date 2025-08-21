import Mail from "nodemailer/lib/mailer/index.js";
import Announcement from "../Models/Annoucement.model.js";
import CourseSch from "../Models/courses.model.sch.js";
import Enrollment from "../Models/Enrollement.model.js";
import User from "../Models/user.model.js";
import nodemailer from "nodemailer";
export const createAnnouncement = async (req, res) => {
  const { title, message, courseId, teacherId } = req.body;

  if (!title || !message || !courseId || !teacherId) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    // Validate teacher
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "teacher") {
      return res.status(400).json({ error: "Invalid teacher." });
    }

    // Validate course
    const course = await CourseSch.findById(courseId);
    if (!course) {
      return res.status(400).json({ error: "Course not found." });
    }

    // Create announcement
    const announcement = new Announcement({
      title,
      message,
      course: courseId,
      teacher: teacherId,
    });

    // Get enrolled students
    const enrollment = await Enrollment.find({ course: courseId }).populate("student", "email");

    const studentEmails = enrollment.map((enroll) => enroll.student.email);

    // Send email to all enrolled students
    if (studentEmails.length > 0 && process.env.MAIL_USER) {
      const transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT),
        secure: Number(process.env.MAIL_PORT) === 465,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      });

      const mailOptions = {
        from: `"${process.env.MAIL_FROM_NAME || "Course Team"}" <${process.env.MAIL_USER}>`,
        to: studentEmails, // can be an array or comma-separated string
        subject: `New Announcement: ${title}`,
        html: `
        <h2>New Announcement for ${course.courseTitle}</h2>
        <p>${message}</p>
        <p><em>From: ${teacher.firstName} ${teacher.lastName}</em></p>
    `,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log("✅ Emails sent to students");

      } catch (error) {
        console.error("❌ Error sending emails:", error);
      }
    }


    await announcement.save();

    res.status(201).json({
      message: "Announcement created and email sent successfully.",
      announcement,
      studentEmails,
    });
  } catch (err) {
    console.error("Error creating announcement or sending email:", err);
    res.status(500).json({ error: "Server error." });
  }
};

export const getAnnouncementsForCourse = async (req, res) => {
  const { courseId } = req.params;
  try {
    const announcements = await Announcement.find({ course: courseId })
      .populate("teacher", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.status(200).json(announcements);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
};

export const getAnnouncementsByTeacher = async (req, res) => {
  const { teacherId } = req.params;

  try {
    const announcements = await Announcement.find({ teacher: teacherId })
      .populate("course", "courseTitle") // Optional: populate course title
      .populate("teacher", "firstName lastName email"); // Optional: populate teacher info

    res.status(200).json({ announcements });
  } catch (error) {
    console.error("Error fetching announcements by teacher:", error);
    res.status(500).json({ message: "Server error fetching announcements" });
  }
};

export const deleteAnnouncement = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await Announcement.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    res.status(200).json({ message: "Announcement deleted successfully" });
  } catch (err) {
    console.error("Error deleting announcement:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getAnnouncementsForStudent = async (req, res) => {
  const studentId = req.user._id;
  try {
    const enrollments = await Enrollment.find({ student: studentId }).select(
      "course"
    );
    const courseIds = enrollments.map((enrollment) => enrollment.course);
    const announcements = await Announcement.find({
      course: { $in: courseIds },
    })
      .populate("course", "courseTitle")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, announcements });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
