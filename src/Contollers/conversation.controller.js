import mongoose from "mongoose";
import Conversation from "../Models/conversation.model.js";
import Message from "../Models/messages.model.js";
import { connect } from "mongoose";
import Enrollment from "../Models/Enrollement.model.js";
import CourseSch from "../Models/courses.model.sch.js";

export const createConversation = async (req, res) => {
  const myId = req.user._id;
  const memeberId = req.body.memberId;

  try {
    if (memeberId === myId) {
      return res
        .status(400)
        .json({ message: "You can't create conversation with yourself" });
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
    res.status(200).json({
      message: "conversation created successfully",
      newConversation,
    });
  } catch (err) {
    res.status(500).json(err);
  }
};

export const getMyConversations = async (req, res) => {
  const myId = req.user._id;

  try {
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

    res.status(200).json({
      message: "Conversations fetched successfully",
      conversations: formattedConversations,
    });
  } catch (err) {
    console.error("Error in getMyConversations_updated:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateLastSeen = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  try {
    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { [`lastSeen.${userId}`]: new Date() },
    });

    res.status(200).json({ message: "Last seen updated" });
  } catch (err) {
    console.error("Error updating last seen:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const getTeacherforStudent = async (req, res) => {
  const studentId = req.user._id;

  try {
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
      return res.status(404).json({ message: "No teacher found" });
    }

    res.status(200).json({
      message: "Teachers fetched successfully",
      teachers
    });

  } catch (error) {
    console.error("Error fetching teacher for student:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export const getStudentsByOfTeacher = async (req, res) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user._id;

    // 1️⃣ Verify course belongs to teacher
    const course = await CourseSch.findOne({
      _id: courseId,
      createdby: teacherId,
    }).select("courseTitle");

    if (!course) {
      return res.status(403).json({
        message: "You are not authorized to view students of this course",
      });
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

    res.status(200).json({
      courseId,
      courseTitle: course.courseTitle,
      totalStudents: students.length,
      students,
    });
  } catch (error) {
    console.error("Error in getStudentsByOfTeacher:", error);
    res.status(500).json({ message: "Server error" });
  }
};
