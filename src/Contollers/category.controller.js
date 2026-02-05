import mongoose from "mongoose";
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError 
} from "../Utiles/errors.js";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";

import Category from "../Models/category.model.js";
import Subcategory from "../Models/subcategory.model.js";
import CourseSch from "../Models/courses.model.sch.js";


export const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({});
  
  return res.status(200).json({
    categories,
    message: "Categories fetched successfully",
  });
});

export const createCategory = asyncHandler(async (req, res) => {
  const { title } = req.body;
  
  if (!title) {
    throw new ValidationError("Category title is required", "VAL_001");
  }

  const isExist = await Category.findOne({ title });
  if (isExist) {
    throw new ConflictError("Category already exists", "CAT_002");
  }

  const category = await Category.create({ title });
  
  return res.status(201).json({
    category,
    message: "Category created successfully",
  });
});



export const deleteCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  if (!categoryId) {
    throw new ValidationError("Category ID is required", "VAL_001");
  }

  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new ValidationError("Invalid category ID format", "VAL_002");
  }

  const courseCount = await CourseSch.countDocuments({ category: categoryId });
  if (courseCount > 0) {
    throw new ConflictError(
      "Cannot delete category that contains courses",
      "CAT_003"
    );
  }

  const category = await Category.findByIdAndDelete(categoryId);
  if (!category) {
    throw new NotFoundError("Category not found", "CAT_001");
  }

  return res.status(200).json({
    category,
    message: "Category deleted successfully",
  });
});

export const getSubcategoriesByCategoryId = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  if (!categoryId) {
    throw new ValidationError("Category ID is required", "VAL_001");
  }

  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new ValidationError("Invalid category ID format", "VAL_002");
  }

  const categoryExists = await Category.findById(categoryId);
  if (!categoryExists) {
    throw new NotFoundError("Category not found", "CAT_001");
  }

  const subcategories = await Subcategory.find({
    category: categoryId,
  }).populate("category", "title");

  return res.status(200).json({
    subcategories,
    message: subcategories.length > 0
      ? "Subcategories fetched successfully"
      : "No subcategories found for this category",
  });
});

export const editCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { title } = req.body;

  if (!categoryId) {
    throw new ValidationError("Category ID is required", "VAL_001");
  }

  if (!title) {
    throw new ValidationError("Category title is required", "VAL_001");
  }

  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new ValidationError("Invalid category ID format", "VAL_002");
  }

  const existing = await Category.findOne({
    title,
    _id: { $ne: categoryId },
  });
  if (existing) {
    throw new ConflictError(
      "Another category with this title already exists",
      "CAT_002"
    );
  }

  const updatedCategory = await Category.findByIdAndUpdate(
    categoryId,
    { title },
    { new: true, runValidators: true }
  );

  if (!updatedCategory) {
    throw new NotFoundError("Category not found", "CAT_001");
  }

  return res.status(200).json({
    category: updatedCategory,
    message: "Category updated successfully",
  });
});


export const getCategoriesforAdmin = asyncHandler(async (req, res) => {
  const categories = await Category.aggregate([
    {
      $lookup: {
        from: "subcategories",
        localField: "_id",
        foreignField: "category",
        as: "subcategories",
      },
    },
  ]);
  
  return res.status(200).json({
    categories,
    message: "Categories with subcategories fetched successfully",
  });
});
