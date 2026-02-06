import mongoose from "mongoose";
import { uploadToCloudinary } from "../../lib/cloudinary-course.config.js";
import Chapter from "../../Models/chapter.model.sch.js";
import Lesson from "../../Models/lesson.model.sch.js";
import Assessment from "../../Models/Assessment.model.js";
import { asyncHandler } from "../../middlewares/errorHandler.middleware.js";
import { ValidationError, NotFoundError } from "../../Utiles/errors.js";


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
  } = req.body;

  const files = req.files;
  const createdby = req.user._id;

  const parsedQuestions = JSON.parse(questions || "[]");

    const questionFiles = [];

    for (const file of files) {
      const result = await uploadToCloudinary(file.buffer, "assessment_files");
      questionFiles.push({
        url: result.secure_url,
        publicId: result.public_id,
        filename: file.originalname,
      });
    }

    parsedQuestions[0].files = questionFiles;

    if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
      for (const [index, q] of parsedQuestions.entries()) {
        if (!q.type || !["mcq", "truefalse", "qa", "file"].includes(q.type)) {
          throw new ValidationError(
            `Invalid question type at index ${index}`,
            "ASSW_001"
          );
        }

        if (!q.question || q.question.length < 5) {
          throw new ValidationError(
            `Question ${index + 1} must be at least 5 characters`,
            "ASSW_002"
          );
        }

        if (typeof q.points !== "number" || q.points < 1 || q.points > 999) {
          throw new ValidationError(
            `Invalid points in question ${index + 1}`,
            "ASSW_003"
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
              "ASSW_004"
            );
          }
          if (!q.correctAnswer || typeof q.correctAnswer !== "string") {
            throw new ValidationError(
              `Correct answer is required for question ${index + 1}`,
              "ASSW_005"
            );
          }
        }

        if (q.type === "truefalse") {
          if (!["true", "false"].includes(q.correctAnswer)) {
            throw new ValidationError(
              `Correct answer must be true/false in question ${index + 1}`,
              "ASSW_006"
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
        throw new ValidationError(
          "Lesson has no associated chapter",
          "ASSW_009"
        );
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
      if (lesson) return "lesson-assessment";
      if (chapter) return "chapter-assessment";
      if (course) return "final-assessment";
      return null;
    };

    const type = determineType();
    if (!type) {
      throw new ValidationError(
        "Assessment type could not be determined",
        "ASSW_011"
      );
    }

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
      assessmentType,
    });

    await newAssessment.save();

    return res.status(201).json({
      assessment: newAssessment,
      message: "Assessment created successfully"
    });
});