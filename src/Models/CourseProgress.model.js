import mongoose from "mongoose";

const courseProgressSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseSch",
      required: true,
    },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
    finalAssessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "assessment",
    },
    certificateIssued: { type: Boolean, default: false },
  },
  { timestamps: true },
);

courseProgressSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

const CourseProgress = mongoose.model("CourseProgress", courseProgressSchema);
export default CourseProgress;
