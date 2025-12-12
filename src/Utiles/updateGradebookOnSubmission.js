import Assessment from "../Models/Assessment.model.js";
import Discussion from "../Models/discussion.model.js";
import Semester from "../Models/semester.model.js";
import Quarter from "../Models/quarter.model.js";
import DiscussionComment from "../Models/discussionComment.model.js";
import Gradebook from "../Models/Gradebook.model.js";
import AssessmentCategory from "../Models/assessment-category.js";
import Submission from "../Models/submission.model.js";
import StandardGrading from "../Models/StandardGrading.model.js";
import GradingScale from "../Models/grading-scale.model.js";
import CourseSch from "../Models/courses.model.sch.js";

const getLetterGrade = async (courseId, percentage) => {
  const scaleDoc = await GradingScale.findOne({ course: courseId });
  if (!scaleDoc || !scaleDoc.scale?.length) return "N/A";

  const match = scaleDoc.scale.find(
    (s) => percentage >= s.min && percentage <= s.max
  );

  return match ? match.grade : "N/A";
};

const getStandardPoints = async (courseId, percentage) => {
  const doc = await StandardGrading.findOne({ course: courseId });
  if (!doc || !doc.scale?.length) return 0;

  const match = doc.scale.find(
    (s) => percentage >= s.minPercentage && percentage <= s.maxPercentage
  );

  return match ? match.points : 0;
};

const getStandardRemarks = async (courseId, percentage) => {
  const doc = await StandardGrading.findOne({ course: courseId });
  if (!doc || !doc.scale?.length) return "N/A";

  const match = doc.scale.find(
    (s) => percentage >= s.minPercentage && percentage <= s.maxPercentage
  );

  return match ? match.remarks : "N/A";
};

export async function updateGradebookOnSubmission(studentId, courseId, itemId, type) {
  console.log("=== GRADEBOOK UPDATE STARTED ===");

  try {
    // 1️⃣ Fetch course
    const course = await CourseSch.findById(courseId).lean();
    const gradingSystem = course?.gradingSystem || "normalGrading";

    // 2️⃣ Fetch or create gradebook
    let gradebook = await Gradebook.findOne({ studentId, courseId });

    if (!gradebook) {
      gradebook = new Gradebook({
        studentId,
        courseId,
        semesters: [],
        courseItems: [],
        finalPercentage: 0,
        finalGPA: 0,
        finalLetterGrade: "N/A",
        finalRemarks: "N/A",
      });
    }

    // 3️⃣ Load assessment/discussion item
    let item, studentPoints, maxPoints;

    if (type === "assessment") {
      item = await Assessment.findById(itemId)
        .populate("semester quarter category")
        .lean();

      const submission = await Submission.findOne({
        studentId,
        assessment: itemId,
      });

      if (!submission || !submission.graded) return false;

      studentPoints = submission.totalScore || 0;
      maxPoints = item.questions.reduce((sum, q) => sum + (q.points || 0), 0);

    } else if (type === "discussion") {
      item = await Discussion.findById(itemId)
        .populate("semester quarter category")
        .lean();

      const comment = await DiscussionComment.findOne({
        createdby: studentId,
        discussion: itemId,
      });

      if (!comment || !comment.isGraded) return false;

      studentPoints = comment.marksObtained || 0;
      maxPoints = item.totalMarks || 0;

    } else {
      return false;
    }

    // 4️⃣ Detect course-based grading
    const isCourseBased = !item.semester && !item.quarter;

    // 5️⃣ Prepare item object
    const newItem = {
      itemId,
      itemType: type,
      title: type === "assessment" ? item.title : item.topic,
      categoryId: item.category?._id || item.category,
      categoryName: item.category?.name || "Unknown Category",
      studentPoints,
      maxPoints,
    };

    // ================================================================
    // #######################  COURSE-BASED ##########################
    // ================================================================
    if (isCourseBased) {
      console.log("PROCESSING COURSE-BASED GRADEBOOK");

      gradebook.courseItems = [
        ...gradebook.courseItems.filter(
          (i) => i.itemId.toString() !== itemId.toString()
        ),
        newItem,
      ];

      const categories = await AssessmentCategory.find({ course: courseId }).lean();
      let finalPerc = 0;

      const active = categories
        .map((cat) => ({
          category: cat,
          items: gradebook.courseItems.filter(
            (i) => i.categoryId.toString() === cat._id.toString()
          ),
        }))
        .filter((x) => x.items.length > 0);

      if (active.length > 0) {
        const totalWeight = active.reduce(
          (sum, c) => sum + (c.category.weight || 0),
          0
        );

        active.forEach(({ category, items }) => {
          let earned = 0,
            total = 0;

          items.forEach((i) => {
            earned += i.studentPoints || 0;
            total += i.maxPoints || 0;
          });

          const percent = total > 0 ? (earned / total) * 100 : 0;
          finalPerc += (percent * category.weight) / totalWeight;
        });
      }

      finalPerc = Number(finalPerc.toFixed(2)) || 0;
      gradebook.finalPercentage = finalPerc;

      if (gradingSystem === "normalGrading") {
        gradebook.finalLetterGrade = await getLetterGrade(courseId, finalPerc);
      } else {
        gradebook.finalGPA = await getStandardPoints(courseId, finalPerc);
        gradebook.finalRemarks = await getStandardRemarks(courseId, finalPerc);
      }

      await gradebook.save();
      console.log("=== COURSE-BASED GRADEBOOK UPDATED ===");
      return true;
    }

    // ================================================================
    // #################### SEMESTER-BASED GRADEBOOK ##################
    // ================================================================
    const semesterId = item.semester._id.toString();
    const quarterId = item.quarter._id.toString();

    // Find or create semester
    let semIndex = gradebook.semesters.findIndex(
      (s) => s.semesterId.toString() === semesterId
    );

    if (semIndex === -1) {
      const semDoc = await Semester.findById(semesterId).lean();
      gradebook.semesters.push({
        semesterId,
        semesterTitle: semDoc?.title || "Unknown Semester",
        quarters: [],
        gradePercentage: 0,
        letterGrade: "N/A",
        gpa: 0,
        remarks: "N/A",
      });
      semIndex = gradebook.semesters.length - 1;
    }

    const semesterBlock = gradebook.semesters[semIndex];

    // Find or create quarter
    let qIndex = semesterBlock.quarters.findIndex(
      (q) => q.quarterId.toString() === quarterId
    );

    if (qIndex === -1) {
      const quarterDoc = await Quarter.findById(quarterId).lean();
      semesterBlock.quarters.push({
        quarterId,
        quarterTitle: quarterDoc?.title || "Unknown Quarter",
        items: [],
        gradePercentage: 0,
        letterGrade: "N/A",
        gpa: 0,
        remarks: "N/A",
      });
      qIndex = semesterBlock.quarters.length - 1;
    }

    const quarterBlock = semesterBlock.quarters[qIndex];

    // UPSERT ITEM
    quarterBlock.items = [
      ...quarterBlock.items.filter((i) => i.itemId.toString() !== itemId.toString()),
      newItem,
    ];

    // ---------- Quarter Calculation ----------
    const categories = await AssessmentCategory.find({ course: courseId }).lean();
    let quarterPerc = 0;

    const activeQuarter = categories
      .map((cat) => ({
        category: cat,
        items: quarterBlock.items.filter(
          (i) => i.categoryId.toString() === cat._id.toString()
        ),
      }))
      .filter((x) => x.items.length > 0);

    if (activeQuarter.length > 0) {
      const totalWeight = activeQuarter.reduce(
        (sum, c) => sum + (c.category.weight || 0),
        0
      );

      activeQuarter.forEach(({ category, items }) => {
        let earned = 0,
          total = 0;

        items.forEach((i) => {
          earned += i.studentPoints || 0;
          total += i.maxPoints || 0;
        });

        const percent = total > 0 ? (earned / total) * 100 : 0;
        quarterPerc += (percent * category.weight) / totalWeight;
      });
    }

    quarterBlock.gradePercentage = Number(quarterPerc.toFixed(2));

    if (gradingSystem === "normalGrading") {
      quarterBlock.letterGrade = await getLetterGrade(courseId, quarterPerc);
    } else {
      quarterBlock.gpa = await getStandardPoints(courseId, quarterPerc);
      quarterBlock.remarks = await getStandardRemarks(courseId, quarterPerc);
    }

    // ---------- Semester Calculation ----------
    const semAvg =
      semesterBlock.quarters.reduce((sum, q) => sum + q.gradePercentage, 0) /
      semesterBlock.quarters.length;

    semesterBlock.gradePercentage = Number(semAvg.toFixed(2));

    if (gradingSystem === "normalGrading") {
      semesterBlock.letterGrade = await getLetterGrade(courseId, semesterBlock.gradePercentage);
    } else {
      semesterBlock.gpa = await getStandardPoints(courseId, semesterBlock.gradePercentage);
      semesterBlock.remarks = await getStandardRemarks(courseId, semesterBlock.gradePercentage);
    }

    // ---------- Final Course Percentage ----------
    const finalAvg =
      gradebook.semesters.reduce((sum, s) => sum + s.gradePercentage, 0) /
      gradebook.semesters.length;

    gradebook.finalPercentage = Number(finalAvg.toFixed(2));

    if (gradingSystem === "normalGrading") {
      gradebook.finalLetterGrade = await getLetterGrade(courseId, gradebook.finalPercentage);
    } else {
      gradebook.finalGPA = await getStandardPoints(courseId, gradebook.finalPercentage);
      gradebook.finalRemarks = await getStandardRemarks(courseId, gradebook.finalPercentage);
    }

    // VERY IMPORTANT: Mark nested path modified
    gradebook.markModified(`semesters.${semIndex}.quarters.${qIndex}.items`);

    await gradebook.save();

    console.log("=== SEMESTER-BASED GRADEBOOK UPDATED ===");
    return true;

  } catch (err) {
    console.error("GRADEBOOK UPDATE ERROR:", err);
    return false;
  }
}