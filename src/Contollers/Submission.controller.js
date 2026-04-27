import mongoose from "mongoose";
import Assessment from "../Models/Assessment.model.js";
import Submission from "../Models/submission.model.js";
import CourseProgress from "../Models/CourseProgress.model.js";

import nodemailer from "nodemailer";
import dotenv from "dotenv";
import User from "../Models/user.model.js";
import { uploadToCloudinary } from "../lib/cloudinary-course.config.js";
import { updateGradebookOnSubmission } from "../Utiles/updateGradebookOnSubmission.js";
import { ValidationError, NotFoundError } from "../Utiles/errors.js";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";
import { notifyGradePosted } from "../Utiles/notificationService.js";
import { ParticipantListInstance } from "twilio/lib/rest/conversations/v1/conversation/participant.js";

dotenv.config();

export const submission = asyncHandler(async (req, res) => {
  const studentId = req.user._id;
  const { assessmentId } = req.params;
  const answers = req.body;
  const files = req.files;
  const { resubmission } = req.query;

  let finalQuestionsubmitted;
  let submissionCount;

  const alreadySubmitted = await Submission.findOne({
    studentId,
    assessment: assessmentId,
  });

  if (alreadySubmitted) {
    const lastSubmission = await Submission.find({
      studentId,
      assessment: assessmentId,
    }).sort({ createdAt: -1 }).limit(1);

    console.log(lastSubmission, "lastSubmission");

    submissionCount = ++lastSubmission[0].resubmitted.count || 0;
  }

  const assessment = await Assessment.findById(assessmentId);

  if (alreadySubmitted && !assessment.allowResubmission) {
    throw new ValidationError(
      "You have already submitted this assessment and you are not allowed to resubmit.",
      "SUB_001",
    );
  }

  let answerFiles = [];

  // Handle local files uploaded via multer
  for (const file of files) {
    const result = await uploadToCloudinary(file.buffer, "assessment_files");
    answerFiles.push({
      url: result.secure_url,
      filename: file.originalname,
      public_id: result.public_id,
    });
  }

  // Handle Google Drive files
  Object.keys(req.body).forEach(key => {
    if (key.startsWith("driveFile_")) {
      try {
        const driveFile = JSON.parse(req.body[key]);
        answerFiles.push({
          url: driveFile.url || driveFile.secure_url,
          filename: driveFile.filename || driveFile.name,
          public_id: driveFile.publicId || driveFile.public_id,
        });
      } catch (e) {
        console.error("Error parsing drive file:", e);
      }
    }
  });

  if (assessment.assessmentType === "file") {
    finalQuestionsubmitted = [answers];
  } else {
    finalQuestionsubmitted = answers.answers;
  }

  if (!assessment) {
    throw new NotFoundError("Assessment not found", "SUB_002");
  }

  let totalScore = 0;
  let maxScore = 0;

  const dueDate = new Date(assessment.dueDate.date)
    .toISOString()
    .split("T")[0];
  const dueTime = assessment.dueDate.time;
  const dueDateTime = new Date(`${dueDate}T${dueTime}`);
  const now = new Date();

  const override = assessment.studentDueDateOverrides.find(
    o => o.student.toString() === studentId
  );

  let finalDueDate = dueDateTime;

  if (override) {
    if (override.newDueDate) {
      // Logic to handle override date/time same as base due date
      const overDate = new Date(override.newDueDate.date).toISOString().split("T")[0];
      const overTime = override.newDueDate.time;
      finalDueDate = new Date(`${overDate}T${overTime}`);
    }
  }

  let status = "before due date";
  if (now > finalDueDate) {
    status = "after due date";
  }

  const processedAnswers = finalQuestionsubmitted.map((ans) => {
    const question = assessment.questions.find(
      (q) => q._id.toString() === ans.questionId
    );

    if (!question) {
      throw new ValidationError("Invalid questionId in submission.", "SUB_003");
    }

    if (question.type === "mcq" || question.type === "truefalse") {
      const isCorrect = question.correctAnswer === ans.selectedAnswer;
      const pointsAwarded = isCorrect ? question.points : 0;
      totalScore += pointsAwarded;

      maxScore += question.points;

      return {
        questionId: ans.questionId,
        selectedAnswer: ans.selectedAnswer,
        isCorrect,
        status,
        pointsAwarded,
        requiresManualCheck: false,
      };
    } else if (question.type === "file") {
      return {
        questionId: ans.questionId,
        file: answerFiles,
        isCorrect: null,
        status,
        pointsAwarded: 0,
        requiresManualCheck: true,
      };
    } else {
      return {
        questionId: ans.questionId,
        selectedAnswer: ans.selectedAnswer,
        isCorrect: null,
        status,
        pointsAwarded: 0,
        requiresManualCheck: true,
      };
    }
  });

  // --- LATE PENALTY LOGIC START ---
  let penaltyApplied = 0;
  const diffInMs = now - finalDueDate;
  const daysLate = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

  if (status === "after due date" && assessment.lateSubmissionPolicy?.enabled) {
    const { strategy, deductionType, deductionValue } = assessment.lateSubmissionPolicy;

    let deductionPerUnit = 0;
    if (deductionType === "points") {
      deductionPerUnit = deductionValue;
    } else {
      // Percentage based on max possible marks
      deductionPerUnit = (maxScore * (deductionValue / 100));
    }

    if (strategy === "daily") {
      penaltyApplied = deductionPerUnit * daysLate;
    } else {
      // One-time deduction
      penaltyApplied = deductionPerUnit * daysLate;
    }

    totalScore = Math.max(0, totalScore - penaltyApplied);
  }

  const graded = processedAnswers.every((a) => !a.requiresManualCheck);

  const submission = new Submission({
    assessment: assessmentId,
    studentId,
    answers: processedAnswers,
    status,
    totalScore,
    latePenaltyApplied: penaltyApplied, // Optional: track deduction in DB
    graded,
    allowResubmission: assessment.allowResubmission || false,
    resubmitted: { status: resubmission, count: submissionCount },
  });

  await submission.save();

  await updateGradebookOnSubmission(
    submission.studentId,
    assessment.course,
    submission.assessment,
    "assessment",
  );

  // Mark course as fully completed if this was a final assessment
  if (assessment.type === "final-assessment") {
    await CourseProgress.findOneAndUpdate(
      { studentId, courseId: assessment.course },
      {
        $set: {
          isCompleted: true,
          completedAt: new Date(),
          finalAssessmentId: assessment._id,
        },
      },
      { upsert: true, new: true },
    );
  }

  // ✅ Send email if the entire assessment was auto-graded
  if (graded) {
    const student = await User.findById(studentId);

    if (student && student.email) {
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
        from: `"${process.env.MAIL_FROM_NAME || "Assessment System"}" <${process.env.MAIL_USER}>`,
        to: student.email,
        subject: `Assessment Submitted: ${assessment.title}`,
        html: `
  <div style="font-family: Arial, sans-serif; background-color: #f4f7fb; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
      
      <div style="text-align: center; padding: 20px; background: #ffffff;">
        <img src="https://lirp.cdn-website.com/6602115c/dms3rep/multi/opt/acewall+scholars-431w.png" 
             alt="Acewall Scholars Logo" 
             style="height: 60px; margin: 0 auto;" />
      </div>

      <div style="background: #28a745; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Assessment Result</h1>
      </div>

      <div style="padding: 20px; color: #333;">
        <p style="font-size: 16px;">Hi ${student.firstName + " " + student.lastName || "Student"},</p>
        <p style="font-size: 16px;">You have successfully submitted your assessment titled <strong>${assessment.title}</strong>.</p>
        <p style="font-size: 16px;"><strong>Status:</strong> ${status}</p>
        ${penaltyApplied > 0 ? `<p style="font-size: 16px; color: red;"><strong>Late Penalty:</strong> -${penaltyApplied.toFixed(2)} marks applied.</p>` : ''}
        <p style="font-size: 16px;"><strong>Total Score:</strong> ${totalScore}/${maxScore}</p>
        <p style="font-size: 16px;">Thank you!</p>
      </div>

      <div style="background: #f0f4f8; color: #555; text-align: center; padding: 15px; font-size: 12px;">
        <p style="margin: 0;">Acewall Scholars © ${new Date().getFullYear()}</p>
        <p style="margin: 0;">If you have any query contact us on same email</p>
      </div>
    </div>
  </div>
  `,
      };

      try {
        await transporter.sendMail(mailOptions);
      } catch (emailErr) {
        console.error("Error sending email:", emailErr);
        // Do not fail the request due to email failure
      }
    }

    // Send in-app notification for auto-graded assessment
    await notifyGradePosted(
      studentId,
      assessment.title,
      totalScore,
      maxScore,
      assessment.course,

    );
  }

  return res.status(201).json({
    submission,
    message: "Submission recorded successfully",
  });
});

export const getSubmissionsforStudent = asyncHandler(async (req, res) => {
  const submissions = await Submission.find({
    studentId: req.params.studentId,
  })
    .populate("assessment")
    .sort({ submittedAt: -1 });

  res.json(submissions);
});

export const getSubmissionforAssessmentbyId = asyncHandler(async (req, res) => {
  const studentId = req.user._id;
  const { assessmentId } = req.params;
  const submission = await Submission.findOne({
    studentId,
    assessment: assessmentId,
  });

  return res.status(200).json({
    submission,
    message: "Submission found",
  });
});

export const getSubmissionById = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;

  const submission = await Submission.findById(submissionId).populate({
    path: "studentId",
    select: "firstName lastName email profileImg",
  });

  const assessment = await Assessment.findById(submission.assessment);

  const questionMap = {};
  assessment.questions.forEach((q) => {
    questionMap[q._id.toString()] = {
      question: q.question,
      file: q.files,
      type: q.type,
      points: q.points,
    };
  });

  const answersWithDetails = submission.answers.map((ans) => ({
    ...ans.toObject(),
    questionDetails: questionMap[ans.questionId],
  }));

  return res.status(200).json({
    submission: {
      ...submission.toObject(),
      answers: answersWithDetails,
    },
    message: "Submission found",
  });
});

export const getSubmissionsofAssessment_forTeacher = asyncHandler(
  async (req, res) => {
    const { assessmentId } = req.params;

    const submissions = await Submission.find({
      assessment: assessmentId,
    }).populate({
      path: "studentId",
      select: "firstName lastName email profileImg",
    });

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      throw new NotFoundError("Assessment not found", "SUB_004");
    }

    const questionMap = {};
    assessment.questions.forEach((q) => {
      questionMap[q._id.toString()] = {
        question: q.question,
        type: q.type,
        points: q.points,
      };
    });

    const submissionsWithDetails = submissions.map((sub) => {
      const answersWithDetails = sub.answers.map((ans) => ({
        ...ans.toObject(),
        questionDetails: questionMap[ans.questionId],
      }));
      return {
        ...sub.toObject(),
        answers: answersWithDetails,
      };
    });

    return res.status(200).json({
      submissions: submissionsWithDetails,
      message: "Submissions found",
    });
  },
);

export const teacherGrading = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;
  const manualGrades = req.body;

  // ✅ Populate studentId from User model
  const submission =
    await Submission.findById(submissionId).populate("studentId");

  const assessment = await Assessment.findById(submission.assessment);

  if (!submission) {
    throw new NotFoundError("Submission not found", "SUB_005");
  }
  let allcourseMaxPoint = 0;

  // Grade each manually graded question
  for (const questionId in manualGrades) {
    const { awardedPoints, maxPoints } = manualGrades[questionId];
    allcourseMaxPoint += maxPoints;

    if (awardedPoints > maxPoints) {
      throw new ValidationError(
        `Points for question ${questionId} can't exceed max points.`,
        "SUB_006",
      );
    } else if (awardedPoints < 0) {
      throw new ValidationError(
        `Points for question ${questionId} can't be negative.`,
        "SUB_007",
      );
    }

    const isCorrect = awardedPoints >= maxPoints / 2;

    const answer = submission.answers.find(
      (a) => String(a.questionId) === questionId
    );

    if (answer) {
      answer.pointsAwarded = awardedPoints;
      answer.isCorrect = isCorrect;
      submission.totalScore += awardedPoints;
      answer.requiresManualCheck = false;
    }
  }

  submission.graded = true;
  await submission.save();

  if (submission.graded) {
    await updateGradebookOnSubmission(
      submission.studentId,
      assessment.course,
      submission.assessment,
      "assessment"
    );
  }

  // Send in-app notification for manual grading
  await notifyGradePosted(
    submission.studentId._id,
    assessment.title,
    submission.totalScore,
    allcourseMaxPoint,
    assessment.course,
  );

  // ✅ Send email only if the user has an email
  const student = submission.studentId;
  if (student?.email) {
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
      from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_USER}>`,
      to: student.email,
      subject: "Your Assessment Has Been Graded",
      html: `
  <div style="font-family: Arial, sans-serif; background-color: #f4f7fb; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
      
      <!-- Logo -->
      <div style="text-align: center; padding: 20px; background: #ffffff;">
        <img src="https://lirp.cdn-website.com/6602115c/dms3rep/multi/opt/acewall+scholars-431w.png" 
             alt="Acewall Scholars Logo" 
             style="height: 60px; margin: 0 auto;" />
      </div>

      <!-- Header -->
      <div style="background: #28a745; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Manual Grading Complete</h1>
      </div>

      <!-- Body -->
      <div style="padding: 20px; color: #333;">
        <p style="font-size: 16px;">Hi ${student.firstName + " " + student.lastName || "Student"},</p>
        <p style="font-size: 16px;">Your teacher has reviewed your written answers and completed grading your assessment.</p>
        <p style="font-size: 16px;"><strong>Total Score:</strong> ${submission.totalScore} / ${allcourseMaxPoint}</p>
        <p style="font-size: 16px;">You can now view your full results in your student portal.</p>
      </div>

      <!-- Footer -->
      <div style="background: #f0f4f8; color: #555; text-align: center; padding: 15px; font-size: 12px;">
        <p style="margin: 0;">Acewall Scholars © ${new Date().getFullYear()}</p>
        <p style="margin: 0;">If you have any query contact us on same email</p>
      </div>
    </div>
  </div>
  `,
    };


    await transporter.sendMail(mailOptions);
  }

  return res.status(200).json({
    submission,
    message: "Submission graded",
  });
});