// Notification type categories
export const NOTIFICATION_TYPES = {
  GENERAL: "general",
  ANNOUNCEMENT: "announcement",
  ASSIGNMENT: "assignment",
  LIVE_CLASS: "live-class",
};

// Notification event templates
export const NOTIFICATION_TEMPLATES = {
  // Enrollment notifications
  ENROLLMENT_SUCCESS: {
    type: NOTIFICATION_TYPES.GENERAL,
    getMessage: (courseName) => `You're enrolled in ${courseName}! Start learning now.`,
    getLink: (courseId) => `/student/mycourses/${courseId}`,
  },
  
  // Course content notifications
  CHAPTER_ADDED: {
    type: NOTIFICATION_TYPES.GENERAL,
    getMessage: (courseName, chapterTitle) => `New lesson added to ${courseName}: ${chapterTitle}`,
    getLink: (courseId, chapterId) => `/student/mycourses/${courseId}/chapters/chapter/${chapterId}`,
  },
  
};

// Helper to validate enrollment status for notifications
export const EXCLUDED_ENROLLMENT_STATUSES = ["CANCELLED", "TEACHERENROLLMENT"];
