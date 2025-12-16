import StandardGrading from "../Models/StandardGrading.model.js";

export const SetStandardGradingScale = async (req, res) => {
    const { scale } = req.body;
    const courseId = req.params.courseId;

    if (!Array.isArray(scale) || scale.length === 0) {
        return res.status(400).json({ error: "Scale must be a non-empty array." });
    }
    try {
        const existing = await StandardGrading.findOne({ course: courseId });

        if (existing) {
            await StandardGrading.findOneAndUpdate({ course: courseId }, { scale });

            return res.status(200).json({
                message: "Standard Grading scale updated successfully",
                scale,
            });
        }

        const newScale = await StandardGrading.create({ scale, course: courseId });

        res.status(200).json({
            message: "Standard Grading scale saved successfully",
            scale: newScale.scale,
        });
    } catch (error) {
        console.log("Error fetching standard grading scale:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}

export const getStandardGradingScale = async (req, res) => {
    const courseId = req.params.courseId;
    try {
        const scaleDoc = await StandardGrading.findOne({ course: courseId });
        const scale = scaleDoc?.scale
            ? [...scaleDoc.scale].sort((a, b) => b.max - a.max)
            : null;
        if (!scale) {
            return res.status(404).json({ message: "Standard Grading scale not found" });
        }
        return res.status(201).json({ message: "Standard Grading scale found", scale });
    } catch (err) {
        console.error("Error fetching grading scale:", err);
        return null;
    }
};