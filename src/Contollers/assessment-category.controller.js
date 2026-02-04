import AssessmentCategory from "../Models/assessment-category.js";
import { ConflictError, NotFoundError } from "../Utiles/errors.js";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";

export const createAssessmentCategory = asyncHandler(async (req, res) => {
  const { name, weight } = req.body;
  const { courseId } = req.params;
  const createdBy = req.user._id;

  const isExistingCategory = await AssessmentCategory.findOne({
    name,
    course: courseId,
  });
  if (isExistingCategory) {
    throw new ConflictError(
      "Category with this name already exists for this course",
      "ACAT_001"
    );
  }
  const newCategory = new AssessmentCategory({
    name,
    weight,
    course: courseId,
    createdBy,
  });

  await newCategory.save();

  return res.status(201).json({
    success: true,
    message: "Assessment category created successfully",
    data: newCategory,
  });
});

export const getAssessmentCategories = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const categories = await AssessmentCategory.find({ course: courseId });
  if (!categories || categories.length === 0) {
    throw new NotFoundError("No categories found for this course", "ACAT_002");
  }
  return res.status(200).json({
    success: true,
    message: "Categories retrieved successfully",
    data: categories,
  });
});

export const editWeight = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { weight } = req.body;

  const category = await AssessmentCategory.findById(categoryId);
  if (!category) {
    throw new NotFoundError("Category not found", "ACAT_003");
  }

  category.weight = weight;
  await category.save();

  return res.status(200).json({ 
    success: true,
    message: "Category weight updated successfully" 
  });
});

export const deleteAssessmentCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  const category = await AssessmentCategory.findByIdAndDelete(categoryId);
  if (!category) {
    throw new NotFoundError("Category not found", "ACAT_004");
  }
  return res.status(200).json({ 
    success: true,
    message: "Category deleted successfully" 
  });
});
