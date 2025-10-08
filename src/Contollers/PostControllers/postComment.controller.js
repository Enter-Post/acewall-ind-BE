

import Posts from "../../Models/PostModels/post.model.js";
import PostComments from "../../Models/PostModels/postComment.model.js";

export const sendPostComment = async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;
  const { text } = req.body;

  try {
    const isExist = await Posts.findById(id);
    if (!isExist) {
      return res.status(404).json({
        message: "Post does not exist",
      });
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

    res.status(200).json({
      message: "Comment sent successfully",
      newComment: populatedComment,
    });
  } catch (error) {
    console.log("error in sendPostComment:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



export const getPostComment = async (req, res) => {
  const { id } = req.params;

  try {
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

    res.status(200).json({
      message: "Comments fetched successfully",
      comments,
      totalComments, // ✅ include this
    });
  } catch (error) {
    console.log("error in getPostComment", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};