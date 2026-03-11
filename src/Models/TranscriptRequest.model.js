import mongoose from "mongoose";

const transcriptRequestSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseSch",
      required: true,
    },

    fullName: String,
    email: String,
    phone: String,
    institutionName: String,
    deliveryMethod: { type: String, enum: ["email", "mail"] },
    additionalNotes: String,

    status: { type: String, default: "pending" },
  },
  { timestamps: true },
);

export default mongoose.model("TranscriptRequest", transcriptRequestSchema);
