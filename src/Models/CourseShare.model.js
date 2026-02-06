import mongoose from "mongoose";

const CourseShareSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseSch",
      required: true,
    },
    ref: { type: String, default: null },
    utm_source: { type: String, default: null },
    utm_medium: { type: String, default: null },
    utm_campaign: { type: String, default: null },
    ipAddress: { type: String, default: null },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const CourseShare = mongoose.model("CourseShare", CourseShareSchema);
export default CourseShare;
