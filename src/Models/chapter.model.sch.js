import mongoose from "mongoose";
import Comment from "./comment.model.js";

const ChapterSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    quarter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Semester",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseSch",
      required: true,
    },
    createdby: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Chapter = mongoose.model("Chapter", ChapterSchema);
export default Chapter;
