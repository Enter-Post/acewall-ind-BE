import mongoose from "mongoose";
import { type } from "os";

const GPASchema = new mongoose.Schema(
    {
        gpaScale: [{
            gpa: { type: Number, required: true },
            minPercentage: { type: Number, required: true },
            maxPercentage: { type: Number, required: true },
        }],
        course: { type: mongoose.Schema.Types.ObjectId, ref: "CourseSch", required: true },
        createdby: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

const GPA = mongoose.model("GPA", GPASchema);
export default GPA;