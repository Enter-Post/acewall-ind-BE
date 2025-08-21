import mongoose from "mongoose";

const SemesterSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseSch",
      required: true,
    },
    createdby: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true }, // e.g., "1st Semester 2024"
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Semester = mongoose.model("Semester", SemesterSchema);
export default Semester;
