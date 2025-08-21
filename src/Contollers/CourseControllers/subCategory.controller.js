import CourseSch from "../../Models/courses.model.sch.js";
import Subcategory from "../../Models/subcategory.model.js";

export const createSubCategory = async (req, res) => {
  const { title, category } = req.body;

  try {
    // Check if subcategory with same title exists for the same category
    const existingSub = await Subcategory.findOne({
      title: { $regex: new RegExp("^" + title + "$", "i") }, // case-insensitive
      category,
    });

    if (existingSub) {
      return res.status(400).json({
        success: false,
        message: "This subcategory already exists for the selected category.",
      });
    }

    const subcategory = new Subcategory({ title, category });
    await subcategory.save();

    res.status(201).json({
      success: true,
      message: "Subcategory created successfully",
      subcategory,
    });
  } catch (error) {
    console.log("Error in creating subcategory:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getSubcategory = async (req, res) => {
  try {
    const subcategories = await Subcategory.find().sort({ name: 1 }); // Optional: sort alphabetically

    res.status(200).json({
      success: true,
      count: subcategories.length,
      subcategories,
    });
  } catch (error) {
    console.error("Error in getSubcategory:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subcategories",
      error: error.message,
    });
  }
};

// DELETE a subcategory by ID
export const deleteSubcategory = async (req, res) => {
  const { id } = req.params;

  console.log(id, "id");

  try {
    // 1. Check if subcategory exists
    const subcategory = await Subcategory.findById(id);
    console.log(subcategory, "subcategory");

    if (!subcategory) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    const courseCount = await CourseSch.countDocuments({ subcategory: id });
    if (courseCount > 0) {
      return res.status(400).json({
        error: true,
        message: "Subcategory contains courses and cannot be deleted",
      });
    }

    const deletedSub = await Subcategory.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Subcategory deleted successfully",
      deletedSub,
    });
  } catch (error) {
    console.error("Error deleting subcategory:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const updateSubCategory = async (req, res) => {
  const { id } = req.params;
  const { title, category } = req.body;

  try {
    const existing = await Subcategory.findOne({
      _id: { $ne: id },
      title: { $regex: new RegExp("^" + title + "$", "i") },
      category,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Another subcategory with the same title exists.",
      });
    }

    const updated = await Subcategory.findByIdAndUpdate(
      id,
      { title, category },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found.",
      });
    }

    res.status(200).json({
      success: true,
      subcategory: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};