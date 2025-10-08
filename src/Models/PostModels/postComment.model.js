

import mongoose from "mongoose";

const PostComment = mongoose.Schema({
    text: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    post: { type: mongoose.Schema.Types.ObjectId, ref: "SocialPost" },
}, { timestamps: true })

const PostComments = mongoose.model("PostComment", PostComment)

export default PostComments
