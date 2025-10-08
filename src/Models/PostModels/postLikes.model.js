import mongoose from "mongoose";

const PostLikes = new mongoose.Schema({
    likedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isLiked: { type: Boolean, default: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: "SocialPost" },
}, { timestamps: true })

const PostLike = mongoose.model("PostLike", PostLikes)

export default PostLike