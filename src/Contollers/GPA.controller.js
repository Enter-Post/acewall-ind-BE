import GPA from "../Models/GPA.model.js";
import {
  ValidationError,
  NotFoundError,
} from "../Utiles/errors.js";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";

export const setGPAscale = asyncHandler(async (req, res) => {
    const { gpaScale } = req.body;
    const userId = req.user._id;
    const { courseId } = req.params;

    if (!Array.isArray(gpaScale) || gpaScale.length === 0) {
        throw new ValidationError("Scale must be a non-empty array.", "GPA_001");
    }
    
    const existing = await GPA.find({ course: courseId });

    console.log(existing, "existing");

    if (existing.length > 0) {
        await GPA.findOneAndUpdate({ course: courseId }, { gpaScale });

        return res.status(200).json({
            success: true,
            message: "Grading scale updated successfully",
        });
    }

    const newGrade = await GPA.create({ gpaScale, createdby: userId, course: courseId });

    return res.status(200).json({
        success: true,
        message: "Grading scale saved successfully",
    });
});

export const getGPAScale = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const GPADoc = await GPA.find({ course: courseId });

    console.log(GPADoc, "GPADoc");
    console.log(GPADoc[0].gpaScale, "GPADoc");

    const grade = GPADoc[0]?.gpaScale
        ? [...GPADoc[0].gpaScale].sort((a, b) => b.maxPercentage - a.maxPercentage)
        : null;

    console.log(grade, "grade");
    if (!grade) {
        throw new NotFoundError("Grading scale not found", "GPA_002");
    }
    return res.status(200).json({ 
        success: true,
        message: "Grading scale found", 
        data: { grade } 
    });
});