import mongoose from "mongoose";
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError 
} from "../Utiles/errors.js";

import Category from "../Models/category.model.js";
import Subcategory from "../Models/subcategory.model.js";
import CourseSch from "../Models/courses.model.sch.js";


export const getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({});
    
    return res.status(200).json({
      success: true,
      data: categories,
      message: "Categories fetched successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
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
      success: true,
      data: category,
      message: "Category created successfully",
    });
  } catch (error) {
    next(error);
  }
};



export const deleteCategory = async (req, res, next) => {
  try {
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
      success: true,
      data: category,
      message: "Category deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getSubcategoriesByCategoryId = async (req, res, next) => {
  try {
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
      success: true,
      data: subcategories,
      message: subcategories.length > 0
        ? "Subcategories fetched successfully"
        : "No subcategories found for this category",
    });
  } catch (error) {
    next(error);
  }
};

export const editCategory = async (req, res, next) => {
  try {
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
      success: true,
      data: updatedCategory,
      message: "Category updated successfully",
    });
  } catch (error) {
    next(error);
  }
};


export const getCategoriesforAdmin = async (req, res, next) => {
  try {
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
      success: true,
      data: categories,
      message: "Categories with subcategories fetched successfully",
    });
  } catch (error) {
    next(error);
  }
};
