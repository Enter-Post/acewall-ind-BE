import cron from "node-cron";
import moment from "moment";
import nodemailer from "nodemailer";
import Assessment from "../Models/Assessment.model.js";
import Enrollment from "../Models/Enrollement.model.js";
import User from "../Models/user.model.js"; // adjust if needed

// --- Email Transporter (reuse existing if you already have one)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "support@acewallscholars.org",
    pass: process.env.MAIL_PASS,
  },
});

// --- Helper: combine date + time fields into a single datetime
const getDueDateTime = (dueDate) => {
  if (!dueDate?.date || !dueDate?.time) return null;
  const dateStr = moment(dueDate.date).format("YYYY-MM-DD");
  return moment(`${dateStr} ${dueDate.time}`, "YYYY-MM-DD HH:mm");
};

// --- Mapping teacher’s selection to hours
const offsetHoursMap = {
  "12hours": 12,
  "24hours": 24,
  "48hours": 48,
  noReminder: null,
};

const BATCH_SIZE = 20;

// --- Cron job: runs every hour
export const startAssessmentReminder = () => {
  cron.schedule("0 * * * *", async () => {
    console.log(
      "⏰ Checking for upcoming assessments (teacher-based reminders)...",
    );

    const now = moment();

    try {
      // 1️⃣ Find all active assessments where reminder hasn't been sent
      const assessments = await Assessment.find({
        stutus: "active",
        reminderSent: false,
      }).populate("course");

      for (const assessment of assessments) {
        const dueDateTime = getDueDateTime(assessment.dueDate);
        if (!dueDateTime) continue;

        // Skip if teacher selected "noReminder"
        const offsetHours = offsetHoursMap[assessment.reminderTimeBefore];
        if (!offsetHours) continue;

        // Calculate exact reminder send time
        const reminderTime = dueDateTime.clone().subtract(offsetHours, "hours");

        // Only send when current time >= reminder time
        if (now.isSameOrAfter(reminderTime)) {
          console.log(
            `📘 Sending reminder for assessment: ${assessment.title}`,
          );

          // 2️⃣ Get all students enrolled in this course
          const enrollments = await Enrollment.find({
            course: assessment.course._id,
          }).populate("student");

          if (!enrollments.length) continue;

          // 3️⃣ Send emails in small parallel batches
          for (let i = 0; i < enrollments.length; i += BATCH_SIZE) {
            const batch = enrollments.slice(i, i + BATCH_SIZE);

            await Promise.all(
              batch.map(async (enrollment) => {
                const student = enrollment.student;
                if (!student?.email) return;

                const mailOptions = {
                  from: `"Acewall Scholars" <support@acewallscholars.org>`,
                  to: student.email,
                  subject: `Reminder: ${assessment.title} is due soon!`,
                  html: `
                    <h3>Hi ${student.firstName || "Student"},</h3>
                    <p>This is a reminder that your assessment 
                    <strong>${assessment.title}</strong> for the course 
                    <strong>${assessment.course.courseTitle}</strong> 
                    is due on <b>${dueDateTime.format("MMMM Do YYYY, h:mm A")}</b>.</p>
                    <p>Please make sure to complete it before the deadline.</p>
                    <br/>
                    <p>— Acewall Scholars Team</p>
                  `,
                };

                try {
                  await transporter.sendMail(mailOptions);
                  console.log(`📨 Reminder sent to ${student.email}`);
                } catch (err) {
                  console.error(
                    `⚠️ Failed to send to ${student.email}: ${err.message}`,
                  );
                }
              }),
            );
          }

          // 4️⃣ Mark assessment as reminder sent so it won’t send again
          assessment.reminderSent = true;
          await assessment.save();
          console.log(`✅ Reminder marked as sent for: ${assessment.title}`);
        }
      }
    } catch (error) {
      console.error("❌ Error running assessment reminder:", error.message);
    }
  });
  console.log("✅ Assessment Reminder Cron Job Started (runs every hour)");
};
