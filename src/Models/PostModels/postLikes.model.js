import mongoose from "mongoose";

const PostLikesSchema = new mongoose.Schema({
    likedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    // Changed from Boolean to String to store 'like', 'love', 'haha', etc.
    type: { 
        type: String, 
        enum: ["like", "love", "haha", "wow", "sad"], 
        default: "like" 
    },
    post: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "SocialPost", 
        required: true 
    },
}, { timestamps: true });

// Ensure a user can only have ONE reaction per post
PostLikesSchema.index({ likedBy: 1, post: 1 }, { unique: true });

const PostLike = mongoose.model("PostLike", PostLikesSchema);

export default PostLike;