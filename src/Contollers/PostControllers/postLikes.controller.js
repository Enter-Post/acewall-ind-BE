import Posts from "../../Models/PostModels/post.model.js";
import PostLike from "../../Models/PostModels/postLikes.model.js";

export const likePost = async (req, res) => {
  const { id } = req.params;
  const { type = "like" } = req.body; 
  const userId = req.user._id;

  try {
    const post = await Posts.findById(id);
    if (!post) return res.status(404).json({ message: "Post not found" });

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

    res.status(200).json({
      success: true,
      userReaction: currentUserReaction, 
      totalLikes,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Check if post is liked by current user
// ✅ Updated to support reaction types
export const isPostLiked = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // 1. Find the specific reaction record for this user and post
    const reaction = await PostLike.findOne({ post: id, likedBy: userId });

    // 2. Count all reactions for this post
    const totalLikes = await PostLike.countDocuments({ post: id });

    res.status(200).json({
      // Return the reaction type (e.g., "love") or null if they haven't reacted
      userReaction: reaction ? reaction.type : null,
      totalLikes,
    });
  } catch (error) {
    console.error("error in isPostLiked", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
