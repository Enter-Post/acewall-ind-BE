import Comment from "../Models/comment.model.js";
import CourseSch from "../Models/courses.model.sch.js";
import { login } from "./auth.controller.js";
import {
  ValidationError,
  NotFoundError,
  AuthenticationError,
} from "../Utiles/errors.js";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";

export const getCourseComments = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const comments = await Comment.find({ course: id }).populate(
    "createdby",
    "firstName lastName profileImg role"
  );

  if (comments.length == 0) {
    throw new NotFoundError("No comment found", "CMT_001");
  }

  return res.status(200).json({
    success: true,
    message: "Comments found successfully",
    data: comments,
  });
});

export const sendComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const createdby = req.user._id;
  const { text } = req.body;

  const isExist = await CourseSch.findById(id);
  if (!isExist) {
    throw new NotFoundError("Course does not exist", "CMT_002");
  }

    const newComment = new Comment({
      text,
      createdby,
      course: id,
    });

    await newComment.save();

    // Populate the createdby field with full user details
    const populatedComment = await Comment.findById(newComment._id).populate(
      "createdby",
      "firstName lastName profileImg"
    );

    // Add comment ID to course
    await CourseSch.findByIdAndUpdate(
      id,
      { $push: { comment: newComment._id } },
      { new: true }
    );

  return res.status(201).json({
    success: true,
    comment: populatedComment,
    message: "Comment added successfully",
  });
});

export const allCommentsofTeacher = asyncHandler(async (req, res) => {
  const teacherId = req.user._id;
  const TeacherCourse = await CourseSch.find({ createdby: teacherId });

  if (TeacherCourse.length === 0) {
    throw new NotFoundError("No course found for this teacher", "CMT_003");
  }

    const courseIds = TeacherCourse.map((course) => course._id);

    const comments = await Comment.find({ 
      course: { $in: courseIds },
      createdby: { $ne: teacherId }
    })
    .sort({ createdAt: -1 })
    .populate("createdby", "firstName middleName lastName profileImg");

  if (comments.length === 0) {
    throw new NotFoundError("No comments found", "CMT_004");
  }

  const recentComments = comments.slice(0, 5);

  return res.status(200).json({
    success: true,
    data: recentComments,
  });
});





export const deleteComment = asyncHandler(async (req, res) => {
  const { courseId, commentId } = req.params;

  // Check if the comment exists
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new NotFoundError("Comment not found", "CMT_005");
  }

  // Check if the comment belongs to the user
  if (comment.createdby.toString() !== req.user._id.toString()) {
    throw new AuthenticationError("Unauthorized to delete this comment", "CMT_006");
  }

    // Remove the comment
    await Comment.findByIdAndDelete(commentId);

  // Optionally, remove comment reference from the course
  await CourseSch.findByIdAndUpdate(courseId, {
    $pull: { comment: commentId },
  });

  return res.status(200).json({ 
    success: true,
    message: "Comment deleted successfully" 
  });
});
