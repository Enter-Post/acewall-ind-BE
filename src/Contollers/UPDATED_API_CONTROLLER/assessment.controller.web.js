import mongoose from "mongoose";
import { uploadToCloudinary } from "../../lib/cloudinary-course.config.js";
import Chapter from "../../Models/chapter.model.sch.js";
import Lesson from "../../Models/lesson.model.sch.js";
import Assessment from "../../Models/Assessment.model.js";


export const createAssessment_updated = async (req, res) => {
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

  try {
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
          throw new Error(`Invalid question type at index ${index}`);
        }

        if (!q.question || q.question.length < 5) {
          throw new Error(
            `Question ${index + 1} must be at least 5 characters`
          );
        }

        if (typeof q.points !== "number" || q.points < 1 || q.points > 999) {
          throw new Error(`Invalid points in question ${index + 1}`);
        }

        if (q.type === "mcq") {
          if (
            !Array.isArray(q.options) ||
            q.options.length < 2 ||
            q.options.length > 4
          ) {
            throw new Error(`Question ${index + 1} must have 2–4 options`);
          }
          if (!q.correctAnswer || typeof q.correctAnswer !== "string") {
            throw new Error(
              `Correct answer is required for question ${index + 1}`
            );
          }
        }

        if (q.type === "truefalse") {
          if (!["true", "false"].includes(q.correctAnswer)) {
            throw new Error(
              `Correct answer must be true/false in question ${index + 1}`
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
      if (!foundChapter) throw new Error("Chapter not found");
      finalCourse = foundChapter.course;
    }

    if (lesson && !chapter) {
      const foundLesson = await Lesson.findById(lesson).populate("chapter");
      if (!foundLesson) throw new Error("Lesson not found");

      if (!foundLesson.chapter)
        throw new Error("Lesson has no associated chapter");
      finalChapter = foundLesson.chapter._id;

      const foundChapter = await Chapter.findById(finalChapter);
      if (!foundChapter) throw new Error("Associated chapter not found");
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
    if (!type) throw new Error("Assessment type could not be determined");

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

    res.status(201).json({
      message: "Assessment created successfully",
      assessment: newAssessment,
    });
  } catch (error) {
    console.error("Error creating assessment:", error.message);
    res.status(400).json({ error: error.message });
  }
};