import mongoose from "mongoose";
const Schema = mongoose.Schema;

// Question Schema
const questionSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ["mcq", "truefalse", "qa", "file"],
  },
  files: [
    {
      url: { type: String },
      filename: { type: String },
      publicId: { type: String },
    },
  ],
  question: { type: String, required: true, minlength: 5 },
  options: [{ type: String }], // Only used for MCQs
  points: { type: Number, required: true },
  correctAnswer: { type: String }, // String for all types, including true/false
});

// Assessment Schema
const assessmentSchema = new Schema(
  {
    title: { type: String, required: true},
    description: { type: String, required: true},
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseSch",
      required: true,
    },
    assessmentType: {
      type: String,
      required: true,
      enum: ["question", "file"],
    },
    semester: { type: mongoose.Schema.Types.ObjectId, ref: "Semester" },
    quarter: { type: mongoose.Schema.Types.ObjectId, ref: "Quarter" },
    chapter: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter" },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson" },
    type: {
      type: String,
      enum: ["lesson-assessment", "chapter-assessment", "final-assessment"],
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssessmentCategory",
      required: true,
    },
    dueDate: {
      date: { type: Date },
      time: { type: String },
    },
    stutus: { type: String, enum: ["active", "inactive"], default: "active" },
    questions: {
      type: [questionSchema],
      default: [], // Allows empty array
    },
    createdby: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Assessment = mongoose.model("assessment", assessmentSchema);
export default Assessment;
