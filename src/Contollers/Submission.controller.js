import mongoose from "mongoose";
import Assessment from "../Models/Assessment.model.js";
import Submission from "../Models/submission.model.js";

import nodemailer from "nodemailer";
import dotenv from "dotenv";
import User from "../Models/user.model.js";
import { uploadToCloudinary } from "../lib/cloudinary-course.config.js";
import { updateGradebookOnSubmission } from "../Utiles/updateGradebookOnSubmission.js";

dotenv.config();

export const submission = async (req, res) => {
  const studentId = req.user._id;
  const { assessmentId } = req.params;
  const answers = req.body;
  const files = req.files;

  let finalQuestionsubmitted;

  try {
    const alreadySubmitted = await Submission.findOne({
      studentId,
      assessment: assessmentId,
    });

    if (alreadySubmitted) {
      return res.status(400).json({
        message: "You have already submitted this assessment",
      });
    }

    const assessment = await Assessment.findById(assessmentId);

    let answerFiles = [];

    for (const file of files) {
      const result = await uploadToCloudinary(file.buffer, "assessment_files");
      answerFiles.push({
        url: result.secure_url,
        filename: file.originalname,
        public_id: result.public_id,
      });
    }

    if (assessment.assessmentType === "file") {
      finalQuestionsubmitted = [answers];
    } else {
      finalQuestionsubmitted = answers.answers;
    }

    if (!assessment)
      return res.status(404).json({ message: "Assessment not found" });

    let totalScore = 0;
    let maxScore = 0;

    const dueDate = new Date(assessment.dueDate.date)
      .toISOString()
      .split("T")[0];
    const dueTime = assessment.dueDate.time;
    const dueDateTime = new Date(`${dueDate}T${dueTime}`);
    const now = new Date();

    let status = "before due date";
    if (now > dueDateTime) {
      status = "after due date";
    }

    const processedAnswers = finalQuestionsubmitted.map((ans) => {
      const question = assessment.questions.find(
        (q) => q._id.toString() === ans.questionId
      );

      if (!question) {
        throw new Error("Invalid questionId in submission.");
      }

      if (question.type === "mcq" || question.type === "truefalse") {
        const isCorrect = question.correctAnswer === ans.selectedAnswer;
        const pointsAwarded = isCorrect ? question.points : 0;
        totalScore += pointsAwarded;

        maxScore += question.points;

        console.log(isCorrect, "isCorrect");

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


    const graded = processedAnswers.every((a) => !a.requiresManualCheck);

    const submission = new Submission({
      assessment: assessmentId,
      studentId,
      answers: processedAnswers,
      status,
      totalScore,
      graded,
    });

    await submission.save();

    await updateGradebookOnSubmission(
      submission.studentId,
      assessment.course,
      submission.assessment,
      "assessment"
    );

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
      
      <!-- Logo -->
      <div style="text-align: center; padding: 20px; background: #ffffff;">
        <img src="https://lirp.cdn-website.com/6602115c/dms3rep/multi/opt/acewall+scholars-431w.png" 
             alt="Acewall Scholars Logo" 
             style="height: 60px; margin: 0 auto;" />
      </div>

      <!-- Header -->
      <div style="background: #28a745; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Assessment Result</h1>
      </div>

      <!-- Body -->
      <div style="padding: 20px; color: #333;">
        <p style="font-size: 16px;">Hi ${student.firstName + " " + student.lastName || "Student"},</p>
        <p style="font-size: 16px;">You have successfully submitted your assessment titled <strong>${assessment.title}</strong>.</p>
        <p style="font-size: 16px;"><strong>Status:</strong> ${status}</p>
        <p style="font-size: 16px;"><strong>Total Score:</strong> ${totalScore}/${maxScore}</p>
        <p style="font-size: 16px;">Thank you!</p>
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


        try {
          await transporter.sendMail(mailOptions);
        } catch (emailErr) {
          console.error("Error sending email:", emailErr);
          // Do not fail the request due to email failure
        }
      }
    }

    res.status(201).json({
      message: "Submission recorded successfully",
      submission,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Error submitting assessment", error: err.message });
  }
};

export const getSubmissionsforStudent = async (req, res) => {
  try {
    const submissions = await Submission.find({
      studentId: req.params.studentId,
    })
      .populate("assessment")
      .sort({ submittedAt: -1 });

    res.json(submissions);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching submissions", error: err.message });
  }
};

export const getSubmissionforAssessmentbyId = async (req, res) => {
  const studentId = req.user._id;
  const { assessmentId } = req.params;
  try {
    const submission = await Submission.findOne({
      studentId,
      assessment: assessmentId,
    });

    res.status(200).json({ message: "Submission found", submission });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching submission", error: err.message });
  }
};

export const getSubmissionById = async (req, res) => {
  const { submissionId } = req.params;

  try {
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

    res.status(200).json({
      message: "Submission found",
      submission: {
        ...submission.toObject(),
        answers: answersWithDetails,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching submission", error: err.message });
  }
};

export const getSubmissionsofAssessment_forTeacher = async (req, res) => {
  const { assessmentId } = req.params;

  try {
    const submissions = await Submission.find({
      assessment: assessmentId,
    }).populate({
      path: "studentId",
      select: "firstName lastName email profileImg",
    });

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
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

    res.status(200).json({
      message: "Submissions found",
      submissions: submissionsWithDetails,
    });
  } catch (err) {
    console.log("error in getting submission", err);
    res
      .status(500)
      .json({ message: "Error fetching submission", error: err.message });
  }
};

// export const checkbyTeacher = async (req, res) => {
//   try {
//     const { answers, feedback } = req.body;

//     const submission = await Submission.findById(req.params.id);
//     if (!submission)
//       return res.status(404).json({ message: "Submission not found" });

//     let totalScore = 0;

//     submission.answers = submission.answers.map((a) => {
//       const updated = answers.find(
//         (u) => u.questionId === a.questionId.toString()
//       );

//       if (a.requiresManualCheck && updated) {
//         a.pointsAwarded = updated.pointsAwarded;
//         a.isCorrect = undefined; // QA may not have a simple correct/incorrect
//         a.requiresManualCheck = false;
//       }

//       totalScore += a.pointsAwarded || 0;
//       return a;
//     });

//     submission.totalScore = totalScore;
//     submission.feedback = feedback || "";
//     submission.graded = true;
//     await submission.save();

//     res.json({ message: "Submission graded", submission });
//   } catch (err) {
//     res
//       .status(500)
//       .json({ message: "Error grading submission", error: err.message });
//   }
// };

export const teacherGrading = async (req, res) => {
  const { submissionId } = req.params;
  const manualGrades = req.body;

  try {
    // ✅ Populate studentId from User model
    const submission = await Submission.findById(submissionId).populate(
      "studentId"
    );

    const assessment = await Assessment.findById(submission.assessment);

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }
    let allcourseMaxPoint = 0;

    // Grade each manually graded question
    for (const questionId in manualGrades) {
      const { awardedPoints, maxPoints } = manualGrades[questionId];
      allcourseMaxPoint += maxPoints;

      if (awardedPoints > maxPoints) {
        return res.status(400).json({
          message: `Points for question ${questionId} can't exceed max points.`,
        });
      } else if (awardedPoints < 0) {
        return res.status(400).json({
          message: `Points for question ${questionId} can't be negative.`,
        });
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

    res.json({ message: "Submission graded", submission });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Error grading submission",
      error: err.message,
    });
  }
};

// export const TeachersAssessmentSubmissions = async (req, res) => {
//   const { submissionId } = req.params;
//   const { feedback, pointsAwarded } = req.body;
//   const { teacherId } = req.user._id;
//   try {
//     const submission = await Submission.findById(submissionId); // Assuming you have a Submission model
//     if (!submission) {
//       return res.status(404).json({ message: "Submission not found" });
//     }

//     submission.feedback = feedback;
//     submission.totalScore = pointsAwarded;
//     submission.graded = true;
//     await submission.save();

//     res.json({ message: "Submission graded", submission });
//   } catch (err) {
//     console.error(err);
//     res
//       .status(500)
//       .json({ message: "Error grading submission", error: err.message });
//   }
// };
