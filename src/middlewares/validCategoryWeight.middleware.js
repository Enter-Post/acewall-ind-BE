import AssessmentCategory from "../Models/assessment-category.js";

export const validateCategoryWeight = async (req, res, next) => {
  try {
    const { weight } = req.body; 
    const { courseId, categoryId } = req.params; 

    const existingCategories = await AssessmentCategory.find({
      course: courseId,
    });

    let totalWeight = 0;

    for (const category of existingCategories) {
      if (categoryId && category._id.toString() === categoryId) {
        continue;
      }
      totalWeight += category.weight;
    }

    const newTotal = totalWeight + weight;

    if (newTotal > 100) {
      return res.status(400).json({
        message: `Adding this category would exceed 100% total weight. Current total (excluding this category): ${totalWeight}%`,
      });
    }

    next();
  } catch (err) {
    console.error("Weight validation error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
