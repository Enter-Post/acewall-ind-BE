import mongoose from "mongoose";

const CampaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseSch",
      default: null, // Null means it's a global campaign
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// Index to ensure only one active campaign per course at a time
// However, since MongoDB unique partial indexes are a bit tricky for "only one true" across multiple records,
// we will handle the "one active" logic in the controller.
// But we can add a basic index for performance.
CampaignSchema.index({ courseId: 1, isActive: 1 });

const Campaign = mongoose.model("Campaign", CampaignSchema);
export default Campaign;
