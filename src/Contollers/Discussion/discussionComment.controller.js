import Discussion from "../../Models/discussion.model.js";
import DiscussionComment from "../../Models/discussionComment.model.js";
import { updateGradebookOnSubmission } from "../../Utiles/updateGradebookOnSubmission.js";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from "../../Utiles/errors.js";
import { asyncHandler } from "../../middlewares/errorHandler.middleware.js";

export const getDiscussionComments = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 5 } = req.query; // Default to page 1, 5 comments per page

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const discussionComments = await DiscussionComment.find({
    discussion: id,
  })
    .populate("createdby", "profileImg firstName middleName lastName role")
    .sort({ createdAt: -1 }) // Most recent first
    .skip(skip)
    .limit(parseInt(limit));

  const totalComments = await DiscussionComment.countDocuments({
    discussion: id,
  });

  return res.status(200).json({
    success: true,
    message: "Comments fetched successfully",
    data: {
      discussionComments,
      totalPages: Math.ceil(totalComments / limit),
      currentPage: parseInt(page),
    }
  });
});

export const sendDiscussionComment = asyncHandler(async (req, res) => {
  const user = req.user;
  const { text } = req.body;
  const { id } = req.params;

  const isCommented = await DiscussionComment.findOne({
    createdby: user._id,
    discussion: id,
  });

  if (user.role !== "teacher" && isCommented) {
    throw new ConflictError("You have already commented on this discussion", "DCOM_001");
  }

  const newDiscussionComment = new DiscussionComment({
    text,
    role: user.role,
    createdby: user._id,
    discussion: id,
  });
  await newDiscussionComment.save();
  return res.status(200).json({
    success: true,
    message: "Comment sent successfully",
    data: newDiscussionComment,
  });
});

export const deleteComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const Comment = await DiscussionComment.findByIdAndDelete(id);

  if (!Comment) {
    throw new NotFoundError("Comment not found", "DCOM_002");
  }
  return res.status(200).json({ 
    success: true,
    message: "Comment deleted successfully" 
  });
});

export const gradeDiscussionofStd = asyncHandler(async (req, res) => {
  const { discID, discussionCommentId } = req.params;
  const { obtainedMarks } = req.body;

  const discussion = await Discussion.findById(discID);
  if (!discussion) {
    throw new NotFoundError("Discussion not found", "DCOM_003");
  }

  const discussionComment = await DiscussionComment.findById(discussionCommentId);
  if (!discussionComment) {
    throw new NotFoundError("Discussion comment not found", "DCOM_004");
  }

  // Step 1: Get the student who made the comment
  const studentId = discussionComment.createdby;

  // Step 2: Check if any of this student's comments in this discussion are already graded
  const alreadyGraded = await DiscussionComment.findOne({
    discussion: discID,
    createdby: studentId,
    isGraded: true,
  });

  if (alreadyGraded) {
    throw new ConflictError(
      "This student has already been graded for this discussion.",
      "DCOM_005"
    );
  }

  // Step 3: Grade the comment
  discussionComment.gradedBy = req.user._id;
  discussionComment.marksObtained = obtainedMarks;
  discussionComment.isGraded = true;

  await discussionComment.save();

  await updateGradebookOnSubmission(
    studentId,
    discussion.course,     // courseId
    discID,                // itemId
    "discussion"           // type
  );

  return res.status(200).json({ 
    success: true,
    message: "Marks graded successfully" 
  });
});

export const isCommentedInDiscussion = asyncHandler(async (req, res) => {
  const user = req.user;
  const { id } = req.params;

  const isCommented = await DiscussionComment.findOne({
    createdby: user._id,
    discussion: id,
  });

  if (user.role !== "teacher" && isCommented) {
    return res.status(200).json({ 
      success: true,
      data: { commented: true } 
    });
  }
  
  return res.status(200).json({ 
    success: true,
    data: { commented: false } 
  });
});
