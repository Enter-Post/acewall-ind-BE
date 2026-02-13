import { getRecieverSocketId, io } from "../lib/socket.io.js";
import { createNotification } from "./notification.js";
import { Notification } from "../Models/Notification.model.js";
import Enrollment from "../Models/Enrollement.model.js";
import { EXCLUDED_ENROLLMENT_STATUSES } from "./notificationConstants.js";

// ===================================
// CORE NOTIFICATION FUNCTIONS
// ===================================

/**
 * Send notification to single recipient with real-time Socket.io delivery
 */
export const sendNotification = async ({ recipient, sender = null, message, type = "general", link = null }) => {
  try {
    // Save to database
    const notification = await createNotification({ 
      recipient, 
      sender, 
      message, 
      type, 
      link 
    });
    
    if (!notification) return null;
    
    // Send real-time via Socket.io
    const recipientSocketId = getRecieverSocketId(recipient.toString());
    
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("newNotification", notification);
    }
    
    return notification;
  } catch (error) {
    console.error("sendNotification failed:", error.message);
    return null;
  }
};

/**
 * Send notifications to multiple recipients with bulk DB insert
 */
export const sendBulkNotifications = async ({ recipients, message, type = "general", link = null, sender = null }) => {
  try {
    if (!recipients || recipients.length === 0) return [];
    
    // Prepare bulk insert data
    const notifications = recipients.map(recipientId => ({
      recipient: recipientId,
      sender,
      message,
      type,
      link,
    }));
    
    // Database bulk insert (efficient)
    const created = await Notification.insertMany(notifications);
    
    // Socket.io real-time delivery for online users
    recipients.forEach(recipientId => {
      const socketId = getRecieverSocketId(recipientId.toString());
      if (socketId) {
        io.to(socketId).emit("newNotification", { message, type, link });
      }
    });
    
    return created;
  } catch (error) {
    console.error("sendBulkNotifications failed:", error.message);
    return [];
  }
};

// ===================================
// CATEGORY-SPECIFIC HELPERS
// ===================================

/**
 * ENROLLMENT NOTIFICATIONS
 */
export const notifyEnrollmentSuccess = async (studentId, enrollmentId, courseName) => {
  return await sendNotification({
    recipient: studentId,
    message: `You're enrolled in ${courseName}! Start learning now.`,
    type: "general",
    link: `/student/mycourses/${enrollmentId}`,
  });
};

/**
 * COURSE CONTENT NOTIFICATIONS
 */
export const notifyNewChapter = async (courseId, courseName, chapterTitle, chapterId, teacherId) => {
  try {
    // Get all active enrolled students with their enrollmentIds
    const enrollments = await Enrollment.find({ 
      course: courseId, 
      status: { $nin: EXCLUDED_ENROLLMENT_STATUSES } 
    }).select("student _id course");
    
    if (enrollments.length === 0) {
      return [];
    }
    
    const courseIdStr = courseId.toString();
    const chapterIdStr = chapterId.toString();
    
    // Send individual notifications with chapter detail link
    const notificationPromises = enrollments.map(enr => 
      sendNotification({
        recipient: enr.student,
        sender: teacherId,
        message: `New lesson added to ${courseName}: ${chapterTitle}`,
        type: "general",
        link: `/student/mycourses/${courseIdStr}/chapters/chapter/${chapterIdStr}`,
      })
    );
    
    const results = await Promise.all(notificationPromises);
    return results;
  } catch (error) {
    console.error("notifyNewChapter failed:", error.message);
    return [];
  }
};

/**
 * ASSESSMENT NOTIFICATIONS
 */
export const notifyAssessmentAssigned = async (courseId, courseName, assessmentTitle, teacherId) => {
  try {
    // Get all active enrolled students
    const enrollments = await Enrollment.find({ 
      course: courseId, 
      status: { $nin: EXCLUDED_ENROLLMENT_STATUSES } 
    }).select("student");
    
    if (enrollments.length === 0) {
      return [];
    }
    
    const courseIdStr = courseId.toString();
    
    // Send individual notifications with assessment list link
    const notificationPromises = enrollments.map(enr => 
      sendNotification({
        recipient: enr.student,
        sender: teacherId,
        message: `New assessment assigned in ${courseName}: ${assessmentTitle}`,
        type: "assignment",
        link: `/student/assessment/bycourse/${courseIdStr}`,
      })
    );
    
    const results = await Promise.all(notificationPromises);
    return results;
  } catch (error) {
    console.error("notifyAssessmentAssigned failed:", error.message);
    return [];
  }
};

/**
 * GRADING NOTIFICATIONS
 */
export const notifyGradePosted = async (studentId, assessmentTitle, score, maxScore, courseId) => {
  return await sendNotification({
    recipient: studentId,
    message: `Your grade for "${assessmentTitle}" is ready: ${score}/${maxScore}`,
    type: "assignment",
    link: `/student/analytics/${courseId}`,
  });
};

/**
 * ANNOUNCEMENT NOTIFICATIONS
 */
export const notifyNewAnnouncement = async (courseId, courseName, announcementTitle, teacherId) => {
  try {
    // Get all active enrolled students
    const enrollments = await Enrollment.find({ 
      course: courseId, 
      status: { $nin: EXCLUDED_ENROLLMENT_STATUSES } 
    }).select("student");
    
    if (enrollments.length === 0) {
      return [];
    }
    
    const studentIds = enrollments.map(enr => enr.student);
    const courseIdStr = courseId.toString();
    
    // Send bulk notifications
    const result = await sendBulkNotifications({
      recipients: studentIds,
      sender: teacherId,
      message: `New announcement in ${courseName}: ${announcementTitle}`,
      type: "announcement",
      link: `/student/announcements/${courseIdStr}`,
    });
    
    return result;
  } catch (error) {
    console.error("notifyNewAnnouncement failed:", error.message);
    return [];
  }
};


