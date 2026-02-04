import mongoose from "mongoose";
import Discussion from "../../Models/discussion.model.js";
import DiscussionComment from "../../Models/discussionComment.model.js";
import { uploadToCloudinary } from "../../lib/cloudinary-course.config.js";
import Enrollment from "../../Models/Enrollement.model.js";
import {
  ValidationError,
  NotFoundError,
} from "../../Utiles/errors.js";
import { asyncHandler } from "../../middlewares/errorHandler.middleware.js";

export const createDiscussion = asyncHandler(async (req, res) => {
  const {
    topic,
    description,
    course,
    type,
    totalMarks,
    dueDate,
    chapter,
    lesson,
    category,
    semester,
    quarter
  } = req.body;
  const files = req.files;
  const createdby = req.user._id;

  console.log(req.body, "req.body");

  let uploadedFiles = [];

  if (files && files.length > 0) {
    for (const file of files) {
      const result = await uploadToCloudinary(file.buffer, "discussion_files");

      uploadedFiles.push({
        url: result.secure_url,
        publicId: result.public_id,
        type: file.mimetype,
        filename: file.originalname,
      });
    }
  }

  const parsedDueDate = JSON.parse(dueDate);

  const dueDateObject = {
    date: new Date(parsedDueDate.dateTime).toISOString().split("T")[0],
    time: new Date(parsedDueDate.dateTime).toLocaleTimeString([], {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  const discussion = new Discussion({
    topic,
    description,
    course,
    type,
    files: uploadedFiles,
    createdby,
    totalMarks,
    dueDate: dueDateObject,
    chapter,
    lesson,
    category,
    semester,
    quarter
  });

  await discussion.save();
  return res
    .status(201)
    .json({ 
      success: true,
      message: "Discussion created successfully", 
      data: discussion 
    });
});

export const getDiscussionsOfTeacher = asyncHandler(async (req, res) => {
  const teacherId = req.user._id;
  
  const discussion = await Discussion.find({
    createdby: teacherId,
  }).populate({
    path: "course",
    select: "courseTitle thumbnail",
  });

  return res
    .status(200)
    .json({ 
      success: true,
      message: "Discussions fetched successfully here", 
      data: discussion 
    });
});


export const getDiscussionbyId = asyncHandler(async (req, res) => {
  const id = req.params.id;
  
  const discussion = await Discussion.findById(id)
    .populate("course", "courseTitle thumbnail")
    .populate("chapter", "title")
    .populate("lesson", "title")
    .populate("createdby", "firstName middleName lastName profileImg");
  
  if (!discussion) {
    throw new NotFoundError("Discussion not found", "DISC_001");
  }
  
  return res
    .status(200)
    .json({ 
      success: true,
      message: "Discussion fetched successfully", 
      data: discussion 
    });
});

export const discussionforStudent = asyncHandler(async (req, res) => {
  let userId = req.user._id;
  
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ValidationError("Invalid user ID", "DISC_002");
  }

  userId = new mongoose.Types.ObjectId(userId);

  const studentEnrollment = await Enrollment.find({ student: userId });
  const allEnrolledCourseIds = studentEnrollment.map((enr) => enr.course);

  const discussions = await Discussion.find({
    $or: [
      { course: { $in: allEnrolledCourseIds } },
      { type: "public" } // keep public included in the same list
    ]
  })
    .populate("course", "courseTitle thumbnail")
    .populate("category", "title")
    .populate("chapter", "title")
    .populate("lesson", "title")
    .populate("createdby", "firstName middleName lastName profileImg")
    .select("-files");

  return res.status(200).json({
    success: true,
    message: "Discussions fetched successfully",
    data: {
      discussionCount: discussions.length,
      discussions
    }
  });
});


export const chapterDiscussions = asyncHandler(async (req, res) => {
  const { chapterId } = req.params;
  
  const discussion = await Discussion.find({ chapter: chapterId }).populate("course", "courseTitle thumbnail");
  if (!discussion || discussion.length === 0) {
    throw new NotFoundError("No discussions found for this chapter", "DISC_003");
  }
  return res.status(200).json({ 
    success: true,
    message: "Discussions fetched successfully", 
    data: discussion 
  });
});

export const lessonDiscussions = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  
  const discussion = await Discussion.find({ lesson: lessonId }).populate("course", "courseTitle thumbnail");
  if (!discussion || discussion.length === 0) {
    throw new NotFoundError("No discussions found for this lesson", "DISC_004");
  }
  return res.status(200).json({ 
    success: true,
    message: "Discussions fetched successfully", 
    data: discussion 
  });
});

export const courseDiscussions = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  
  const discussion = await Discussion.find({ course: courseId }).populate("course", "courseTitle thumbnail");
  if (!discussion || discussion.length === 0) {
    throw new NotFoundError("No discussions found for this course", "DISC_005");
  }
  return res.status(200).json({ 
    success: true,
    message: "Discussions fetched successfully", 
    data: discussion 
  });
});

