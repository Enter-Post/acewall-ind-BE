import { uploadToCloudinary } from "../../lib/cloudinary-course.config.js";
import CourseSch from "../../Models/courses.model.sch.js";
import Subcategory from "../../Models/subcategory.model.js";

export const createSubCategory = async (req, res) => {
  const { title, category } = req.body;

  // Extract the single image from the request
  const image = req.files?.image?.[0];

  try {
    // 1. Validation: Check if subcategory already exists
    const existingSub = await Subcategory.findOne({
      title: { $regex: new RegExp("^" + title + "$", "i") },
      category,
    });

    if (existingSub) {
      return res.status(400).json({
        success: false,
        message: "This subcategory already exists for the selected category.",
      });
    }

    // 2. Image Upload Logic
    let imageData = null;
    if (image) {
      // Uploading specifically to a 'subcategory_images' folder in Cloudinary
      const result = await uploadToCloudinary(
        image.buffer,
        "subcategory_images"
      );
      imageData = {
        url: result.secure_url,
        publicId: result.public_id,
        filename: image.originalname,
      };
    }

    // 3. Save to Database
    const subcategory = new Subcategory({
      title,
      category,
      image: imageData, // Only saving the image object, no files array
    });

    await subcategory.save();

    res.status(201).json({
      success: true,
      message: "Subcategory created successfully",
      subcategory,
    });
  } catch (error) {
    console.error("Error in creating subcategory:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const getSubcategory = async (req, res) => {
  try {
    // 1. FIX: Changed 'name' to 'title' to match your schema
    // 2. OPTIONAL: .populate("category") gives you full details of the parent category
    const subcategories = await Subcategory.find()
      .populate("category", "title") // Fetches only the title of the parent category
      .sort({ title: 1 }); 

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
  const newImage = req.files?.image?.[0]; 

  try {
    // Debugging logs - Check these in your terminal
    console.log("Updating Subcategory ID:", id);
    console.log("New Title:", title);
    console.log("Category ID:", category);
    console.log("New Image File exists:", !!newImage);

    // 1. Find the current subcategory first
    const subcategory = await Subcategory.findById(id);
    if (!subcategory) {
      return res.status(404).json({ success: false, message: "Subcategory not found." });
    }

    // 2. Check for duplicates (excluding current ID)
    const existing = await Subcategory.findOne({
      _id: { $ne: id },
      title: { $regex: new RegExp("^" + title + "$", "i") },
      category: category || subcategory.category, // Use provided category or stay same
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Another subcategory with the same title exists.",
      });
    }

    let imageData = subcategory.image; 

    // 3. Handle New Image Upload
    if (newImage) {
      // Delete old image from Cloudinary if it exists and has a publicId
      if (subcategory.image && subcategory.image.publicId) {
        try {
          // Make sure cloudinary is imported properly in this file
          await cloudinary.uploader.destroy(subcategory.image.publicId);
        } catch (err) {
          console.error("Cloudinary Delete Error (Non-fatal):", err);
        }
      }

      // Upload the new image using your existing helper
      const result = await uploadToCloudinary(newImage.buffer, "subcategory_images");
      imageData = {
        url: result.secure_url,
        publicId: result.public_id,
        filename: newImage.originalname,
      };
    }

    // 4. Update the document
    const updated = await Subcategory.findByIdAndUpdate(
      id,
      { 
        title: title || subcategory.title, 
        category: category || subcategory.category, 
        image: imageData 
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Subcategory updated successfully",
      subcategory: updated,
    });

  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message
    });
  }
};
