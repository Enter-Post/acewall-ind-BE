import mongoose from "mongoose";
import { uploadToCloudinary } from "../lib/cloudinary-course.config.js";
import Assessment from "../Models/Assessment.model.js";
import Lesson from "../Models/lesson.model.sch.js";
import Chapter from "../Models/chapter.model.sch.js";
import { ObjectId } from "bson"; // Import ObjectId
import Enrollment from "../Models/Enrollement.model.js";
import e from "express";
import Submission from "../Models/submission.model.js";

export const createAssessment = async (req, res) => {
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

  try {
    const parsedQuestions = JSON.parse(questions || "[]");

    // ✅ Optional: Manual validation if questions exist
    if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
      for (const [index, q] of parsedQuestions.entries()) {
        if (!q.type || !["mcq", "truefalse", "qa"].includes(q.type)) {
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

export const deleteAssessment = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedAssessment = await Assessment.findByIdAndDelete(id);
    if (!deletedAssessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }
    res.status(200).json({ message: "Assessment deleted successfully" });
  } catch (error) {
    console.error("Error deleting assessment:", error.message);
    res.status(500).json({ messages: "Some thing went wrong" });
  }
};

export const uploadFiles = async (req, res) => {
  const files = req.files;
  const { id } = req.params;

  const assessment = await Assessment.findById(id);
  if (!assessment) {
    return res.status(404).json({ message: "Assessment not found" });
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

    res.status(200).json({ message: "Files uploaded successfully" });
  }
};

export const deleteFile = async (req, res) => {
  const { assessmentId, fileId } = req.params;

  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) {
    return res.status(404).json({ message: "Assessment not found" });
  }

  const fileIndex = assessment.files.findIndex(
    (file) => file._id.toString() === fileId
  );
  if (fileIndex === -1) {
    return res.status(404).json({ message: "File not found" });
  }

  const file = assessment.files[fileIndex];
  console.log(file, "file");

  try {
    await uploadToCloudinary(file.url, "assessment_files", "delete");
    assessment.files.splice(fileIndex, 1);
    await assessment.save();

    return res.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    return res.status(500).json({ message: "Error deleting file" });
  }
};

export const getAssesmentbyID = async (req, res) => {
  const { assessmentId } = req.params;
  const validObjectId = new mongoose.Types.ObjectId(assessmentId);

  console.log(assessmentId, validObjectId);
  try {
    const assessment = await Assessment.findById(validObjectId);

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    res.status(200).json({ message: "Assessment found", assessment });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const allAssessmentByTeacher = async (req, res) => {
  const createdby = req.user._id;

  try {
    if (!createdby) {
      return res.status(401).json({ error: "Unauthorized. User ID missing." });
    }

    const assessments = await Assessment.find({ createdby })
      .select(
        "dueDate title description course chapter lesson createdAt category type"
      )
      .populate({ path: "course", select: "courseTitle" })
      .populate({ path: "chapter", select: "title" })
      .populate({ path: "lesson", select: "title" })
      .populate({ path: "category", select: "name" });

    console.log(assessments, "assessment");

    res.status(200).json(assessments);
  } catch (err) {
    console.error("Error fetching assessments by teacher:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getAllassessmentforStudent = async (req, res) => {
  const studentId = req.user._id;

  try {
    // 1. Get all enrollments for the student
    const allEnrollmentofStudent = await Enrollment.find({
      student: studentId,
    });

    // 2. Extract course IDs from enrollments
    const courseIds = allEnrollmentofStudent.map(
      (enrollment) => new mongoose.Types.ObjectId(enrollment.course)
    );

    // Optional log for debugging
    console.log("Course IDs:", courseIds);

    // 3. Aggregate assessments for those courses
    const assessments = await Assessment.aggregate([
      {
        $match: {
          course: { $in: courseIds },
        },
      },
      // Join with course
      {
        $lookup: {
          from: "coursesches",
          localField: "course",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: { path: "$course", preserveNullAndEmptyArrays: true } },

      // Join with chapter
      {
        $lookup: {
          from: "chapters",
          localField: "chapter",
          foreignField: "_id",
          as: "chapter",
        },
      },
      { $unwind: { path: "$chapter", preserveNullAndEmptyArrays: true } },

      // Join with lesson
      {
        $lookup: {
          from: "lessons",
          localField: "lesson",
          foreignField: "_id",
          as: "lesson",
        },
      },
      { $unwind: { path: "$lesson", preserveNullAndEmptyArrays: true } },

      // Check if the student submitted the assessment
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
                    {
                      $eq: [
                        "$studentId",
                        new mongoose.Types.ObjectId(studentId),
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: "submissions",
        },
      },

      // Add submission status
      {
        $addFields: {
          isSubmitted: { $gt: [{ $size: "$submissions" }, 0] },
        },
      },

      // Shape final output
      {
        $project: {
          _id: 1,
          type: 1,
          title: 1,
          description: 1,
          dueDate: 1,
          createdAt: 1,
          isSubmitted: 1,
          "course._id": 1,
          "course.courseTitle": 1,
          "chapter._id": 1,
          "chapter.title": 1,
          "lesson._id": 1,
          "lesson.title": 1,
        },
      },

      // Optional: sort submitted first
      {
        $sort: {
          isSubmitted: 1,
          dueDate: 1,
        },
      },
    ]);

    // 4. Return the response
    res.status(200).json(assessments);
  } catch (err) {
    console.error("Error fetching assessments for student:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


export const editAssessmentInfo = async (req, res) => {
  const { assessmentId } = req.params;
  const { title, description, category, dueDate } = req.body;

  try {
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(400).json({ message: "Assessment not found" });
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

    assessment.save();
    res.status(200).json({ message: "Assessment updated successfully" });
  } catch (error) {
    console.log("error in the edit Assessment Info", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};