import StandardGrading from "../Models/StandardGrading.model.js";
import {
  ValidationError,
  NotFoundError,
} from "../Utiles/errors.js";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";

export const SetStandardGradingScale = asyncHandler(async (req, res) => {
    const { scale } = req.body;
    const courseId = req.params.courseId;

    if (!Array.isArray(scale) || scale.length === 0) {
        throw new ValidationError("Scale must be a non-empty array.", "STD_001");
    }
    
    const existing = await StandardGrading.findOne({ course: courseId });

    if (existing) {
        await StandardGrading.findOneAndUpdate({ course: courseId }, { scale });

        return res.status(200).json({
            scale,
            message: "Standard Grading scale updated successfully"
        });
    }

    const newScale = await StandardGrading.create({ scale, course: courseId });

    return res.status(200).json({
        scale: newScale.scale,
        message: "Standard Grading scale saved successfully"
    });
});

export const getStandardGradingScale = asyncHandler(async (req, res) => {
    const courseId = req.params.courseId;
    
    const scaleDoc = await StandardGrading.findOne({ course: courseId });
    const scale = scaleDoc?.scale
        ? [...scaleDoc.scale].sort((a, b) => b.max - a.max)
        : null;
    if (!scale) {
        throw new NotFoundError("Standard Grading scale not found", "STD_002");
    }
    return res.status(200).json({ 
        scale,
        message: "Standard Grading scale found"
    });
});