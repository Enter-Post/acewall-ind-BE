

import Posts from "../../Models/PostModels/post.model.js";
import PostComments from "../../Models/PostModels/postComment.model.js";
import {
  NotFoundError,
} from "../../Utiles/errors.js";
import { asyncHandler } from "../../middlewares/errorHandler.middleware.js";

export const sendPostComment = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;
  const { text } = req.body;

  const isExist = await Posts.findById(id);
  if (!isExist) {
    throw new NotFoundError("Post does not exist", "PCOM_001");
  }

  // Create comment
  const newComment = new PostComments({
    text,
    author: userId,
    post: id,
  });

  await newComment.save();

  // 🪄 Populate author right after saving
  const populatedComment = await newComment.populate({
    path: "author",
    select: "firstName lastName profileImg",
  });

  return res.status(200).json({
    comment: populatedComment,
    message: "Comment sent successfully"
  });
});



export const getPostComment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;

  // 🧠 Fetch paginated comments with author details
  const comments = await PostComments.find({ post: id })
    .populate("author", "firstName lastName profileImg")
    .limit(limit)
    .skip(skip)
    .sort({ createdAt: -1 });

  // 🧮 Get total comment count for this post
  const totalComments = await PostComments.countDocuments({ post: id });

  return res.status(200).json({
    comments,
    totalComments,
    message: "Comments fetched successfully"
  });
});