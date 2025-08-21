import mongoose from "mongoose";

const LessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    pdfFiles: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
        filename: { type: String, required: true },
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
