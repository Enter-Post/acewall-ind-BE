import mongoose from "mongoose";
import Conversation from "../Models/conversation.model.js";
import Message from "../Models/messages.model.js";
import { connect } from "mongoose";
import Enrollment from "../Models/Enrollement.model.js";
import CourseSch from "../Models/courses.model.sch.js";
import {
  ValidationError,
  NotFoundError,
  AuthenticationError,
} from "../Utiles/errors.js";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";

export const createConversation = asyncHandler(async (req, res) => {
  const myId = req.user._id;
  const memeberId = req.body.memberId;

  if (memeberId === myId) {
    throw new ValidationError(
      "You can't create conversation with yourself",
      "CONV_001"
    );
  }

    const existingConversation = await Conversation.findOne({
      members: { $all: [myId, memeberId] },
    });

    if (existingConversation) {
      return res.status(200).json({
        message: "Conversation already exist",
        conversation: existingConversation,
      });
    }

  const newConversation = new Conversation({
    members: [myId, memeberId],
  });
  await newConversation.save();
  return res.status(200).json({
    conversation: newConversation,
    message: "Conversation created successfully"
  });
});

export const getMyConversations = asyncHandler(async (req, res) => {
  const myId = req.user._id;

  const conversations = await Conversation.find({ members: myId }).populate({
    path: "members",
    select: "firstName lastName profileImg",
  });

    const formattedConversations = await Promise.all(
      conversations.map(async (conversation) => {
        const otherMember = conversation.members.find(
          (member) => member._id.toString() !== myId.toString()
        );

        const unreadCount = await Message.countDocuments({
          conversationId: conversation._id,
          sender: { $ne: myId },
          readBy: { $ne: myId },
        });

        return {
          conversationId: conversation._id,
          otherMember: otherMember
            ? {
              name: `${otherMember.firstName ?? ""} ${otherMember.lastName ?? ""}`.trim() || "User not found",
              profileImg: otherMember.profileImg || { url: "", filename: "" },
            }
            : {
              name: "User not found",
              profileImg: { url: "", filename: "" },
            },
          lastSeen: conversation.lastSeen,
          lastMessage: conversation.lastMessage,
          lastMessageDate: conversation.lastMessageAt,
          unreadCount,
        };
      })
    );

  return res.status(200).json({
    conversations: formattedConversations,
    message: "Conversations fetched successfully"
  });
});

export const updateLastSeen = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  await Conversation.findByIdAndUpdate(conversationId, {
    $set: { [`lastSeen.${userId}`]: new Date() },
  });

  return res.status(200).json({ 
    message: "Last seen updated" 
  });
});


export const getTeacherforStudent = asyncHandler(async (req, res) => {
  const studentId = req.user._id;

  const teachers = await Enrollment.aggregate([
      {
        $match: { student: new mongoose.Types.ObjectId(studentId) }
      },
      {
        $lookup: {
          from: "coursesches",
          localField: "course",
          foreignField: "_id",
          as: "courseData"
        }
      },
      { $unwind: "$courseData" },
      {
        $lookup: {
          from: "users",
          localField: "courseData.createdby",
          foreignField: "_id",
          as: "teacher"
        }
      },
      { $unwind: "$teacher" },
      {
        $group: {
          _id: "$teacher._id",
          firstName: { $first: "$teacher.firstName" },
          middleName: { $first: "$teacher.middleName" },
          lastName: { $first: "$teacher.lastName" },
          profileImg: { $first: "$teacher.profileImg" },
          courses: {
            $addToSet: {
              courseId: "$courseData._id",
              courseTitle: "$courseData.courseTitle"
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          teacherId: "$_id",
          firstName: 1,
          middleName: 1,
          lastName: 1,
          courses: 1
        }
      }
    ]);


  console.log(teachers, "teachers")

  if (!teachers || teachers.length === 0) {
    throw new NotFoundError("No teacher found", "CONV_002");
  }

  return res.status(200).json({
    teachers,
    message: "Teachers fetched successfully"
  });
});


export const getStudentsByOfTeacher = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const teacherId = req.user._id;

  // 1️⃣ Verify course belongs to teacher
  const course = await CourseSch.findOne({
    _id: courseId,
    createdby: teacherId,
  }).select("courseTitle");

  if (!course) {
    throw new AuthenticationError(
      "You are not authorized to view students of this course",
      "CONV_003"
    );
  }

    // 2️⃣ Aggregation pipeline
    const students = await Enrollment.aggregate([
      // Match course
      {
        $match: {
          course: new mongoose.Types.ObjectId(courseId),
        },
      },

      // Join users collection
      {
        $lookup: {
          from: "users",
          localField: "student",
          foreignField: "_id",
          as: "student",
        },
      },

      // Convert student array → object
      { $unwind: "$student" },

      // Remove teacher himself
      {
        $match: {
          "student._id": {
            $ne: new mongoose.Types.ObjectId(teacherId),
          },
        },
      },

      // Optional: ensure only students
      {
        $match: {
          "student.role": "student",
        },
      },

      // Shape final response
      {
        $project: {
          _id: "$student._id",
          firstName: "$student.firstName",
          lastName: "$student.lastName",
          email: "$student.email",
          profileImg: "$student.profileImg",
          enrolledAt: 1,
        },
      },
    ]);

  return res.status(200).json({
    courseId,
    courseTitle: course.courseTitle,
    totalStudents: students.length,
    students,
    message: "Students fetched successfully"
  });
});
