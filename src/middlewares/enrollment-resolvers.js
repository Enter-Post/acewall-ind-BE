import Chapter from "../Models/chapter.model.sch.js";
import Assessment from "../Models/Assessment.model.js";
import Submission from "../Models/submission.model.js";

// Resolver for chapter-based routes - extracts courseId from chapterId
export const resolveEnrollmentFromChapter = async (req, res, next) => {
  try {
    const { chapterId } = req.params;
    
    if (!chapterId) {
      return res.status(400).json({ message: "Chapter ID is required" });
    }

    const chapter = await Chapter.findById(chapterId).select("course");
    
    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    // Inject courseId into params for isEnrolledMiddleware
    req.params.courseId = chapter.course.toString();
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Resolver for assessment-based routes - extracts courseId from assessmentId
export const resolveEnrollmentFromAssessment = async (req, res, next) => {
  try {
    const { assessmentId } = req.params;
    
    if (!assessmentId) {
      return res.status(400).json({ message: "Assessment ID is required" });
    }

    const assessment = await Assessment.findById(assessmentId).select("course");
    
    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    // Inject courseId into params for isEnrolledMiddleware
    req.params.courseId = assessment.course.toString();
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Resolver for submission-based routes - extracts courseId from submissionId
export const resolveEnrollmentFromSubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    
    if (!submissionId) {
      return res.status(400).json({ message: "Submission ID is required" });
    }

    const submission = await Submission.findById(submissionId).populate({
      path: "assessment",
      select: "course"
    });
    
    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Inject courseId into params for isEnrolledMiddleware
    req.params.courseId = submission.assessment.course.toString();
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Resolver for query-based courseId - moves courseId from query to params
export const resolveEnrollmentFromQuery = async (req, res, next) => {
  try {
    const courseId = req.query.courseId;
    
    if (!courseId) {
      return res.status(400).json({ message: "Course ID is required in query" });
    }

    // Inject courseId into params for isEnrolledMiddleware
    req.params.courseId = courseId.toString();
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
