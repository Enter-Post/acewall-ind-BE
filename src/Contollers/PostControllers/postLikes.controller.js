import Posts from "../../Models/PostModels/post.model.js";
import PostLike from "../../Models/PostModels/postLikes.model.js";
import {
  NotFoundError,
} from "../../Utiles/errors.js";
import { asyncHandler } from "../../middlewares/errorHandler.middleware.js";

export const likePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type = "like" } = req.body; 
  const userId = req.user._id;

  const post = await Posts.findById(id);
  if (!post) throw new NotFoundError("Post not found", "PLIKE_001");

  let reaction = await PostLike.findOne({ post: id, likedBy: userId });
  let currentUserReaction = null;

  if (reaction) {
    if (reaction.type === type) {
      // User clicked the same emoji -> Remove it
      await PostLike.deleteOne({ _id: reaction._id });
      currentUserReaction = null;
    } else {
      // User clicked a different emoji -> Update type
      reaction.type = type;
      await reaction.save();
      currentUserReaction = type;
    }
  } else {
    // Create new reaction
    reaction = new PostLike({ post: id, likedBy: userId, type });
    await reaction.save();
    currentUserReaction = type;
  }

  // Get updated count of all reactions
  const totalLikes = await PostLike.countDocuments({ post: id });
  
  post.likes = totalLikes;
  await post.save();

  return res.status(200).json({
    userReaction: currentUserReaction, 
    totalLikes,
    message: "Reaction updated successfully"
  });
});

// ✅ Check if post is liked by current user
// ✅ Updated to support reaction types
export const isPostLiked = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  // 1. Find the specific reaction record for this user and post
  const reaction = await PostLike.findOne({ post: id, likedBy: userId });

  // 2. Count all reactions for this post
  const totalLikes = await PostLike.countDocuments({ post: id });

  return res.status(200).json({
    // Return the reaction type (e.g., "love") or null if they haven't reacted
    userReaction: reaction ? reaction.type : null,
    totalLikes,
    message: "Reaction status fetched successfully"
  });
});
