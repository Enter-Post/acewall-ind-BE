import mongoose from "mongoose";

const DiscussionCommentSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    discussion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Discussion",
      required: true,
    },
    role: {
      type: String,
      enum: ["student", "teacher", "teacherAsStudent"],
      required: true,
    },
    createdby: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // ✅ New fields for grading
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Teacher who graded
    },
    marksObtained: { type: Number, default: 0 },
    isGraded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const DiscussionComment = mongoose.model("DiscussionComment", DiscussionCommentSchema);

export default DiscussionComment;