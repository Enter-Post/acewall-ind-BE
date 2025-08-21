import GPA from "../Models/GPA.model.js"

export const setGPAscale = async (req, res) => {
    const { gpaScale } = req.body;
    const userId = req.user._id;
    const { courseId } = req.params;

    if (!Array.isArray(gpaScale) || gpaScale.length === 0) {
        return res.status(400).json({ error: "Scale must be a non-empty array." });
    }

    try {
        const existing = await GPA.find({ course: courseId });

        console.log(existing, "existing");

        if (existing.length > 0) {
            await GPA.findOneAndUpdate({ course: courseId }, { gpaScale });

            return res.status(200).json({
                message: "Grading scale updated successfully",
            });
        }

        const newGrade = await GPA.create({ gpaScale, createdby: userId, course: courseId });

        res.status(200).json({
            message: "Grading scale saved successfully",
        });
    } catch (err) {
        console.error("Error saving GPA:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getGPAScale = async (req, res) => {
    const { courseId } = req.params;

    try {
        const GPADoc = await GPA.find({ course: courseId });

        console.log(GPADoc, "GPADoc");
        console.log(GPADoc[0].gpaScale, "GPADoc");

        const grade = GPADoc[0]?.gpaScale
            ? [...GPADoc[0].gpaScale].sort((a, b) => b.maxPercentage - a.maxPercentage)
            : null;

        console.log(grade, "grade");
        if (!grade) {
            return res.status(404).json({ message: "Grading scale not found" });
        }
        return res.status(201).json({ message: "Grading scale found", grade });
    } catch (err) {
        console.error("Error fetching grading scale:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};