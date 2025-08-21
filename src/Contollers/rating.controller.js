import Rating from "../Models/rating.model.js"; // Assuming you have a Rating model
import CourseInd from "../Models/courses.model.sch.js"; // Assuming you have a Course model
import mongoose from "mongoose";
import CourseSch from "../Models/courses.model.sch.js";

export const getSingleCourseRating = async (req, res) => {
  const { id } = req.params;
  try {
    // Fetch all ratings for the specified course
    const ratings = await Rating.find({ course: id });

    if (!ratings || ratings.length === 0) {
      return res
        .status(404)
        .json({ message: "No ratings found for this course" });
    }

    // Calculate average of rating.star
    const totalStars = ratings.reduce((sum, rating) => sum + rating.star, 0);
    const averageStar = totalStars / ratings.length;

    res.status(200).json({ count: ratings.length, averageStar });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createRating = async (req, res) => {
  const createdby = req.user?._id;
  const { id } = req.params;
  const { star } = req.body;

  console.log(id, "courseId");

  if (!createdby) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  try {
    // Validate rating value
    if (star < 1 || star > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });
    }

    // Check if the course exists
    const course = await CourseSch.findById(id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const existingRating = await Rating.findOne({ course, createdby });
    if (existingRating) {
      return res
        .status(400)
        .json({ message: "You have already rated this course" });
    }

    // Create a new rating
    const newRating = new Rating({
      course: id,
      createdby,
      star,
    });

    await newRating.save();

    res.status(201).json({ message: "Rating created successfully", newRating });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const isRatedbyUser = async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;

  // Validate ObjectIds
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid or missing user ID" });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid course ID" });
  }

  const courseId = new mongoose.Types.ObjectId(id);
  const createdby = new mongoose.Types.ObjectId(userId);

  console.log(courseId, "userId");
  console.log(createdby, "createdby");

  try {
    const isRated = await Rating.findOne({ course: courseId, createdby });
    console.log(isRated, "isRated");

    if (!isRated) {
      return res.status(404).json({ rating: false });
    }
    res.status(200).json({ rating: true, star: isRated.star });
  } catch (error) {
    console.log("Error in isRatedbyUser", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
