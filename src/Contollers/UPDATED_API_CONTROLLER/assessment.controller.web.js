import mongoose from "mongoose";
import { uploadToCloudinary } from "../../lib/cloudinary-course.config.js";
import Chapter from "../../Models/chapter.model.sch.js";
import Lesson from "../../Models/lesson.model.sch.js";
import Assessment from "../../Models/Assessment.model.js";
import Course from "../../Models/courses.model.sch.js";
import { asyncHandler } from "../../middlewares/errorHandler.middleware.js";
import { ValidationError, NotFoundError } from "../../Utiles/errors.js";
import { notifyAssessmentAssigned } from "../../Utiles/notificationService.js";

export const createAssessment_updated = asyncHandler(async (req, res) => {
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
    assessmentType,
    type: requestType,
  } = req.body;

  const files = req.files;
  const createdby = req.user._id;

  const parsedQuestions = JSON.parse(questions || "[]");

  // Process each question to handle files
  for (let questionIndex = 0; questionIndex < parsedQuestions.length; questionIndex++) {
    const question = parsedQuestions[questionIndex];
    if (question.type !== "file") continue;

    const questionFiles = [];

    // Handle local files uploaded via multer
    const localFiles = files.filter(f => f.fieldname.startsWith(`question_${questionIndex}_file_`));
    for (const file of localFiles) {
      const result = await uploadToCloudinary(file.buffer, "assessment_files");
      questionFiles.push({
        url: result.secure_url,
        publicId: result.public_id,
        filename: file.originalname,
      });
    }

    // Handle Google Drive files
    const driveFiles = [];
    Object.keys(req.body).forEach(key => {
      if (key.startsWith(`question_${questionIndex}_driveFile_`)) {
        try {
          const driveFile = JSON.parse(req.body[key]);
          driveFiles.push({
            url: driveFile.url || driveFile.secure_url,
            publicId: driveFile.publicId || driveFile.public_id,
            filename: driveFile.filename || driveFile.name,
          });
        } catch (e) {
          console.error("Error parsing drive file:", e);
        }
      }
    });

    // Combine local and drive files
    question.files = [...questionFiles, ...driveFiles];
  }

  if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
    for (const [index, q] of parsedQuestions.entries()) {
      if (!q.type || !["mcq", "truefalse", "qa", "file"].includes(q.type)) {
        throw new ValidationError(
          `Invalid question type at index ${index}`,
          "ASSW_001",
        );
      }

      if (!q.question || q.question.length < 5) {
        throw new ValidationError(
          `Question ${index + 1} must be at least 5 characters`,
          "ASSW_002",
        );
      }

      if (typeof q.points !== "number" || q.points < 1 || q.points > 999) {
        throw new ValidationError(
          `Invalid points in question ${index + 1}`,
          "ASSW_003",
        );
      }

      if (q.type === "mcq") {
        if (
          !Array.isArray(q.options) ||
          q.options.length < 2 ||
          q.options.length > 4
        ) {
          throw new ValidationError(
            `Question ${index + 1} must have 2–4 options`,
            "ASSW_004",
          );
        }
        if (!q.correctAnswer || typeof q.correctAnswer !== "string") {
          throw new ValidationError(
            `Correct answer is required for question ${index + 1}`,
            "ASSW_005",
          );
        }
      }

      if (q.type === "truefalse") {
        if (!["true", "false"].includes(q.correctAnswer)) {
          throw new ValidationError(
            `Correct answer must be true/false in question ${index + 1}`,
            "ASSW_006",
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
    if (!foundChapter) {
      throw new NotFoundError("Chapter not found", "ASSW_007");
    }
    finalCourse = foundChapter.course;
  }

  if (lesson && !chapter) {
    const foundLesson = await Lesson.findById(lesson).populate("chapter");
    if (!foundLesson) {
      throw new NotFoundError("Lesson not found", "ASSW_008");
    }

    if (!foundLesson.chapter) {
      throw new ValidationError("Lesson has no associated chapter", "ASSW_009");
    }
    finalChapter = foundLesson.chapter._id;

    const foundChapter = await Chapter.findById(finalChapter);
    if (!foundChapter) {
      throw new NotFoundError("Associated chapter not found", "ASSW_010");
    }
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
    if (requestType) return requestType;
    if (lesson) return "lesson-assessment";
    if (chapter) return "chapter-assessment";
    if (course) return "final-assessment";
    return null;
  };

  const type = determineType();
  if (!type) {
    throw new ValidationError(
      "Assessment type could not be determined",
      "ASSW_011",
    );
  }

  if (type === "final-assessment") {
    const existingFinal = await Assessment.findOne({
      course: finalCourse,
      type: "final-assessment",
    });
    if (existingFinal) {
      throw new ValidationError(
        "Final assessment already exists for this course.",
        "ASSW_014",
      );
    }
  }

  const finSem = semester !== "undefined" ? semester : null;
  const finQtr = quarter !== "undefined" ? quarter : null;

  // ✅ Save to DB
  const newAssessment = new Assessment({
    title,
    description,
    course: finalCourse,
    chapter: finalChapter,
    lesson,
    category,
    type,
    semester : finSem,
    quarter : finQtr,
    questions: parsedQuestions,
    dueDate: dueDateObj,
    files: uploadedFiles,
    createdby,
    assessmentType,
  });

  await newAssessment.save();

  // Send notification to enrolled students
  try {
    const courseData = await Course.findById(finalCourse);
    if (courseData) {
      await notifyAssessmentAssigned(
        finalCourse,
        courseData.courseTitle,
        title,
        createdby,
      );
    }
  } catch (error) {
    console.error("❌ Assessment notification error:", error.message);
  }

  return res.status(201).json({
    assessment: newAssessment,
    message: "Assessment created successfully",
  });
});
