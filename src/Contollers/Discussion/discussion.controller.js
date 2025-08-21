import mongoose from "mongoose";
import Discussion from "../../Models/discussion.model.js";
import DiscussionComment from "../../Models/discussionComment.model.js";
import { uploadToCloudinary } from "../../lib/cloudinary-course.config.js";
import Enrollment from "../../Models/Enrollement.model.js";

export const createDiscussion = async (req, res) => {
  const {
    topic,
    description,
    course,
    type,
    totalMarks,
    dueDate,
    chapter,
    lesson,
    category,
    semester,
    quarter
  } = req.body;
  const files = req.files;
  const createdby = req.user._id;

  console.log(req.body, "req.body");

  let uploadedFiles = [];

  if (files && files.length > 0) {
    for (const file of files) {
      const result = await uploadToCloudinary(file.buffer, "discussion_files");

      uploadedFiles.push({
        url: result.secure_url,
        publicId: result.public_id,
        type: file.mimetype,
        filename: file.originalname,
      });
    }
  }

  const parsedDueDate = JSON.parse(dueDate);

  const dueDateObject = {
    date: new Date(parsedDueDate.dateTime).toISOString().split("T")[0],
    time: new Date(parsedDueDate.dateTime).toLocaleTimeString([], {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  try {
    const discussion = new Discussion({
      topic,
      description,
      course,
      type,
      files: uploadedFiles,
      createdby,
      totalMarks,
      dueDate: dueDateObject,
      chapter,
      lesson,
      category,
      semester,
      quarter
    });

    discussion.save();
    return res
      .status(201)
      .json({ message: "Discussion created successfully", discussion });
  } catch (error) {
    console.log("error in creating discussion", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getDiscussionsOfTeacher = async (req, res) => {
  const teacherId = req.user._id;
  const { type, typeId } = req.params
  try {
    const discussions = await Discussion.find({
      createdby: teacherId,
      type: type,
      [type]: typeId
    }).populate("course", "courseTitle thumbnail");

    res
      .status(200)
      .json({ message: "Discussions fetched successfully", discussions });
  } catch (error) {
    console.log("error in getting discussion", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getDiscussionbyId = async (req, res) => {
  const id = req.params.id;
  try {
    const discussion = await Discussion.findById(id)
      .populate("course", "courseTitle thumbnail")
      .populate("chapter", "title")
      .populate("lesson", "title")
      .populate("createdby", "firstName middleName lastName profileImg");
    res
      .status(200)
      .json({ message: "Discussion fetched successfully", discussion });
  } catch (error) {
    console.log("error in getting discussion by ID", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const discussionforStudent = async (req, res) => {
  let userId = req.user._id;
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    userId = new mongoose.Types.ObjectId(userId);

    const studentEnrollment = await Enrollment.find({ student: userId });
    const allEnrolledCourseIds = studentEnrollment.map((enr) => enr.course);

    const discussions = await Discussion.find({
      $or: [
        { course: { $in: allEnrolledCourseIds } },
        { type: "public" } // keep public included in the same list
      ]
    })
      .populate("course", "courseTitle thumbnail")
      .populate("category", "title")
      .populate("chapter", "title")
      .populate("lesson", "title")
      .populate("createdby", "firstName middleName lastName profileImg")
      .select("-files");

    res.status(200).json({
      message: "Discussions fetched successfully",
      discussionCount: discussions.length,
      discussions
    });
  } catch (error) {
    console.log("error in discussion for student", error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
