import mongoose from "mongoose";

const ReplyDiscussionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    role: {
      type: String,
      enum: ["student", "teacher", "teacherAsStudent"],
      required: true,
    },
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DiscussionComment",
      required: true,
    },
    createdby: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);
const DiscussionReply = mongoose.model("Reply", ReplyDiscussionSchema);

export default DiscussionReply;
