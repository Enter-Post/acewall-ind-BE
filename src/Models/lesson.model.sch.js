import mongoose from "mongoose";

const LessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    pdfFiles: [
      {
        url: { type: String },
        public_id: { type: String },
        filename: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    youtubeLinks: { type: String },
    otherLink: { type: String },
    chapter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chapter",
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

const Lesson = mongoose.model("Lesson", LessonSchema);
export default Lesson;
