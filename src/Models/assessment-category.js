import mongoose from "mongoose";

const AssessmentCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    weight: { type: Number, required: true, min: 0 },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseSch",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const AssessmentCategory = mongoose.model(
  "AssessmentCategory",
  AssessmentCategorySchema
);

export default AssessmentCategory;
