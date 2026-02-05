import Rating from "../Models/rating.model.js"; // Assuming you have a Rating model
import CourseInd from "../Models/courses.model.sch.js"; // Assuming you have a Course model
import mongoose from "mongoose";
import CourseSch from "../Models/courses.model.sch.js";
import {
  ValidationError,
  NotFoundError,
  AuthenticationError,
  ConflictError,
} from "../Utiles/errors.js";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";

export const getSingleCourseRating = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Fetch all ratings for the specified course
  const ratings = await Rating.find({ course: id });

  if (!ratings || ratings.length === 0) {
    throw new NotFoundError("No ratings found for this course", "RAT_001");
  }

  // Calculate average of rating.star
  const totalStars = ratings.reduce((sum, rating) => sum + rating.star, 0);
  const averageStar = totalStars / ratings.length;

  return res.status(200).json({ 
    count: ratings.length,
    averageStar,
    message: "Course ratings fetched successfully"
  });
});

export const createRating = asyncHandler(async (req, res) => {
  const createdby = req.user?._id;
  const { id } = req.params;
  const { star } = req.body;

  console.log(id, "courseId");

  if (!createdby) {
    throw new AuthenticationError("User not authenticated", "RAT_002");
  }

  // Validate rating value
  if (star < 1 || star > 5) {
    throw new ValidationError("Rating must be between 1 and 5", "RAT_003");
  }

  // Check if the course exists
  const course = await CourseSch.findById(id);
  if (!course) {
    throw new NotFoundError("Course not found", "RAT_004");
  }

  const existingRating = await Rating.findOne({ course, createdby });
  if (existingRating) {
    throw new ConflictError("You have already rated this course", "RAT_005");
  }

    // Create a new rating
    const newRating = new Rating({
      course: id,
      createdby,
      star,
    });

  await newRating.save();

  return res.status(201).json({ 
    message: "Rating created successfully", 
    rating: newRating 
  });
});

export const isRatedbyUser = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;

  // Validate ObjectIds
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new ValidationError("Invalid or missing user ID", "RAT_006");
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError("Invalid course ID", "RAT_007");
  }

  const courseId = new mongoose.Types.ObjectId(id);
  const createdby = new mongoose.Types.ObjectId(userId);

  console.log(courseId, "userId");
  console.log(createdby, "createdby");

  const isRated = await Rating.findOne({ course: courseId, createdby });
  console.log(isRated, "isRated");

  if (!isRated) {
    return res.status(200).json({ 
      rating: false,
      message: "Course not rated by user"
    });
  }
  return res.status(200).json({ 
    rating: true,
    star: isRated.star,
    message: "Course rated by user"
  });
});
