//postLikes.controller.js


import Posts from "../../Models/PostModels/post.model.js";
import PostLike from "../../Models/PostModels/postLikes.model.js";

export const likePost = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const post = await Posts.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    let likeRecord = await PostLike.findOne({ post: id, likedBy: userId });
    let isLiked = false;

    if (likeRecord) {
      // Toggle existing like
      likeRecord.isLiked = !likeRecord.isLiked;
      await likeRecord.save();
      isLiked = likeRecord.isLiked;
    } else {
      // Create a new like entry
      likeRecord = new PostLike({ post: id, likedBy: userId, isLiked: true });
      await likeRecord.save();
      isLiked = true;
    }

    // ✅ Recalculate total likes for that post
    const totalLikes = await PostLike.countDocuments({ post: id, isLiked: true });

    // ✅ Update the post like count
    post.likes = totalLikes;
    await post.save();

    res.status(200).json({
      success: true,
      message: isLiked ? "Post liked successfully" : "Post unliked successfully",
      isLiked,
      totalLikes,
    });
  } catch (error) {
    console.error("Error in likePost:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Check if post is liked by current user
export const isPostLiked = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const isLiked = await PostLike.findOne({ post: id, likedBy: userId });
    const totalLikes = await PostLike.countDocuments({ post: id, isLiked: true });

    res.status(200).json({
      isLiked: isLiked?.isLiked || false,
      totalLikes,
    });
  } catch (error) {
    console.log("error in isPostLiked", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};