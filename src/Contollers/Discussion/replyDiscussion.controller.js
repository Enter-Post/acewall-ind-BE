import mongoose from "mongoose";
import DiscussionReply from "../../Models/replyDiscussion.model.js";
import {
  ValidationError,
} from "../../Utiles/errors.js";
import { asyncHandler } from "../../middlewares/errorHandler.middleware.js";
export const getreplyofComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { page = 1, limit = 5 } = req.query; // Defaults: page 1, 5 replies per page

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const replies = await DiscussionReply.find({ comment: commentId })
    .sort({ createdAt: -1 }) // Most recent replies first
    .skip(skip)
    .limit(parseInt(limit))
    .populate("createdby", "firstName lastName profileImg"); // optional

  const totalReplies = await DiscussionReply.countDocuments({
    comment: commentId,
  });

  return res.status(200).json({
    success: true,
    message: "Replies fetched successfully",
    data: {
      replies,
      totalPages: Math.ceil(totalReplies / limit),
      currentPage: parseInt(page),
    }
  });
});

export const sendReplyofComment = asyncHandler(async (req, res) => {
  const user = req.user;
  const { commentId } = req.params;
  const { text } = req.body;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ValidationError("Invalid commentId", "DREP_001");
  }

  const newReply = new DiscussionReply({
    text,
    role: user.role,
    createdby: user._id,
    comment: commentId,
  });

  await newReply.save();
  return res.status(200).json({ 
    success: true,
    message: "Reply sent successfully", 
    data: newReply 
  });
});


export const getReplyCount = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const replyCount = await DiscussionReply.countDocuments({ comment: commentId });

  return res.status(200).json({
    success: true,
    message: "Total reply count fetched successfully",
    data: { replyCount },
  });
});
