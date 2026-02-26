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
    console.log("📤 sendBulkNotifications called with:", { recipientCount: recipients?.length, message, type, link });

    if (!recipients || recipients.length === 0) {
      console.log("⚠️ No recipients provided");
      return [];
    }

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
    console.log(`💾 Saved ${created.length} notifications to database`);

    // Socket.io real-time delivery for online users
    let socketsSent = 0;
    recipients.forEach(recipientId => {
      const socketId = getRecieverSocketId(recipientId.toString());
      if (socketId) {
        io.to(socketId).emit("newNotification", { message, type, link });
        socketsSent++;
      }
    });

    console.log(`🔌 Sent to ${socketsSent}/${recipients.length} online users via Socket.io`);
    return created;
  } catch (error) {
    console.error("❌ sendBulkNotifications failed:", error.message, error);
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

/**
 * DISCUSSION NOTIFICATIONS
 */
export const notifyNewDiscussion = async (courseId, courseName, discussionTopic, discussionId, teacherId) => {
  try {
    console.log("📢 notifyNewDiscussion called with:", { courseId, courseName, discussionTopic, discussionId: discussionId.toString() });

    // Get all active enrolled students
    const enrollments = await Enrollment.find({
      course: courseId,
      status: { $nin: EXCLUDED_ENROLLMENT_STATUSES }
    }).select("student");

    console.log(`📊 Found ${enrollments.length} active enrollments`);
    console.log("Excluded statuses:", EXCLUDED_ENROLLMENT_STATUSES);

    if (enrollments.length === 0) {
      console.log("⚠️ No active students to notify for new discussion");
      return [];
    }

    const studentIds = enrollments.map(enr => enr.student);
    const discussionIdStr = discussionId.toString();

    console.log("Student IDs to notify:", studentIds.map(id => id.toString()));

    // Send bulk notifications
    const result = await sendBulkNotifications({
      recipients: studentIds,
      sender: teacherId,
      message: `New discussion in ${courseName}: ${discussionTopic}`,
      type: "general",
      link: `/student/discussions/${discussionIdStr}`,
    });

    console.log(`✅ Sent ${result.length} discussion notifications`);
    return result;
  } catch (error) {
    console.error("❌ notifyNewDiscussion failed:", error.message, error);
    return [];
  }
};

export const notifyDiscussionComment = async (discussionId, discussionTopic, discussionAuthorId, commenterName, commenterId, recipientRole) => {
  try {
    // Don't notify if commenter is the discussion author (self-comment)
    if (discussionAuthorId.toString() === commenterId.toString()) {
      return null;
    }

    const discussionIdStr = discussionId.toString();
    const rolePrefix = recipientRole === "teacher" ? "teacher" : "student";

    return await sendNotification({
      recipient: discussionAuthorId,
      sender: commenterId,
      message: `${commenterName} commented on your discussion "${discussionTopic}"`,
      type: "general",
      link: `/${rolePrefix}/discussions/${discussionIdStr}`,
    });
  } catch (error) {
    console.error("notifyDiscussionComment failed:", error.message);
    return null;
  }
};

export const notifyDiscussionReply = async (discussionId, commentAuthorId, replierName, replierId, recipientRole) => {
  try {
    // Don't notify if replier is the comment author (self-reply)
    if (commentAuthorId.toString() === replierId.toString()) {
      return null;
    }

    const discussionIdStr = discussionId.toString();
    const rolePrefix = recipientRole === "teacher" ? "teacher" : "student";

    return await sendNotification({
      recipient: commentAuthorId,
      sender: replierId,
      message: `${replierName} replied to your comment`,
      type: "general",
      link: `/${rolePrefix}/discussions/${discussionIdStr}`,
    });
  } catch (error) {
    console.error("notifyDiscussionReply failed:", error.message);
    return null;
  }
};

/**
 * SOCIAL POST NOTIFICATIONS
 */
export const notifySocialPostComment = async (postId, postAuthorId, commenterName, commenterId, recipientRole) => {
  try {
    // Don't notify if commenter is the post author (self-comment)
    if (postAuthorId.toString() === commenterId.toString()) {
      return null;
    }

    const rolePrefix = recipientRole === "teacher" ? "teacher" : "student";

    return await sendNotification({
      recipient: postAuthorId,
      sender: commenterId,
      message: `${commenterName} commented on your post`,
      type: "general",
      link: `/${rolePrefix}/social`,
    });
  } catch (error) {
    console.error("notifySocialPostComment failed:", error.message);
    return null;
  }
};

/**
 * DISCUSSION GRADING NOTIFICATION
 */
export const notifyDiscussionGraded = async (studentId, discussionId, discussionTopic, marksObtained, totalMarks, teacherId) => {
  try {
    return await sendNotification({
      recipient: studentId,
      sender: teacherId,
      message: `Your discussion "${discussionTopic}" has been graded: ${marksObtained}/${totalMarks}`,
      type: "assignment",
      link: `/student/discussions/${discussionId}`,
    });
  } catch (error) {
    console.error("notifyDiscussionGraded failed:", error.message);
    return null;
  }
};

/**
 * COURSE POST NOTIFICATION (Bulk)
 */
export const notifyNewCoursePost = async (postId, courseId, courseName, authorName, authorId) => {
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

    // Filter out the post author from recipients
    const recipients = studentIds.filter(id => id.toString() !== authorId.toString());

    if (recipients.length === 0) {
      return [];
    }

    const courseIdStr = courseId.toString();

    const result = await sendBulkNotifications({
      recipients: recipients,
      sender: authorId,
      message: `${authorName} posted in ${courseName}`,
      type: "general",
      link: `/student/social`,
    });

    return result;
  } catch (error) {
    console.error("notifyNewCoursePost failed:", error.message);
    return [];
  }
};

/**
 * MESSAGE NOTIFICATION
 */
export const notifyMessageReceived = async (receiverId, senderName, senderId, receiverRole, conversationId) => {
  try {
    // Don't notify if sender is the receiver (shouldn't happen, but just in case)
    if (receiverId.toString() === senderId.toString()) {
      return null;
    }

    const rolePrefix = receiverRole === "teacher" ? "teacher" : "student";
    const conversationIdStr = conversationId.toString();

    return await sendNotification({
      recipient: receiverId,
      sender: senderId,
      message: `${senderName} sent you a message`,
      type: "general",
      link: `/${rolePrefix}/messages`,
    });
  } catch (error) {
    console.error("notifyMessageReceived failed:", error.message);
    return null;
  }
};


export const notifyReferralPointsUpdated = async (userId, pointsAdded) => {
  try {
    return await sendNotification({
      recipient: userId,
      message: `You have been awarded ${pointsAdded} referral points`,
      type: "referral",
      link: `/student/account`});
  } catch (error) {
    console.error("notifyReferralPointsUpdated failed:", error.message);
    return null;
  }
};
