import Comment from "../Models/comment.model.js";
import CourseSch from "../Models/courses.model.sch.js";
import { login } from "./auth.controller.js";

export const getCourseComments = async (req, res) => {
  const { id } = req.params;

  try {
    const comments = await Comment.find({ course: id }).populate(
      "createdby",
      "firstName lastName profileImg role"
    );

    if (comments.length == 0) {
      return res.status(404).json({
        message: "No comment found",
      });
    }

    res.status(200).json({
      message: "Comments found successfully",
      comments,
    });
  } catch (error) {
    console.error("Error getting course comments:", error.message);
    res.status(500).json({ error: "Something went wrong" });
  }
};

export const sendComment = async (req, res) => {
  const { id } = req.params;
  const createdby = req.user._id;
  const { text } = req.body;

  try {
    const isExist = await CourseSch.findById(id);
    if (!isExist) {
      return res.status(404).json({
        message: "Course does not exist",
      });
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

    res.status(201).json({
      comment: populatedComment,
      message: "Comment added successfully",
    });
  } catch (error) {
    console.error("Error sending comment:", error.message);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

export const allCommentsofTeacher = async (req, res) => {
  const teacherId = req.user._id;
  try {
    const TeacherCourse = await CourseSch.find({ createdby: teacherId });

    if (TeacherCourse.length === 0) {
      return res
        .status(404)
        .json({ message: "No course found for this teacher" });
    }

    const courseIds = TeacherCourse.map((course) => course._id);

    const comments = await Comment.find({ 
      course: { $in: courseIds },
      createdby: { $ne: teacherId }
    })
    .sort({ createdAt: -1 })
    .populate("createdby", "firstName middleName lastName profileImg");

    if (comments.length === 0) {
      return res.status(404).json({ message: "No comments found" });
    }

    const recentComments = comments.slice(0, 5);

    res.status(200).json({
      recentComments,
    });
  } catch (error) {
    console.error("Error getting comments:", error.message);
    res.status(500).json({ error: "Something went wrong" });
  }
};





export const deleteComment = async (req, res) => {
  const { courseId, commentId } = req.params;

  try {
    // Check if the comment exists
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if the comment belongs to the user
    if (comment.createdby.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized to delete this comment" });
    }

    // Remove the comment
    await Comment.findByIdAndDelete(commentId);

    // Optionally, remove comment reference from the course
    await CourseSch.findByIdAndUpdate(courseId, {
      $pull: { comment: commentId },
    });

    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error.message);
    res.status(500).json({ error: "Something went wrong" });
  }
};
