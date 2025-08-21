import mongoose from "mongoose";

const QuarterSchema = new mongoose.Schema(
  {
    title: { type: String, required: true }, // e.g., "1st Quarter 2024"
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isArchived: { type: Boolean, default: false }, // to mark if the quarter is archived
    semester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Semester",
      required: true,
    },
  },
  { timestamps: true }
);

const Quarter = mongoose.model("Quarter", QuarterSchema);
export default Quarter;
