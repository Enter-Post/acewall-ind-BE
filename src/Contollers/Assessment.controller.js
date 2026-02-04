import mongoose from "mongoose";
import { uploadToCloudinary } from "../lib/cloudinary-course.config.js";
import Assessment from "../Models/Assessment.model.js";
import Lesson from "../Models/lesson.model.sch.js";
import Chapter from "../Models/chapter.model.sch.js";
import { ObjectId } from "bson"; // Import ObjectId
import Enrollment from "../Models/Enrollement.model.js";
import e from "express";
import Submission from "../Models/submission.model.js";
import Discussion from "../Models/discussion.model.js";
import nodemailer from "nodemailer";
import {
  ValidationError,
  NotFoundError,
  AuthenticationError,
} from "../Utiles/errors.js";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";
export const sendAssessmentReminder = asyncHandler(async (req, res) => {
  const { assessmentId } = req.params;
  const teacherId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
    throw new ValidationError("Invalid assessment ID.", "VAL_006");
  }

  const assessment = await Assessment.findById(assessmentId)
    .populate("course", "courseTitle")
    .populate("createdby", "firstName lastName email");

  if (!assessment) {
    throw new NotFoundError("Assessment not found.", "ASS_001");
  }

  if (assessment.createdby._id.toString() !== teacherId.toString()) {
    throw new AuthenticationError(
      "You are not authorized to send reminders for this assessment.",
      "ASS_002"
    );
  }

    // ✅ Find enrolled students
    const enrollments = await Enrollment.find({
      course: assessment.course._id,
      student: { $ne: assessment.createdby._id },
    }).populate("student", "email firstName lastName");

    console.log(enrollments, "enrollments");

    const filteredEnrollments = enrollments.filter(
      (enr) => enr.student !== null
    );

  if (!filteredEnrollments.length) {
    throw new NotFoundError("No students enrolled in this course.", "ASS_003");
  }

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT || 465,
      secure: true,
      auth: {
        user: "support@acewallscholars.org",
        pass: "dmwjwyfxaccrdxwi",
      },
    });

    await transporter.verify().catch((err) => {
      console.error("❌ SMTP verification failed:", err.message);
    });

    const dueDate = assessment.dueDate?.date
      ? new Date(assessment.dueDate.date).toLocaleDateString()
      : "Not specified";

    const portalBaseURL =
      process.env.STUDENT_PORTAL_URL || "https://portal.acewallscholars.org";
    const assessmentLink = `${portalBaseURL}/student/assessment/${assessment._id}`;

    let sentCount = 0;

    for (const enrollment of filteredEnrollments) {
      const student = enrollment.student;
      if (!student?.email) continue;

      const mailOptions = {
        from: `"${process.env.MAIL_FROM_NAME || "Acewall Scholars"}" <${
          process.env.MAIL_USER
        }>`,
        to: student.email,
        subject: `Reminder: ${assessment.title} - Due ${dueDate}`,
        html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f7fb; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: #10b981; padding: 20px; text-align: center;">
              <h2 style="color: #ffffff; margin: 0; font-size: 22px;">Assessment Reminder</h2>
            </div>

            <!-- Body -->
            <div style="padding: 20px; color: #333;">
              <p style="font-size: 16px;">Hello ${
                student.firstName + " " + student.lastName
              },</p>
              <p style="font-size: 16px;">
                This is a reminder for your upcoming assessment:
              </p>

              <div style="margin: 20px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #10b981;">
                <p style="margin: 5px 0; font-size: 15px;"><strong>Assessment:</strong> ${
                  assessment.title
                }</p>
                <p style="margin: 5px 0; font-size: 15px;"><strong>Course:</strong> ${
                  assessment.course.courseTitle
                }</p>
                <p style="margin: 5px 0; font-size: 15px;"><strong>Due Date:</strong> ${dueDate}</p>
              </div>

             

              <p style="font-size: 14px; margin-top: 25px; text-align: center;">
                Please make sure to complete it on time through your student portal.
              </p>

              <p style="font-size: 14px; margin-top: 20px;">
                Best regards,<br>
                <strong>${assessment.createdby.firstName} ${
          assessment.createdby.lastName
        }</strong><br>
                ${assessment.createdby.email}
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #f3f4f6; color: #555; text-align: center; padding: 12px; font-size: 12px;">
              <p style="margin: 0;">Acewall Scholars © ${new Date().getFullYear()}</p>
          
            </div>
          </div>
        </div>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Reminder sent to ${student.email}`);
        sentCount++;
      } catch (err) {
        console.error(`❌ Failed to send to ${student.email}:`, err.message);
      }
    }

  return res.status(200).json({
    success: true,
    message: `Reminder emails sent to ${sentCount} students successfully.`,
    data: {
      assessmentId,
      assessmentTitle: assessment.title,
      dueDate,
      studentCount: sentCount,
      allStudents: filteredEnrollments.map((e) => ({
        id: e.student._id,
        name: `${e.student.firstName} ${e.student.lastName}`,
        email: e.student.email,
      })),
    },
  });
});

export const setReminderTime = asyncHandler(async (req, res) => {
  const { assessmentId } = req.params;
  const { reminder } = req.body;

  const assessment = await Assessment.findById(assessmentId);

  if (!assessment) {
    throw new NotFoundError("Assessment not found", "ASS_004");
  }

  assessment.reminderTimeBefore = reminder;

  await assessment.save();
  return res.status(200).json({ 
    success: true,
    message: "Assessment reminder time updated successfully" 
  });
});

export const findReminderTime = asyncHandler(async (req, res) => {
  const { assessmentId } = req.params;
  const assessment = await Assessment.findById(assessmentId);

  if (!assessment) {
    throw new NotFoundError("Assessment not found", "ASS_005");
  }

  return res.status(200).json({
    success: true,
    message: "Assessment reminder time retrieved successfully",
    data: { reminderTime: assessment.reminderTimeBefore },
  });
});

export const createAssessment = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    course,
    chapter,
    lesson,
    questions,
    semester,
    quarter,
    dueDate,
    category,
  } = req.body;

  const files = req.files;
  const createdby = req.user._id;

  const parsedQuestions = JSON.parse(questions || "[]");

    // ✅ Optional: Manual validation if questions exist
    if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
      for (const [index, q] of parsedQuestions.entries()) {
        if (!q.type || !["mcq", "truefalse", "qa"].includes(q.type)) {
          throw new ValidationError(`Invalid question type at index ${index}`, "VAL_007");
        }

        if (typeof q.points !== "number" || q.points < 1 || q.points > 999) {
          throw new ValidationError(`Invalid points in question ${index + 1}`, "VAL_008");
        }

        if (q.type === "mcq") {
          if (
            !Array.isArray(q.options) ||
            q.options.length < 2 ||
            q.options.length > 4
          ) {
            throw new ValidationError(`Question ${index + 1} must have 2–4 options`, "VAL_009");
          }
          if (!q.correctAnswer || typeof q.correctAnswer !== "string") {
            throw new ValidationError(
              `Correct answer is required for question ${index + 1}`,
              "VAL_010"
            );
          }
        }

        if (q.type === "truefalse") {
          if (!["true", "false"].includes(q.correctAnswer)) {
            throw new ValidationError(
              `Correct answer must be true/false in question ${index + 1}`,
              "VAL_011"
            );
          }
        }
      }
    }

    // ✅ Upload files (PDFs etc.)
    let uploadedFiles = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const result = await uploadToCloudinary(file.buffer, "lesson_pdfs");
        uploadedFiles.push({
          url: result.secure_url,
          filename: file.originalname,
        });
      }
    }

    // ✅ Infer course/chapter if not explicitly given
    let finalCourse = course;
    let finalChapter = chapter;

  if (chapter && !course) {
    const foundChapter = await Chapter.findById(chapter);
    if (!foundChapter) throw new NotFoundError("Chapter not found", "ASS_006");
    finalCourse = foundChapter.course;
  }

  if (lesson && !chapter) {
    const foundLesson = await Lesson.findById(lesson).populate("chapter");
    if (!foundLesson) throw new NotFoundError("Lesson not found", "ASS_007");

    if (!foundLesson.chapter)
      throw new ValidationError("Lesson has no associated chapter", "VAL_012");
    finalChapter = foundLesson.chapter._id;

    const foundChapter = await Chapter.findById(finalChapter);
    if (!foundChapter) throw new NotFoundError("Associated chapter not found", "ASS_008");
    finalCourse = foundChapter.course;
  }

    // ✅ Format due date if provided
    let dueDateObj = {};
    if (dueDate) {
      const date = new Date(dueDate);
      dueDateObj.date = date.toISOString().split("T")[0];
      dueDateObj.time = date.toISOString().split("T")[1].split(".")[0];
    }

    const determineType = () => {
      if (lesson) return "lesson-assessment";
      if (chapter) return "chapter-assessment";
      if (course) return "final-assessment";
      return null;
    };

  const type = determineType();
  if (!type) throw new ValidationError("Assessment type could not be determined", "VAL_013");

    // ✅ Save to DB
    const newAssessment = new Assessment({
      title,
      description,
      course: finalCourse,
      chapter: finalChapter,
      lesson,
      category,
      type,
      semester,
      quarter,
      questions: parsedQuestions,
      dueDate: dueDateObj,
      files: uploadedFiles,
      createdby,
    });

  await newAssessment.save();

  return res.status(201).json({
    success: true,
    message: "Assessment created successfully",
    data: newAssessment,
  });
});

export const deleteAssessment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deletedAssessment = await Assessment.findByIdAndDelete(id);
  if (!deletedAssessment) {
    throw new NotFoundError("Assessment not found", "ASS_009");
  }
  return res.status(200).json({ 
    success: true,
    message: "Assessment deleted successfully" 
  });
});

export const uploadFiles = asyncHandler(async (req, res) => {
  const files = req.files;
  const { id } = req.params;

  const assessment = await Assessment.findById(id);
  if (!assessment) {
    throw new NotFoundError("Assessment not found", "ASS_010");
  }

  if (files && files.length > 0) {
    for (const file of files) {
      const result = await uploadToCloudinary(file.buffer, "assessment_files");
      assessment.files.push({
        url: result.secure_url,
        filename: file.originalname,
      });
    }
    await assessment.save();

    return res.status(200).json({ 
      success: true,
      message: "Files uploaded successfully" 
    });
  }
});

export const deleteFile = asyncHandler(async (req, res) => {
  const { assessmentId, fileId } = req.params;

  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) {
    throw new NotFoundError("Assessment not found", "ASS_011");
  }

  const fileIndex = assessment.files.findIndex(
    (file) => file._id.toString() === fileId
  );
  if (fileIndex === -1) {
    throw new NotFoundError("File not found", "ASS_012");
  }

  const file = assessment.files[fileIndex];
  console.log(file, "file");

  await uploadToCloudinary(file.url, "assessment_files", "delete");
  assessment.files.splice(fileIndex, 1);
  await assessment.save();

  return res.status(200).json({ 
    success: true,
    message: "File deleted successfully" 
  });
});

export const getAssesmentbyID = asyncHandler(async (req, res) => {
  const { assessmentId } = req.params;
  const validObjectId = new mongoose.Types.ObjectId(assessmentId);

  console.log(assessmentId, validObjectId);
  const assessment = await Assessment.findById(validObjectId);

  if (!assessment) {
    throw new NotFoundError("Assessment not found", "ASS_013");
  }

  return res.status(200).json({ 
    success: true,
    message: "Assessment found", 
    data: assessment 
  });
});

export const allAssessmentByTeacher = asyncHandler(async (req, res) => {
  const createdby = req.user._id;

  if (!createdby) {
    throw new AuthenticationError("Unauthorized. User ID missing.", "ASS_014");
  }

    // Fetch the assessments created by the teacher and populate the relevant fields
    const assessments = await Assessment.find({ createdby })
      .select(
        "dueDate title description course chapter lesson createdAt category type"
      )
      .populate({
        path: "course", // Populate the course information from the CourseSch model
        select: "courseTitle thumbnail isVerified semesterbased gradingSystem",  // Select the needed fields
      })
      .populate({ path: "chapter", select: "title" })
      .populate({ path: "lesson", select: "title" })
      .populate({ path: "category", select: "name" });

  console.log(assessments, "assessment");

  return res.status(200).json({
    success: true,
    data: assessments
  });
});

export const getAllassessmentforStudent = asyncHandler(async (req, res) => {
  const studentId = req.user._id;

  // 1. Get all enrollments
  const allEnrollmentofStudent = await Enrollment.find({
    student: studentId,
  });

    const courseIds = allEnrollmentofStudent.map(
      (enrollment) => new mongoose.Types.ObjectId(enrollment.course)
    );

    // Common lookups for both Assessments and Discussions
    const commonLookups = [
      {
        $lookup: {
          from: "coursesches",
          localField: "course",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: { path: "$course", preserveNullAndEmptyArrays: true } },
      // Lookup Semester
      {
        $lookup: {
          from: "semesters",
          localField: "semester",
          foreignField: "_id",
          as: "semester",
        },
      },
      { $unwind: { path: "$semester", preserveNullAndEmptyArrays: true } },
      // Lookup Quarter
      {
        $lookup: {
          from: "quarters",
          localField: "quarter",
          foreignField: "_id",
          as: "quarter",
        },
      },
      { $unwind: { path: "$quarter", preserveNullAndEmptyArrays: true } },
      // Lookup Chapter
      {
        $lookup: {
          from: "chapters",
          localField: "chapter",
          foreignField: "_id",
          as: "chapter",
        },
      },
      { $unwind: { path: "$chapter", preserveNullAndEmptyArrays: true } },
      // Lookup Lesson
      {
        $lookup: {
          from: "lessons",
          localField: "lesson",
          foreignField: "_id",
          as: "lesson",
        },
      },
      { $unwind: { path: "$lesson", preserveNullAndEmptyArrays: true } },
      // Lookup Category
      {
        $lookup: {
          from: "assessmentcategories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    ];

    // 2. Fetch assessments
    const assessments = await Assessment.aggregate([
      { $match: { course: { $in: courseIds } } },
      ...commonLookups,
      {
        $lookup: {
          from: "submissions",
          let: { assessmentId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$assessment", "$$assessmentId"] },
                    { $eq: ["$studentId", new mongoose.Types.ObjectId(studentId)] },
                  ],
                },
              },
            },
          ],
          as: "submissions",
        },
      },
      {
        $addFields: {
          isSubmitted: { $gt: [{ $size: "$submissions" }, 0] },
          source: "assessment",
        },
      },
      {
        $project: {
          _id: 1,
          type: 1,
          title: 1,
          description: 1,
          dueDate: 1,
          createdAt: 1,
          isSubmitted: 1,
          category: 1,
          source: 1,
          "course._id": 1,
          "course.courseTitle": 1,
          "course.thumbnail": 1,
          "course.semesterbased": 1, // Added to check logic on frontend
          "semester.name": 1,
          "quarter.name": 1,
          "chapter._id": 1,
          "lesson._id": 1,
          "chapter.title": 1,
          "lesson.title": 1,
        },
      },
    ]);

    // 3. Fetch discussions
    const discussions = await Discussion.aggregate([
      { $match: { course: { $in: courseIds } } },
      ...commonLookups,
      {
        $lookup: {
          from: "discussioncomments",
          let: { discussionId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$discussion", "$$discussionId"] },
                    { $eq: ["$createdby", new mongoose.Types.ObjectId(studentId)] },
                  ],
                },
              },
            },
          ],
          as: "comments",
        },
      },
      {
        $addFields: {
          isSubmitted: { $gt: [{ $size: "$comments" }, 0] },
          title: "$topic",
          source: "discussion",
        },
      },
      {
        $project: {
          _id: 1,
          type: 1,
          title: 1,
          description: 1,
          dueDate: 1,
          createdAt: 1,
          isSubmitted: 1,
          category: 1,
          source: 1,
          "course._id": 1,
          "course.courseTitle": 1,
          "course.thumbnail": 1,
          "course.semesterbased": 1,
          "chapter._id": 1,
          "lesson._id": 1,
          "semester.name": 1,
          "quarter.name": 1,
          "chapter.title": 1,
          "lesson.title": 1,
        },
      },
    ]);

  // 4. Merge and sort
  const combined = [...assessments, ...discussions].sort((a, b) => {
    // Sort by submission status first, then by date
    if (a.isSubmitted === b.isSubmitted) {
      return new Date(a.dueDate?.date || a.createdAt) - new Date(b.dueDate?.date || b.createdAt);
    }
    return a.isSubmitted ? 1 : -1;
  });

  return res.status(200).json({
    success: true,
    data: combined
  });
});

export const editAssessmentInfo = asyncHandler(async (req, res) => {
  const { assessmentId } = req.params;
  const { title, description, category, dueDate } = req.body;

  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) {
    throw new NotFoundError("Assessment not found", "ASS_015");
  }

    let dueDateObj = {};
    if (dueDate) {
      const date = new Date(dueDate);
      dueDateObj.date = date.toISOString().split("T")[0];
      dueDateObj.time = date.toISOString().split("T")[1].split(".")[0];
    }

  assessment.title = title;
  assessment.description = description;
  assessment.category = category;
  assessment.dueDate = dueDateObj;

  await assessment.save();
  return res.status(200).json({ 
    success: true,
    message: "Assessment updated successfully" 
  });
});
 


export const getAssessmentStats = asyncHandler(async (req, res) => {
  const { assessmentId } = req.params;

  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) {
    throw new NotFoundError("Assessment not found", "ASS_016");
  }

    // 1. Count On-Time Submissions
    const onTimeCount = await Submission.countDocuments({ 
      assessment: assessmentId, 
      status: "before due date" 
    });

    // 2. Count Late Submissions
    const lateCount = await Submission.countDocuments({ 
      assessment: assessmentId, 
      status: "after due date" 
    });

    // 3. Get total students enrolled in the course
    const totalEnrolled = await Enrollment.countDocuments({ course: assessment.course });

  const submittedCount = onTimeCount + lateCount;
  const notSubmittedCount = Math.max(0, totalEnrolled - submittedCount);

  return res.status(200).json({
    success: true,
    data: {
      totalEnrolled,
      onTimeCount,
      lateCount,
      submittedCount,
      notSubmittedCount,
      completionRate: totalEnrolled > 0 ? ((submittedCount / totalEnrolled) * 100).toFixed(1) : 0
    }
  });
});