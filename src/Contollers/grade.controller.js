import AssessmentCategory from "../Models/assessment-category.js";
import Assessment from "../Models/Assessment.model.js";
import Submission from "../Models/submission.model.js";
import Enrollment from "../Models/Enrollement.model.js";
import CourseSch from "../Models/courses.model.sch.js"; // Assuming CourseSch is exported as Course
import PDFDocument from "pdfkit";
import { Readable } from "stream";
import GradingScale from "../Models/grading-scale.model.js";
import { type } from "os";
import Semester from "../Models/semester.model.js";
import Quarter from "../Models/quarter.model.js";
import DiscussionComment from "../Models/discussionComment.model.js";
import mongoose from "mongoose";
import Discussion from "../Models/discussion.model.js";
import GPA from "../Models/GPA.model.js";

const getLetterGrade = (gradingScale, percentage) => {
  const match = gradingScale.find(
    (range) => percentage >= range.min && percentage <= range.max
  );

  return match ? match.grade : "N/A";
};

// const percentageToGPA = (percentage) => {
//   if (percentage >= 90) return 4.0;
//   if (percentage >= 80) return 3.5;
//   if (percentage >= 70) return 3.0;
//   if (percentage >= 60) return 2.5;
//   if (percentage >= 50) return 2.0;
//   if (percentage >= 40) return 1.5;
//   return 0.0;
// };


const percentageToGPA = async (percentage, courseId) => {
  try {
    // 1️⃣ Fetch GPA scale from DB (assuming only one GPA scale document)
    const gpaDoc = await GPA.findOne({ course: courseId });

    if (!gpaDoc || !gpaDoc.gpaScale || gpaDoc.gpaScale.length === 0) {
      throw new Error("GPA scale not found in the database.");
    }

    // 2️⃣ Find matching GPA range
    const match = gpaDoc.gpaScale.find(scale =>
      percentage >= scale.minPercentage && percentage <= scale.maxPercentage
    );

    return match ? match.gpa : 0.0;
  } catch (error) {
    console.log("Error fetching GPA scale:", error);
  }

};


export const getStudentGradebook = async (req, res) => {
  const { courseId, studentId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  try {
    // Fetch grading scale
    const gradingScaleDoc = await GradingScale.findOne({ course: courseId }).lean();
    const gradingScale = gradingScaleDoc?.scale || [];

    // Categories for the course
    const categories = await AssessmentCategory.find({ course: courseId });
    const course = await CourseSch.findById(courseId)
      .lean()
      .select("courseTitle courseDescription thumbnail");

    // Fetch student's graded submissions first
    const submissionDocs = await Submission.find({
      studentId,
      graded: true,
    }).lean();

    const submissionMap = new Map();
    const gradedAssessmentIds = [];
    submissionDocs.forEach(sub => {
      submissionMap.set(sub.assessment.toString(), sub);
      gradedAssessmentIds.push(sub.assessment);
    });

    // Fetch student's graded discussion comments
    const discussionComments = await DiscussionComment.find({
      createdby: studentId,
      isGraded: true,
    }).lean();

    const discussionCommentMap = new Map();
    const gradedDiscussionIds = [];
    discussionComments.forEach(dc => {
      discussionCommentMap.set(dc.discussion.toString(), dc);
      gradedDiscussionIds.push(dc.discussion);
    });

    // Fetch only assessments that have graded submissions for this course
    const gradedAssessments = await Assessment.find({
      course: courseId,
      _id: { $in: gradedAssessmentIds }
    })
      .populate("category semester quarter")
      .lean();

    // Fetch only discussions that have graded comments for this course
    const gradedDiscussions = await Discussion.find({
      course: courseId,
      _id: { $in: gradedDiscussionIds }
    })
      .populate("category semester quarter")
      .lean();

    // Combine only graded items
    const allGradedItems = [...gradedAssessments, ...gradedDiscussions];
    const totalAssessments = allGradedItems.length;
    const totalPages = Math.ceil(totalAssessments / limit);
    const paginatedItems = allGradedItems.slice((page - 1) * limit, page * limit);

    // Group data by semester → quarter
    const groupedBySemesterQuarter = {};

    for (const item of paginatedItems) {
      const semesterId = item.semester?._id?.toString() || "unknown-semester";
      const quarterId = item.quarter?._id?.toString() || "unknown-quarter";

      if (!groupedBySemesterQuarter[semesterId]) {
        groupedBySemesterQuarter[semesterId] = { semesterId, quarters: {} };
      }
      if (!groupedBySemesterQuarter[semesterId].quarters[quarterId]) {
        groupedBySemesterQuarter[semesterId].quarters[quarterId] = {
          quarterId,
          assessments: [],
        };
      }

      let studentScore = 0;
      let maxPoints = 0;
      let isDiscussion = false;
      let title = "";

      if (item.questions) {
        // Assessment - we know submission exists because we filtered for it
        const submission = submissionMap.get(item._id.toString());
        studentScore = submission.totalScore || 0;
        maxPoints = item.questions.reduce((sum, q) => sum + q.points, 0);
        title = item.title;
      } else if (item.totalMarks) {
        // Discussion - we know comment exists because we filtered for it
        const comment = discussionCommentMap.get(item._id.toString());
        studentScore = comment.marksObtained || 0;
        maxPoints = item.totalMarks;
        title = item.topic;
        isDiscussion = true;
      }

      groupedBySemesterQuarter[semesterId].quarters[quarterId].assessments.push({
        assessmentId: item._id,
        assessmentTitle: title,
        categoryId: item.category?._id?.toString() || item.category?.toString(),
        categoryName: item.category?.name || "Unknown Category",
        maxPoints,
        studentPoints: studentScore,
        isDiscussion,
      });
    }

    // Calculate grades per quarter and semester
    let finalScoreSum = 0;
    let totalQuartersCount = 0;

    for (const semesterId of Object.keys(groupedBySemesterQuarter)) {
      const semesterData = groupedBySemesterQuarter[semesterId];
      for (const quarterId of Object.keys(semesterData.quarters)) {
        const quarterData = semesterData.quarters[quarterId];
        const quarterItems = quarterData.assessments;

        // Filter active categories in this quarter
        const activeCategories = categories
          .map(cat => {
            const itemsInCategory = quarterItems.filter(
              i => i.categoryId === cat._id.toString()
            );
            return { category: cat, itemsInCategory };
          })
          .filter(entry => entry.itemsInCategory.length > 0);

        const totalWeight = activeCategories.reduce(
          (sum, entry) => sum + entry.category.weight,
          0
        );

        let quarterWeightedScore = 0;
        for (const { category, itemsInCategory } of activeCategories) {
          let catScore = 0;
          let catMax = 0;
          for (const item of itemsInCategory) {
            catScore += item.studentPoints;
            catMax += item.maxPoints;
          }
          const percentage = catMax > 0 ? (catScore / catMax) * 100 : 0;
          const normalizedWeight = (category.weight / totalWeight) * 100;
          quarterWeightedScore += (percentage * normalizedWeight) / 100;
        }

        const finalQuarterGrade = parseFloat(quarterWeightedScore.toFixed(2));
        quarterData.grade = finalQuarterGrade;
        quarterData.gpa = await percentageToGPA(finalQuarterGrade, courseId);
        quarterData.letterGrade = getLetterGrade(gradingScale, finalQuarterGrade);

        finalScoreSum += finalQuarterGrade;
        totalQuartersCount++;
      }
    }

    // Average across quarters
    const finalCoursePercentage =
      totalQuartersCount > 0
        ? parseFloat((finalScoreSum / totalQuartersCount).toFixed(2))
        : 0;
    const gpa = await percentageToGPA(finalCoursePercentage, courseId);
    const letterGrade = getLetterGrade(gradingScale, finalCoursePercentage);

    // Fetch semester & quarter titles
    const semesters = await Semester.find({
      _id: { $in: Object.keys(groupedBySemesterQuarter).filter(id => id !== "unknown-semester") },
    }).lean();
    const quarters = await Quarter.find().lean();

    const semesterList = Object.entries(groupedBySemesterQuarter).map(
      ([semesterId, semesterData]) => {
        const semesterDoc = semesters.find(s => s._id.toString() === semesterId);
        const semesterTitle = semesterDoc?.title || "Unknown Semester";

        const quartersArray = Object.entries(semesterData.quarters).map(
          ([quarterId, quarterData]) => {
            const quarterDoc = quarters.find(q => q._id.toString() === quarterId);
            const quarterTitle = quarterDoc?.title || "Unknown Quarter";
            return {
              quarterId,
              quarterTitle,
              grade: quarterData.grade,
              gpa: quarterData.gpa,
              letterGrade: quarterData.letterGrade,
              assessments: quarterData.assessments,
            };
          }
        );

        return { semesterId, semesterTitle, quarters: quartersArray };
      }
    );

    res.json({
      studentId,
      course,
      courseName: course?.courseTitle || "Unknown Course",
      grade: finalCoursePercentage,
      gpa,
      letterGrade,
      totalAssessments,
      page,
      limit,
      totalPages,
      semesters: semesterList,
    });
  } catch (error) {
    console.error("Gradebook error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const getStudentGradeReport = async (req, res) => {
  const studentId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;

  try {
    /** 1️⃣ Fetch student's assessment submissions */
    const submissions = await Submission.find({ studentId, graded: true });
    const assessmentIds = submissions.map(s => s.assessment);

    /** 2️⃣ Fetch assessments with course info */
    const assessments = await Assessment.find({ _id: { $in: assessmentIds } })
      .populate("course category semester quarter")
      .lean();

    /** 3️⃣ Fetch student's graded discussion comments (any course) */
    const discussionComments = await DiscussionComment.find({
      createdby: studentId,
      isGraded: true
    })
      .populate({
        path: "discussion",
        populate: { path: "course category semester quarter" }
      })
      .lean();

    /** 4️⃣ Extract unique discussions from comments */
    const discussions = discussionComments.map(c => {
      const d = c.discussion;
      return { ...d, studentPoints: c.marksObtained || 0 };
    });

    /** 5️⃣ Build combined course list from assessments + discussions */
    const assessmentCourseIds = assessments.map(a => a.course._id.toString());
    const discussionCourseIds = discussions.map(d => d.course._id.toString());
    const allCourseIds = [...new Set([...assessmentCourseIds, ...discussionCourseIds])];

    /** 5.1️⃣ NEW: Fetch course info for discussion-only courses */
    const discussionOnlyCourseIds = discussionCourseIds.filter(id => !assessmentCourseIds.includes(id));
    let discussionOnlyCourses = [];
    if (discussionOnlyCourseIds.length > 0) {
      discussionOnlyCourses = await CourseSch.find({ _id: { $in: discussionOnlyCourseIds } })
        .populate("category semester quarter")
        .lean();
    }

    /** 6️⃣ Build course -> semester -> quarter -> records OR direct course records */
    const courseMap = new Map();

    // Add assessments
    for (const submission of submissions) {
      const assessment = assessments.find(a => a._id.toString() === submission.assessment.toString());
      if (!assessment) continue;
      
      const courseId = assessment.course._id.toString();
      const semesterId = assessment.semester?._id?.toString();
      const quarterId = assessment.quarter?._id?.toString();

      if (!courseMap.has(courseId)) {
        courseMap.set(courseId, {
          hasStructure: false,
          semesters: new Map(),
          directAssessments: []
        });
      }

      const courseData = courseMap.get(courseId);

      // If semester and quarter exist, use hierarchical structure
      if (semesterId && quarterId) {
        courseData.hasStructure = true;
        
        if (!courseData.semesters.has(semesterId)) {
          courseData.semesters.set(semesterId, new Map());
        }
        const semesterMap = courseData.semesters.get(semesterId);
        
        if (!semesterMap.has(quarterId)) {
          semesterMap.set(quarterId, []);
        }
        semesterMap.get(quarterId).push({ type: "assessment", assessment, submission });
      } else {
        // If semester/quarter missing, add directly to course
        courseData.directAssessments.push({ type: "assessment", assessment, submission });
      }
    }

    // Add discussions
    for (const discussion of discussions) {
      const courseId = discussion.course._id.toString();
      const semesterId = discussion.semester?._id?.toString();
      const quarterId = discussion.quarter?._id?.toString();

      if (!courseMap.has(courseId)) {
        courseMap.set(courseId, {
          hasStructure: false,
          semesters: new Map(),
          directAssessments: []
        });
      }

      const courseData = courseMap.get(courseId);

      // If semester and quarter exist, use hierarchical structure
      if (semesterId && quarterId) {
        courseData.hasStructure = true;
        
        if (!courseData.semesters.has(semesterId)) {
          courseData.semesters.set(semesterId, new Map());
        }
        const semesterMap = courseData.semesters.get(semesterId);
        
        if (!semesterMap.has(quarterId)) {
          semesterMap.set(quarterId, []);
        }
        semesterMap.get(quarterId).push({ type: "discussion", discussion });
      } else {
        // If semester/quarter missing, add directly to course
        courseData.directAssessments.push({ type: "discussion", discussion });
      }
    }

    /** 7️⃣ Fetch grading scales for all courses */
    const gradingScaleDocs = await GradingScale.find({ course: { $in: allCourseIds } }).lean();
    const gradingScaleMap = new Map();
    gradingScaleDocs.forEach(doc => gradingScaleMap.set(doc.course.toString(), doc.scale));

    /** 8️⃣ Paginate courses */
    const paginatedCourseIds = allCourseIds.slice(skip, skip + limit);

    let totalGPA = 0;
    let totalQuarters = 0;
    const courseGrades = [];

    /** 9️⃣ Helper function to calculate grade for a set of records */
    const calculateGradeForRecords = async (records, courseId) => {
      const categories = await AssessmentCategory.find({ course: courseId });
      const activeCategories = categories
        .map(category => {
          const itemsInCategory = records.filter(r =>
            r.type === "assessment"
              ? r.assessment.category?._id?.toString() === category._id.toString()
              : r.discussion.category?._id?.toString() === category._id.toString()
          );
          return { category, itemsInCategory };
        })
        .filter(entry => entry.itemsInCategory.length > 0);

      const totalWeight = activeCategories.reduce((sum, entry) => sum + entry.category.weight, 0);
      let weightedScore = 0;
      const assessmentDetails = [];

      for (const { category, itemsInCategory } of activeCategories) {
        let categoryScore = 0;
        let categoryMax = 0;

        for (const item of itemsInCategory) {
          if (item.type === "assessment") {
            const maxPoints = item.assessment.questions.reduce((sum, q) => sum + q.points, 0);
            const studentPoints = item.submission.totalScore || 0;
            categoryScore += studentPoints;
            categoryMax += maxPoints;
            assessmentDetails.push({
              assessmentId: item.assessment._id,
              assessmentTitle: item.assessment.title,
              category: category.name,
              isGraded: item.submission.graded,
              maxPoints,
              studentPoints,
              isDiscussion: false,
            });
          } else if (item.type === "discussion") {
            const maxPoints = item.discussion.totalMarks;
            const studentPoints = item.discussion.studentPoints || 0;
            categoryScore += studentPoints;
            categoryMax += maxPoints;
            assessmentDetails.push({
              assessmentId: item.discussion._id,
              assessmentTitle: item.discussion.topic,
              category: category.name,
              isGraded: true,
              maxPoints,
              studentPoints,
              isDiscussion: true,
            });
          }
        }

        const percentage = categoryMax > 0 ? (categoryScore / categoryMax) * 100 : 0;
        const normalizedWeight = totalWeight > 0 ? (category.weight / totalWeight) * 100 : 0;
        weightedScore += (percentage * normalizedWeight) / 100;
      }

      return {
        score: parseFloat(weightedScore.toFixed(2)),
        assessmentDetails
      };
    };

    /** 🔟 Loop over courses */
    for (const courseId of paginatedCourseIds) {
      const courseData = courseMap.get(courseId);
      if (!courseData) continue;

      // Get course title
      let courseTitle = "Unknown";
      const assessmentCourse = assessments.find(a => a.course._id.toString() === courseId);
      const discussionCourse = discussions.find(d => d.course._id.toString() === courseId);
      const discussionOnlyCourse = discussionOnlyCourses.find(c => c._id.toString() === courseId);

      if (assessmentCourse) {
        courseTitle = assessmentCourse.course.courseTitle;
      } else if (discussionCourse) {
        courseTitle = discussionCourse.course.courseTitle;
      } else if (discussionOnlyCourse) {
        courseTitle = discussionOnlyCourse.courseTitle;
      }

      const gradingScale = gradingScaleMap.get(courseId) || [];

      // If course has no semester/quarter structure, show assessments directly
      if (!courseData.hasStructure && courseData.directAssessments.length > 0) {
        const { score, assessmentDetails } = await calculateGradeForRecords(courseData.directAssessments, courseId);
        const gpa = await percentageToGPA(score, courseId);
        totalGPA += gpa;
        totalQuarters++;
        
        const letterGrade = getLetterGrade(gradingScale, score);
        
        courseGrades.push({
          courseId,
          courseName: courseTitle,
          coursePercentage: score,
          letterGrade,
          gpa,
          assessments: assessmentDetails,
          semesters: [] // Empty since assessments are directly under course
        });
        continue;
      }

      // Original hierarchical structure for courses with semesters/quarters
      const semesters = [];
      const semesterScores = [];

      for (const [semesterId, quarterMap] of courseData.semesters.entries()) {
        const semesterDoc = await Semester.findById(semesterId).lean();
        const semesterTitle = semesterDoc?.title || "Unknown Semester";

        const quarters = [];
        const quarterScores = [];

        for (const [quarterId, records] of quarterMap.entries()) {
          const quarterDoc = await Quarter.findById(quarterId).lean();
          const quarterTitle = quarterDoc?.title || "Unknown Quarter";

          const { score: quarterScore, assessmentDetails } = await calculateGradeForRecords(records, courseId);
          const gpa = await percentageToGPA(quarterScore, courseId);
          totalGPA += gpa;
          totalQuarters++;
          quarterScores.push(quarterScore);

          const letterGrade = getLetterGrade(gradingScale, quarterScore);
          quarters.push({
            quarterId,
            quarterTitle,
            grade: quarterScore,
            gpa,
            letterGrade,
            assessments: assessmentDetails
          });
        }

        const semesterPercentage =
          quarterScores.length > 0
            ? parseFloat((quarterScores.reduce((a, b) => a + b, 0) / quarterScores.length).toFixed(2))
            : 0;
        const semesterLetterGrade = getLetterGrade(gradingScale, semesterPercentage);
        semesterScores.push(semesterPercentage);
        semesters.push({
          semesterId,
          semesterTitle,
          semesterPercentage,
          letterGrade: semesterLetterGrade,
          quarters
        });
      }

      const coursePercentage =
        semesterScores.length > 0
          ? parseFloat((semesterScores.reduce((a, b) => a + b, 0) / semesterScores.length).toFixed(2))
          : 0;
      const courseLetterGrade = getLetterGrade(gradingScale, coursePercentage);

      courseGrades.push({
        courseId,
        courseName: courseTitle,
        coursePercentage,
        letterGrade: courseLetterGrade,
        semesters
      });
    }

    /** 1️⃣1️⃣ Final overall GPA */
    const overallGPA = totalQuarters > 0 ? parseFloat((totalGPA / totalQuarters).toFixed(2)) : 0;

    res.json({
      studentId,
      overallGPA,
      totalCourses: allCourseIds.length,
      currentPage: page,
      totalPages: Math.ceil(allCourseIds.length / limit),
      courses: courseGrades,
    });

  } catch (err) {
    console.error("Error generating grade report:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const setGradingScale = async (req, res) => {
  const { scale } = req.body;
  const createdby = req.user._id;
  const { courseId } = req.params;

  if (!Array.isArray(scale) || scale.length === 0) {
    return res.status(400).json({ error: "Scale must be a non-empty array." });
  }

  try {
    const existing = await GradingScale.findOne({ course: courseId });

    if (existing) {
      await GradingScale.findOneAndUpdate({ _id: existing._id }, { scale });

      return res.status(200).json({
        message: "Grading scale updated successfully",
        scale,
      });
    }

    const newScale = await GradingScale.create({
      scale,
      createdby,
      course: courseId,
    });

    res.status(200).json({
      message: "Grading scale saved successfully",
      scale: newScale.scale,
    });
  } catch (err) {
    console.error("Error saving grading scale:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGradingScale = async (req, res) => {
  const { courseId } = req.params;
  const createdby = req.user._id;

  try {
    const scaleDoc = await GradingScale.findOne({ course: courseId });
    const scale = scaleDoc?.scale
      ? [...scaleDoc.scale].sort((a, b) => b.max - a.max)
      : null;
    if (!scale) {
      return res.status(404).json({ message: "Grading scale not found" });
    }
    return res.status(201).json({ message: "Grading scale found", scale });
  } catch (err) {
    console.error("Error fetching grading scale:", err);
    return null;
  }
};

export const getGradebookForCourse = async (req, res) => {
  const { courseId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
    const gradingScaleDoc = await GradingScale.findOne({ course: courseId }).lean();
    const gradingScale = gradingScaleDoc?.scale || [];

    const categories = await AssessmentCategory.find({ course: courseId });

    const totalStudents = await Enrollment.countDocuments({ course: courseId });
    const enrollments = await Enrollment.find({ course: courseId })
      .populate("student", "firstName lastName")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    // All assessments for the course
    const allAssessments = await Assessment.find({ course: courseId })
      .populate("category semester quarter")
      .lean();

    // All discussions for the course
    const allDiscussions = await Discussion.find({ course: courseId })
      .populate("category semester quarter")
      .lean();

    const gradebook = [];

    for (const enrollment of enrollments) {
      const student = enrollment.student;
      const studentId = student._id;

      // Student's assessment submissions
      const submissions = await Submission.find({ studentId, graded: true }).lean();

      // Student's graded discussion comments
      const discussionComments = await DiscussionComment.find({
        createdby: studentId,
        isGraded: true,
        discussion: { $in: allDiscussions.map(d => d._id) }
      }).lean();

      // Build semester/quarter map
      const semesterMap = new Map();

      // Add assessments to map
      for (const submission of submissions) {
        const assessment = allAssessments.find(
          a => a._id.toString() === submission.assessment.toString()
        );
        if (!assessment) continue;

        const semesterId = assessment.semester?._id?.toString() || "unknown-semester";
        const quarterId = assessment.quarter?._id?.toString() || "unknown-quarter";

        if (!semesterMap.has(semesterId)) semesterMap.set(semesterId, new Map());
        const quarterMap = semesterMap.get(semesterId);

        if (!quarterMap.has(quarterId)) quarterMap.set(quarterId, []);
        quarterMap.get(quarterId).push({ type: "assessment", assessment, submission });
      }

      // Add discussions to map
      for (const comment of discussionComments) {
        const discussion = allDiscussions.find(
          d => d._id.toString() === comment.discussion.toString()
        );
        if (!discussion) continue;

        const semesterId = discussion.semester?._id?.toString() || "unknown-semester";
        const quarterId = discussion.quarter?._id?.toString() || "unknown-quarter";

        if (!semesterMap.has(semesterId)) semesterMap.set(semesterId, new Map());
        const quarterMap = semesterMap.get(semesterId);

        if (!quarterMap.has(quarterId)) quarterMap.set(quarterId, []);
        // Attach marksObtained to discussion
        quarterMap.get(quarterId).push({
          type: "discussion",
          discussion: { ...discussion, studentPoints: comment.marksObtained }
        });
      }

      const semesters = [];
      let totalGPA = 0;
      let totalQuarters = 0;
      let finalScore = 0;

      for (const [semesterId, quarterMap] of semesterMap.entries()) {
        const semesterDoc =
          semesterId !== "unknown-semester"
            ? await Semester.findById(semesterId).lean()
            : null;
        const semesterTitle = semesterDoc?.title || "Unknown Semester";

        const quarters = [];

        for (const [quarterId, records] of quarterMap.entries()) {
          const quarterDoc =
            quarterId !== "unknown-quarter"
              ? await Quarter.findById(quarterId).lean()
              : null;
          const quarterTitle = quarterDoc?.title || "Unknown Quarter";

          const activeCategories = [];

          const assessmentDetails = [];
          for (const category of categories) {
            const itemsInCategory = records.filter(r =>
              r.type === "assessment"
                ? r.assessment.category?._id?.toString() === category._id.toString()
                : r.discussion.category?._id?.toString() === category._id.toString()
            );

            if (itemsInCategory.length === 0) continue;

            let categoryScore = 0;
            let categoryMax = 0;

            for (const item of itemsInCategory) {
              if (item.type === "assessment") {
                const maxPoints = item.assessment.questions.reduce(
                  (sum, q) => sum + q.points,
                  0
                );
                const studentPoints = item.submission.totalScore || 0;
                categoryScore += studentPoints;
                categoryMax += maxPoints;
                assessmentDetails.push({
                  assessmentId: item.assessment._id,
                  assessmentTitle: item.assessment.title,
                  category: category.name,
                  maxPoints,
                  studentPoints,
                  isDiscussion: false
                });
              } else if (item.type === "discussion") {
                const maxPoints = item.discussion.totalMarks;
                const studentPoints = item.discussion.studentPoints || 0;
                categoryScore += studentPoints;
                categoryMax += maxPoints;
                assessmentDetails.push({
                  assessmentId: item.discussion._id,
                  assessmentTitle: item.discussion.topic,
                  category: category.name,
                  maxPoints,
                  studentPoints,
                  isDiscussion: true
                });
              }
            }

            const percentage = categoryMax > 0 ? (categoryScore / categoryMax) * 100 : 0;
            activeCategories.push({
              weight: category.weight,
              percentage
            });
          }

          // Normalize weights for active categories only
          const totalActiveWeight = activeCategories.reduce(
            (sum, c) => sum + c.weight,
            0
          );
          let quarterScore = 0;
          for (const cat of activeCategories) {
            const normalizedWeight = (cat.weight / totalActiveWeight) * 100;
            quarterScore += (cat.percentage * normalizedWeight) / 100;
          }

          const finalQuarterGrade = parseFloat(quarterScore.toFixed(2));
          const quarterGPA = await percentageToGPA(finalQuarterGrade, courseId);
          const quarterLetter = getLetterGrade(gradingScale, finalQuarterGrade);

          finalScore += finalQuarterGrade;
          totalGPA += quarterGPA;
          totalQuarters++;

          quarters.push({
            quarterId,
            quarterTitle,
            grade: finalQuarterGrade,
            gpa: quarterGPA,
            letterGrade: quarterLetter,
            assessments: assessmentDetails
          });
        }

        semesters.push({
          semesterId,
          semesterTitle,
          quarters
        });
      }

      const overallGPA =
        totalQuarters > 0
          ? parseFloat((totalGPA / totalQuarters).toFixed(2))
          : 0;

      const studentFinalGrade =
        totalQuarters > 0
          ? parseFloat((finalScore / totalQuarters).toFixed(2))
          : 0;

      const letterGrade = getLetterGrade(gradingScale, studentFinalGrade);

      gradebook.push({
        studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        gpa: overallGPA,
        finalGrade: studentFinalGrade,
        letterGrade,
        semesters
      });
    }

    return res.json({
      courseId,
      total: totalStudents,
      page: Number(page),
      limit: Number(limit),
      gradebook
    });
  } catch (error) {
    console.error("Error generating gradebook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
