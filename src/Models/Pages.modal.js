import mongoose from "mongoose";

const PagesSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseSch", // Assuming your course model is named CourseSch
    },
    chapter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chapter",
    },
    type: {
      type: String,
      required: true
    },
    lesson: {
      type: mongoose.Schema.ObjectId,
      ref: "Lesson",
    },
    files: [
      {
        url: { type: String },
        type: { type: String },
        filename: { type: String },
        publicId: { type: String },
      },
    ],
    image: {
      url: { type: String },
      filename: { type: String, maxlength: 100 },
      publicId: { type: String },
    },
  },
  { timestamps: true }
);

const Pages = mongoose.model("Page", PagesSchema);

export default Pages;
