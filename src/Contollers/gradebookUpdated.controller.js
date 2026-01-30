import Gradebook from "../Models/Gradebook.model.js";
import GradingScale from "../Models/grading-scale.model.js";
import GPA from "../Models/GPA.model.js";
import StandardGrading from "../Models/StandardGrading.model.js";
import CourseSch from "../Models/courses.model.sch.js";
import User from "../Models/user.model.js";

// ======================================================
// 🔥 Helper Methods
// ======================================================
function getLetterFromScale(percent, gradingScale) {
  if (!gradingScale || !gradingScale.scale) return "N/A";

  const match = gradingScale.scale.find(
    (s) => percent >= s.min && percent <= s.max
  );

  if (!match) return "N/A";
  return match.letter && match.letter.trim() !== ""
    ? match.letter
    : match.grade || "N/A";
}

function getGPAFromScale(percent, gpaScale) {
  if (!gpaScale || !gpaScale.gpaScale) return 0;

  const match = gpaScale.gpaScale.find(
    (g) => percent >= g.minPercentage && percent <= g.maxPercentage
  );

  return match ? match.gpa : 0;
}

function getStandardGrade(percent, standardScale) {
  if (!standardScale || !standardScale.scale)
    return { points: null, remarks: null };

  const match = standardScale.scale.find(
    (s) => percent >= s.minPercentage && percent <= s.maxPercentage
  );

  return match
    ? { points: match.points, remarks: match.remarks }
    : { points: null, remarks: null };
}

/** Main API */
export const getStudentGradebooksFormatted = async (req, res) => {
  try {
    const studentId = req.user._id;

    console.log("this is working")

    const gradingScale = await GradingScale.findOne({});
    const gpaScale = await GPA.findOne({});
    const standardScale = await StandardGrading.findOne({});

    console.log(studentId, "studentId")
    console.log(gradingScale, "gradingScale")
    console.log(gpaScale, "gpaScale")
    console.log(standardScale, "standardScale")

    const gradebooks = await Gradebook.find({ studentId });

    console.log(gradebooks, "gradebooks")


    if (!gradebooks || gradebooks.length === 0) {
      return res.json({
        studentId,
        totalCourses: 0,
        overallGPA: 0,
        overallStandardGrade: null,
        courses: [],
      });
    }

    let totalCourses = gradebooks.length;
    let overallGPA = 0;
    let standardGradesList = [];

    console.log("working 1");

    const courses = await Promise.all(
      gradebooks.map(async (gb) => {
        const courseData = await CourseSch.findById(gb.courseId).lean();
        const gradingSystem = courseData?.gradingSystem || "normalGrading";
        const isCourseBased = gb.courseItems && gb.courseItems.length > 0;

        let semesters = [];
        let courseItems = [];

        // ---------------------- COURSE-BASED ----------------------
        if (isCourseBased) {
          const items = gb.courseItems.map((item) => ({
            assessmentId: item.itemId,
            assessmentTitle: item.title,
            category: item.categoryName,
            isDiscussion:
              item.itemType?.toLowerCase() === "discussion" ||
              item.categoryName?.toLowerCase() === "discussion" ||
              item.isDiscussion === true,
            isGraded: true,
            maxPoints: item.maxPoints,
            studentPoints: item.studentPoints,
          }));

          courseItems = items;
        }

        console.log("working 2");

        // ---------------------- SEMESTER-BASED ----------------------
        if (gb.semesters && gb.semesters.length > 0) {
          semesters = gb.semesters.map((semester) => {
            const semesterPercentage = semester.gradePercentage || 0;
            let semDisplay = {};

            if (gradingSystem === "normalGrading") {
              semDisplay.letterGrade = getLetterFromScale(
                semesterPercentage,
                gradingScale
              );
              semDisplay.gpa = getGPAFromScale(semesterPercentage, gpaScale);
            } else {
              semDisplay.standardGrade = getStandardGrade(
                semesterPercentage,
                standardScale
              );
            }

            console.log("working 3");

            const quarters =
              semester.quarters?.map((quarter) => {
                const quarterPercentage = quarter.gradePercentage || 0;
                let quarterDisplay = {};

                if (gradingSystem === "normalGrading") {
                  quarterDisplay.letterGrade = getLetterFromScale(
                    quarterPercentage,
                    gradingScale
                  );
                  quarterDisplay.gpa = getGPAFromScale(
                    quarterPercentage,
                    gpaScale
                  );
                } else {
                  quarterDisplay.standardGrade = getStandardGrade(
                    quarterPercentage,
                    standardScale
                  );
                }

                console.log(quarter.items, "working 4");

                const assessments =
                  quarter.items?.map((item) => {
                    return {
                      assessmentId: item.itemId,
                      assessmentTitle: item.title,
                      category: item.categoryName,
                      isDiscussion:
                        item.itemType?.toLowerCase() === "discussion" ||
                        item.categoryName?.toLowerCase() === "discussion" ||
                        item.isDiscussion === true,
                      isGraded: true,
                      maxPoints: item.maxPoints,
                      studentPoints: item.studentPoints,
                    };
                  }) || [];

                console.log("working 5");

                return {
                  quarterId: quarter.quarterId,
                  quarterTitle: quarter.quarterTitle,
                  grade: quarterPercentage,
                  ...quarterDisplay,
                  assessments,
                };
              }) || [];

            return {
              semesterId: semester.semesterId,
              semesterTitle: semester.semesterTitle,
              semesterPercentage,
              ...semDisplay,
              quarters,
            };
          });
        }

        // ---------------------- COURSE LEVEL ----------------------
        const coursePercentage = gb.finalPercentage || 0;
        let courseDisplay = {};

        if (gradingSystem === "normalGrading") {
          courseDisplay.letterGrade = getLetterFromScale(
            coursePercentage,
            gradingScale
          );
          courseDisplay.gpa = getGPAFromScale(coursePercentage, gpaScale);
          overallGPA += courseDisplay.gpa;
        } else {
          const standardGrade = getStandardGrade(
            coursePercentage,
            standardScale
          );
          courseDisplay.standardGrade = standardGrade;
          standardGradesList.push(coursePercentage);
        }

        return {
          courseId: gb.courseId,
          courseName: courseData?.courseTitle || gb.courseTitle || "N/A",
          coursePercentage,
          ...courseDisplay,
          semesters,
          courseItems,
          gradingSystem,
        };
      })
    );

    // ---------------------- OVERALL ----------------------
    let overallStandardGrade = null;

    if (standardGradesList.length > 0) {
      const overallPercentage =
        standardGradesList.reduce((a, b) => a + b, 0) /
        standardGradesList.length;

      overallStandardGrade = getStandardGrade(overallPercentage, standardScale);
    }

    return res.json({
      studentId,
      totalCourses,
      overallGPA: Number((overallGPA / totalCourses).toFixed(2)),
      overallStandardGrade,
      currentPage: 1,
      totalPages: 1,
      courses,
    });
  } catch (error) {
    console.error("Error generating gradebook:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const getStudentCourseAnalytics = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user._id;

    const gradebook = await Gradebook.findOne({ studentId, courseId });
    if (!gradebook)
      return res.status(404).json({ message: "Analytics data not found." });

    let allItems = [];
    if (gradebook.courseItems?.length > 0) {
      allItems = [...gradebook.courseItems];
    } else if (gradebook.semesters) {
      gradebook.semesters.forEach((sem) => {
        sem.quarters?.forEach((q) => {
          if (q.items) allItems.push(...q.items);
        });
      });
    }

    if (allItems.length === 0) {
      return res.json({
        message: "No assessments completed yet.",
        summary: { currentPercentage: 0 },
        insights: null,
        charts: { lineChart: [], categoryPerformance: [] },
      });
    }

    // --- SYNCHRONIZED CALCULATION LOGIC ---

    // 1. TRUE Overall Average (Sum of Points / Sum of Max)
    const totalEarned = allItems.reduce((acc, item) => acc + (item.studentPoints || 0), 0);
    const totalPossible = allItems.reduce((acc, item) => acc + (item.maxPoints || 0), 0);
    const currentOverallAvg = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;

    // 2. Trend & Momentum Logic (Last 5 submissions)
    const recentWindow = 5;
    const trendItems = allItems.slice(-recentWindow);
    const recentAvg = trendItems.reduce(
      (acc, item) => acc + ((item.studentPoints / (item.maxPoints || 1)) * 100),
      0
    ) / trendItems.length;

    const trendDiff = recentAvg - currentOverallAvg;
    const projectedScore = recentAvg * 0.6 + currentOverallAvg * 0.4;

    // 3. Category Performance
    const categories = {};
    allItems.forEach((item) => {
      const cat = item.categoryName || "Assessment";
      if (!categories[cat])
        categories[cat] = { totalObtained: 0, totalMax: 0, count: 0 };
      categories[cat].totalObtained += (item.studentPoints || 0);
      categories[cat].totalMax += (item.maxPoints || 0);
      categories[cat].count += 1;
    });

    const categoryPerformance = Object.keys(categories).map((cat) => ({
      category: cat,
      average: (categories[cat].totalObtained / (categories[cat].totalMax || 1)) * 100,
      count: categories[cat].count,
    })).sort((a, b) => b.average - a.average); // Best to Worst

    const weakest = categoryPerformance[categoryPerformance.length - 1];
    const best = categoryPerformance[0];

    return res.json({
      courseName: gradebook.courseTitle,
      summary: {
        currentPercentage: currentOverallAvg.toFixed(1),
        totalAssessments: allItems.length,
        pointsEarned: totalEarned,
        pointsPossible: totalPossible,
      },
      insights: {
        trendStatus: trendDiff >= 0 ? "increasing" : "decreasing",
        percentageChange: Math.abs(trendDiff).toFixed(1),
        recentAverage: recentAvg.toFixed(1),
        overallAverage: currentOverallAvg.toFixed(1),
        projectedFinalScore: Math.min(100, projectedScore).toFixed(1),
        sampleSize: trendItems.length,
        weakestCategory: weakest ? {
          name: weakest.category,
          average: weakest.average.toFixed(1),
          gap: (best.average - weakest.average).toFixed(1),
        } : null,
      },
      charts: {
        lineChart: allItems.map((item, i) => ({
          name: item.title || `Task ${i + 1}`,
          score: ((item.studentPoints / (item.maxPoints || 1)) * 100).toFixed(1),
        })),
        categoryPerformance,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getGradebooksOfCourseFormatted = async (req, res) => {
  const courseId = req.params.courseId;

  try {
    // Fetch course
    const course = await CourseSch.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const gradingType = course.gradingSystem; // normalGrading | StandardGrading
    const isSemesterBased = course.semesterbased === true;

    // Fetch all scales
    const gradingScale = await GradingScale.findOne({});
    const gpaScale = await GPA.findOne({});
    const standardScale = await StandardGrading.findOne({});

    // Fetch gradebooks
    const gradebooks = await Gradebook.find({ courseId }).populate(
      "studentId",
      "firstName lastName"
    );

    const formatted = [];

    for (const gb of gradebooks) {
      const studentName = gb.studentId
        ? `${gb.studentId.firstName} ${gb.studentId.lastName}`
        : "Unknown";

      // ------------------------------------
      //  FINAL COURSE GRADE
      // ------------------------------------
      const percent = gb.finalPercentage ?? 0;
      let finalBlock = {};

      if (gradingType === "normalGrading") {
        finalBlock = {
          finalGrade: percent,
          gpa: getGPAFromScale(percent, gpaScale),
          letterGrade: getLetterFromScale(percent, gradingScale),
        };
      } else {
        const sg = getStandardGrade(percent, standardScale);

        console.log(sg, "sg");
        finalBlock = {
          standardGrade: {
            finalGrade: percent,
            points: sg.points ?? 0,
            remarks: sg.remarks ?? "",
          },
        };
      }

      // =====================================================================
      // ===============   SEMESTER-BASED COURSE FORMAT   ====================
      // =====================================================================
      let semesterBlock = [];
      let chapterBlock = [];

      if (isSemesterBased) {
        semesterBlock = (gb.semesters || []).map((sem) => {
          const semPercent = sem.gradePercentage ?? 0;

          const semesterGrade =
            gradingType === "normalGrading"
              ? {
                grade: semPercent,
                letterGrade: getLetterFromScale(semPercent, gradingScale),
              }
              : (() => {
                const sg = getStandardGrade(semPercent, standardScale);
                return {
                  standardGrade: {
                    grade: semPercent,
                    points: sg.points ?? 0,
                    remarks: sg.remarks ?? "",
                  },
                };
              })();

          return {
            semesterId: sem.semesterId,
            semesterTitle: sem.semesterTitle,
            ...semesterGrade,

            quarters: (sem.quarters || []).map((qt) => {
              const qPercent = qt.gradePercentage ?? 0;

              const quarterGrade =
                gradingType === "normalGrading"
                  ? {
                    grade: qPercent,
                    gpa: getGPAFromScale(qPercent, gpaScale),
                    letterGrade: getLetterFromScale(qPercent, gradingScale),
                  }
                  : (() => {
                    const sg = getStandardGrade(qPercent, standardScale);
                    return {
                      standardGrade: {
                        grade: qPercent,
                        points: sg.points ?? 0,
                        remarks: sg.remarks ?? "",
                      },
                    };
                  })();

              return {
                quarterId: qt.quarterId,
                quarterTitle: qt.quarterTitle,
                ...quarterGrade,

                assessments: (qt.items || []).map((item) => ({
                  assessmentId: item.itemId,
                  assessmentTitle: item.title,
                  category: item.categoryName,
                  isDiscussion: item.itemType?.toLowerCase() === "discussion",
                  maxPoints: item.maxPoints,
                  studentPoints: item.studentPoints,
                })),
              };
            }),
          };
        });
      }

      // =====================================================================
      // ==================  CHAPTER-BASED COURSE FORMAT  ====================
      // =====================================================================
      else {
        chapterBlock = (gb.courseItems || []).map((item) => ({
          assessmentId: item.itemId,
          assessmentTitle: item.title,
          category: item.categoryName,
          isDiscussion:
            item.itemType?.toLowerCase() === "discussion" ||
            item.categoryName?.toLowerCase() === "discussion",
          maxPoints: item.maxPoints,
          studentPoints: item.studentPoints,
        }));
      }

      // FINAL OUTPUT PER STUDENT
      formatted.push({
        studentId: gb.studentId?._id,
        studentName,
        gradingSystem: gradingType,
        courseType: isSemesterBased ? "semester-based" : "chapter-based",

        ...(isSemesterBased && { semesters: semesterBlock }),
        ...(!isSemesterBased && { chapters: chapterBlock }),

        ...finalBlock,
      });
    }

    return res.status(200).json({
      gradebook: formatted,
      gradingSystem: gradingType,
      courseType: isSemesterBased ? "semester-based" : "chapter-based",
    });
  } catch (error) {
    console.error("Error in getGradebooksOfCourseFormatted", error);
    return res.status(500).json({ error: error.message });
  }
};

export const getGradebooksOfStudentCourseFormatted = async (req, res) => {
  const { courseId, studentId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  try {
    // Fetch course
    const course = await CourseSch.findById(courseId)
      .lean()
      .select(
        "courseTitle courseDescription thumbnail gradingSystem semesterbased"
      );

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const gradingType = course.gradingSystem; // normalGrading | StandardGrading
    const isSemesterBased = course.semesterbased === true;

    // Fetch all scales
    const gradingScale = await GradingScale.findOne({});
    const gpaScale = await GPA.findOne({});
    const standardScale = await StandardGrading.findOne({});

    // Fetch gradebook for this specific student and course
    const gradebook = await Gradebook.findOne({
      courseId,
      studentId,
    }).lean();

    if (!gradebook) {
      return res
        .status(404)
        .json({ message: "Gradebook not found for this student" });
    }

    // ------------------------------------
    //  FINAL COURSE GRADE
    // ------------------------------------
    const percent = gradebook.finalPercentage ?? 0;
    let finalBlock = {};

    if (gradingType === "normalGrading") {
      finalBlock = {
        finalGrade: percent,
        gpa: getGPAFromScale(percent, gpaScale),
        letterGrade: getLetterFromScale(percent, gradingScale),
      };
    } else {
      const sg = getStandardGrade(percent, standardScale);
      finalBlock = {
        standardGrade: {
          finalGrade: percent,
          points: sg.points ?? 0,
          remarks: sg.remarks ?? "",
        },
      };
    }

    // =====================================================================
    // ===============   SEMESTER-BASED COURSE FORMAT   ====================
    // =====================================================================
    let semesterBlock = [];
    let chapterBlock = [];
    let totalAssessments = 0;

    if (isSemesterBased) {
      semesterBlock = (gradebook.semesters || []).map((sem) => {
        const semPercent = sem.gradePercentage ?? 0;

        const semesterGrade =
          gradingType === "normalGrading"
            ? {
              grade: semPercent,
              letterGrade: getLetterFromScale(semPercent, gradingScale),
            }
            : (() => {
              const sg = getStandardGrade(semPercent, standardScale);
              return {
                standardGrade: {
                  grade: semPercent,
                  points: sg.points ?? 0,
                  remarks: sg.remarks ?? "",
                },
              };
            })();

        return {
          semesterId: sem.semesterId,
          semesterTitle: sem.semesterTitle,
          ...semesterGrade,

          quarters: (sem.quarters || []).map((qt) => {
            const qPercent = qt.gradePercentage ?? 0;

            const quarterGrade =
              gradingType === "normalGrading"
                ? {
                  grade: qPercent,
                  gpa: getGPAFromScale(qPercent, gpaScale),
                  letterGrade: getLetterFromScale(qPercent, gradingScale),
                }
                : (() => {
                  const sg = getStandardGrade(qPercent, standardScale);
                  return {
                    standardGrade: {
                      grade: qPercent,
                      points: sg.points ?? 0,
                      remarks: sg.remarks ?? "",
                    },
                  };
                })();

            const assessments = (qt.items || []).map((item) => ({
              assessmentId: item.itemId,
              assessmentTitle: item.title,
              category: item.categoryName,
              isDiscussion: item.itemType?.toLowerCase() === "discussion",
              maxPoints: item.maxPoints,
              studentPoints: item.studentPoints,
            }));

            totalAssessments += assessments.length;

            return {
              quarterId: qt.quarterId,
              quarterTitle: qt.quarterTitle,
              ...quarterGrade,
              assessments,
            };
          }),
        };
      });
    }

    // =====================================================================
    // ==================  CHAPTER-BASED COURSE FORMAT  ====================
    // =====================================================================
    else {
      chapterBlock = (gradebook.courseItems || []).map((item) => ({
        assessmentId: item.itemId,
        assessmentTitle: item.title,
        category: item.categoryName,
        isDiscussion:
          item.itemType?.toLowerCase() === "discussion" ||
          item.categoryName?.toLowerCase() === "discussion",
        maxPoints: item.maxPoints,
        studentPoints: item.studentPoints,
      }));
      totalAssessments = chapterBlock.length;
    }

    // Pagination for assessments (if needed)
    const totalPages = Math.ceil(totalAssessments / limit);

    // Build response
    const response = {
      studentId,
      course: {
        _id: course._id,
        courseTitle: course.courseTitle,
        courseDescription: course.courseDescription,
        thumbnail: course.thumbnail,
      },
      courseName: course.courseTitle,
      gradingSystem: gradingType,
      courseType: isSemesterBased ? "semester-based" : "chapter-based",
      totalAssessments,
      page,
      limit,
      totalPages,
      ...finalBlock,
    };

    // Add semesters or chapters based on course type
    if (isSemesterBased) {
      response.semesters = semesterBlock;
    } else {
      response.chapters = chapterBlock;
    }

    res.json(response);
  } catch (error) {
    console.error("Gradebook error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getTeacherStudentAnalytics = async (req, res) => {
  try {
    const { courseId, studentId } = req.params;

    const course = await CourseSch.findById(courseId).lean().select("courseTitle");
    const gradebook = await Gradebook.findOne({ courseId, studentId }).lean();

    if (!gradebook || !course) {
      return res.status(404).json({ message: "Data not found." });
    }

    let allItems = [];
    if (gradebook.courseItems?.length > 0) {
      allItems = [...gradebook.courseItems];
    } else if (gradebook.semesters) {
      gradebook.semesters.forEach(sem => {
        sem.quarters?.forEach(q => { if (q.items) allItems.push(...q.items); });
      });
    }

    if (allItems.length === 0) {
      return res.json({ message: "No graded items found.", summary: { currentPercentage: 0 }, charts: { lineChart: [], categoryPerformance: [] } });
    }

    // --- SYNCHRONIZED CALCULATION LOGIC (IDENTICAL TO STUDENT) ---

    // 1. TRUE Overall Average
    const totalEarned = allItems.reduce((acc, item) => acc + (item.studentPoints || 0), 0);
    const totalPossible = allItems.reduce((acc, item) => acc + (item.maxPoints || 0), 0);
    const currentOverallAvg = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;

    // 2. Trend & Momentum Logic (Last 5 submissions)
    const recentWindow = 5;
    const trendItems = allItems.slice(-recentWindow);
    const recentAvg = trendItems.reduce(
      (acc, item) => acc + ((item.studentPoints / (item.maxPoints || 1)) * 100),
      0
    ) / trendItems.length;

    const trendDiff = recentAvg - currentOverallAvg;
    const projectedScore = recentAvg * 0.6 + currentOverallAvg * 0.4;

    // 3. Category Mastery
    const categories = {};
    allItems.forEach(item => {
      const cat = item.categoryName || "Assessment";
      if (!categories[cat]) categories[cat] = { totalObtained: 0, totalMax: 0, count: 0 };
      categories[cat].totalObtained += (item.studentPoints || 0);
      categories[cat].totalMax += (item.maxPoints || 0);
      categories[cat].count += 1;
    });

    const categoryPerformance = Object.keys(categories).map(cat => ({
      category: cat,
      average: (categories[cat].totalObtained / (categories[cat].totalMax || 1)) * 100,
      count: categories[cat].count
    })).sort((a, b) => b.average - a.average);

    const weakest = categoryPerformance[categoryPerformance.length - 1];
    const best = categoryPerformance[0];

    res.json({
      studentId,
      courseName: course.courseTitle,
      summary: {
        currentPercentage: currentOverallAvg.toFixed(1),
        totalAssessments: allItems.length,
        pointsEarned: totalEarned,
        pointsPossible: totalPossible
      },
      insights: {
        trendStatus: trendDiff >= 0 ? "increasing" : "decreasing",
        percentageChange: Math.abs(trendDiff).toFixed(1),
        recentAverage: recentAvg.toFixed(1),
        overallAverage: currentOverallAvg.toFixed(1),
        projectedFinalScore: Math.min(100, projectedScore).toFixed(1),
        sampleSize: trendItems.length,
        weakestCategory: weakest ? {
          name: weakest.category,
          average: weakest.average.toFixed(1),
          gap: (best.average - weakest.average).toFixed(1)
        } : null
      },
      charts: {
        lineChart: allItems.map((item, i) => ({
          name: item.title || `Item ${i + 1}`,
          score: ((item.studentPoints / (item.maxPoints || 1)) * 100).toFixed(1)
        })),
        categoryPerformance
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};