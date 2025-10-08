

import mongoose from "mongoose"

const Post = new mongoose.Schema({
    text: { type: String },
    assets: [{ url: String, fileName: String }],
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    color: { type: String }
}, { timestamps: true })

const Posts = mongoose.model("SocialPost", Post)

export default Posts