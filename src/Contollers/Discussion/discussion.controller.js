import mongoose from "mongoose";
import Discussion from "../../Models/discussion.model.js";
import DiscussionComment from "../../Models/discussionComment.model.js";
import { uploadToCloudinary } from "../../lib/cloudinary-course.config.js";
import Enrollment from "../../Models/Enrollement.model.js";
import CourseSch from "../../Models/courses.model.sch.js";
import {
  ValidationError,
  NotFoundError,
} from "../../Utiles/errors.js";
import { asyncHandler } from "../../middlewares/errorHandler.middleware.js";
import { notifyNewDiscussion } from "../../Utiles/notificationService.js";

export const createDiscussion = asyncHandler(async (req, res) => {
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

  console.log("🔍 DISCUSSION CREATE - req.body:", req.body);
  console.log("🔍 DISCUSSION CREATE - course field:", course);
  console.log("🔍 DISCUSSION CREATE - createdby:", createdby);

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

  await discussion.save();

  // Send notification to enrolled students
  try {
    console.log("📢 Discussion saved, attempting to send notifications...");
    console.log("Course ID:", course);
    const courseData = await CourseSch.findById(course);
    console.log("Course found:", courseData?.courseTitle);
    if (courseData) {
      await notifyNewDiscussion(
        course,
        courseData.courseTitle,
        topic,
        discussion._id,
        createdby
      );
    } else {
      console.log("❌ Course not found for discussion notification");
    }
  } catch (error) {
    console.error("❌ Discussion notification error:", error.message, error);
  }

  return res
    .status(201)
    .json({
      discussion,
      message: "Discussion created successfully"
    });
});

export const getDiscussionsOfTeacher = asyncHandler(async (req, res) => {
  const teacherId = req.user._id;

  const discussion = await Discussion.find({
    createdby: teacherId,
  }).populate({
    path: "course",
    select: "courseTitle thumbnail",
  });

  return res
    .status(200)
    .json({
      discussions: discussion,
      message: "Discussions fetched successfully here"
    });
});


export const getDiscussionbyId = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const userId = req.user._id; // current logged-in user

  const discussion = await Discussion.findById(id)
    .populate("course", "courseTitle thumbnail")
    .populate("chapter", "title")
    .populate("lesson", "title")
    .populate("createdby", "firstName middleName lastName profileImg").lean();

  if (!discussion) {
    throw new NotFoundError("Discussion not found", "DISC_001");
  }

  const override = discussion.studentDueDateOverrides?.find(
    (item) => item.student.toString() === userId.toString()
  );

  if (override) {
    discussion.isExtended = true;
    discussion.extendedDueDate = override.newDueDate;
  }

  return res.status(200).json({
    discussion,
    message: "Discussion fetched successfully",
  });
});

export const discussionforStudent = asyncHandler(async (req, res) => {
  let userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ValidationError("Invalid user ID", "DISC_002");
  }

  userId = new mongoose.Types.ObjectId(userId);

  // Exclude CANCELLED enrollments - student shouldn't see cancelled course discussions
  const studentEnrollment = await Enrollment.find({
    student: userId,
    status: { $ne: "CANCELLED" }
  });
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

  return res.status(200).json({
    discussionCount: discussions.length,
    discussions,
    message: "Discussions fetched successfully"
  });
});

export const chapterDiscussions = asyncHandler(async (req, res) => {
  const { chapterId } = req.params;

  const discussion = await Discussion.find({ chapter: chapterId }).populate("course", "courseTitle thumbnail");
  if (!discussion || discussion.length === 0) {
    throw new NotFoundError("No discussions found for this chapter", "DISC_003");
  }
  return res.status(200).json({
    discussions: discussion,
    message: "Discussions fetched successfully"
  });
});

export const lessonDiscussions = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;

  const discussion = await Discussion.find({ lesson: lessonId }).populate("course", "courseTitle thumbnail");
  if (!discussion || discussion.length === 0) {
    throw new NotFoundError("No discussions found for this lesson", "DISC_004");
  }
  return res.status(200).json({ 
    discussion: discussion,
    message: "Discussions fetched successfully"
  });
});

export const courseDiscussions = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const discussion = await Discussion.find({ course: courseId }).populate("course", "courseTitle thumbnail");
  if (!discussion || discussion.length === 0) {
    throw new NotFoundError("No discussions found for this course", "DISC_005");
  }
  return res.status(200).json({
    discussions: discussion,
    message: "Discussions fetched successfully"
  });
});

export const editDiscussionInfo = asyncHandler(async (req, res) => {
  const { discussionId } = req.params;
  const { topic, description, category, dueDate, totalMarks } = req.body;

  const discussion = await Discussion.findById(discussionId);
  if (!discussion) {
    throw new NotFoundError("Discussion not found", "DIS_015");
  }

  let dueDateObj = {};
  if (dueDate) {
    const date = new Date(dueDate);
    dueDateObj.date = date.toISOString().split("T")[0];
    dueDateObj.time = date.toISOString().split("T")[1].split(".")[0];
  }

  // Update fields
  discussion.topic = topic || discussion.topic;
  discussion.description = description || discussion.description;
  discussion.category = category || discussion.category;
  discussion.totalMarks = totalMarks || discussion.totalMarks;
  if (dueDate) discussion.dueDate = dueDateObj;

  await discussion.save();

  return res.status(200).json({
    message: "Discussion updated successfully"
  });
});

export const setDueDateForStudentDiscussion = asyncHandler(async (req, res) => {
  const { discussionId } = req.params;
  const { studentId, newDueDate } = req.body;

  const discussion = await Discussion.findById(discussionId);
  if (!discussion) {
    throw new NotFoundError("Discussion not found", "DIS_016");
  }

  // Verify student enrollment to ensure they are allowed in this course
  const enrollment = await Enrollment.findOne({
    course: discussion.course,
    student: studentId
  });

  if (!enrollment) {
    throw new NotFoundError("Student not enrolled in this course", "ENR_001");
  }

  // Format the override date object
  const dueDateObj = {
    date: new Date(newDueDate.date),
    time: newDueDate.time
  };

  // Find if an override already exists for this specific student
  const studentOverrideIndex = discussion.studentDueDateOverrides.findIndex(
    (override) => override.student.toString() === studentId
  );

  if (studentOverrideIndex !== -1) {
    // Update existing override
    discussion.studentDueDateOverrides[studentOverrideIndex].newDueDate = dueDateObj;
  } else {
    // Add new override record
    discussion.studentDueDateOverrides.push({
      student: new mongoose.Types.ObjectId(studentId),
      newDueDate: dueDateObj
    });
  }

  await discussion.save();

  return res.status(200).json({
    message: "Due date updated for student in discussion"
  });
});