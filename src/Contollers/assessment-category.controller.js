import AssessmentCategory from "../Models/assessment-category.js";

export const createAssessmentCategory = async (req, res) => {
  const { name, weight } = req.body;
  const { courseId } = req.params;
  const createdBy = req.user._id;
  try {
    const isExistingCategory = await AssessmentCategory.findOne({
      name,
      course: courseId,
    });
    if (isExistingCategory) {
      return res.status(400).json({
        message: "Category with this name already exists for this course",
      });
    }
    const newCategory = new AssessmentCategory({
      name,
      weight,
      course: courseId,
      createdBy,
    });

    await newCategory.save();

    return res.status(201).json({
      message: "Assessment category created successfully",
      category: newCategory,
    });
  } catch (error) {
    console.error("Error creating assessment category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAssessmentCategories = async (req, res) => {
  const { courseId } = req.params;
  try {
    const categories = await AssessmentCategory.find({ course: courseId });
    if (!categories || categories.length === 0) {
      return res
        .status(404)
        .json({ message: "No categories found for this course" });
    }
    res.status(200).json({
      message: "Categories retrieved successfully",
      categories,
    });
  } catch (error) {
    console.error("Error retrieving assessment categories:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const editWeight = async (req, res) => {
  const { categoryId } = req.params;
  const { weight } = req.body;

  try {
    const category = await AssessmentCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    category.weight = weight;
    await category.save();

    res.status(200).json({ message: "Category weight updated successfully" });
  } catch (error) {
    console.error("Error updating category weight:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteAssessmentCategory = async (req, res) => {
  const { categoryId } = req.params;

  try {
    const category = await AssessmentCategory.findByIdAndDelete(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
