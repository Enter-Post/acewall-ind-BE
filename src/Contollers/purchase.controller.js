import Purchase from "../Models/purchase.model.js";
import { ValidationError, ConflictError, DatabaseError } from '../Utiles/errors.js';
import { asyncHandler } from '../middlewares/errorHandler.middleware.js';
// import User from "../Models/user.model";

export const purchaseCourse = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { id } = req.params;

  // Validate course ID
  if (!id) {
    throw new ValidationError("Course ID is required", "VAL_001");
  }

  // Check if course is already purchased
  const isPurchased = await Purchase.findOne({ student: userId, course: id });
  if (isPurchased) {
    throw new ConflictError("You have already purchased this course", "RES_008");
  }

  const newPurchase = new Purchase({
    student: userId,
    course: id,
  });

  await newPurchase.save();

  res.status(200).json({
    purchased: newPurchase,
    message: "Course purchased successfully"
  });
});

export const getPurchasedCourses = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  const purchasedCourses = await Purchase.find({ student: userId })
    .populate("course")
    .exec();

  res.status(200).json({
    purchasedCourses,
    message: "Purchased courses fetched successfully"
  });
});