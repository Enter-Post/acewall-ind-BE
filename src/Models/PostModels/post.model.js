// Models/PostModels/post.model.js
import mongoose from "mongoose";

const PostSchema = new mongoose.Schema({
    text: { type: String, required: true },
    // 🛑 CHANGE THIS: Ensure it is an array of OBJECTS, not [String]
    assets: [{ 
        url: { type: String }, 
        fileName: { type: String }, 
        type: { type: String } 
    }],
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    color: { type: String },
    postType: { 
        type: String, 
        enum: ["public", "course"], 
        default: "public" 
    },
    course: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "CourseSch",
        required: function() { return this.postType === "course"; } 
    }
}, { timestamps: true });

const Posts = mongoose.model("SocialPost", PostSchema);
export default Posts;