import mongoose from "mongoose";

const discussionSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseSch",
    },
    totalMarks: { type: Number, required: true },
    topic: { type: String, required: true },
    description: { type: String, required: true },
    files: [
      {
        url: { type: String },
        type: { type: String },
        filename: { type: String },
        publicId: { type: String },
      },
    ],
    dueDate: {
      date: { type: Date },
      time: { type: String },
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssessmentCategory",
      required: true,
    },
    semester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Semester",
    },
    quarter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quarter",
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseSch",
      required: true,
    },
    chapter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chapter",
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
    },
    type: {
      type: String,
      required: true
    },
    createdby: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Discussion = mongoose.model("Discussion", discussionSchema);

export default Discussion;
