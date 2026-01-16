import mongoose from "mongoose";
import CourseSch from "../Models/courses.model.sch.js";
import Enrollment from "../Models/Enrollement.model.js";
import Chapter from "../Models/chapter.model.sch.js";
import Submission from "../Models/submission.model.js";
import Assessment from "../Models/Assessment.model.js";
import Lesson from "../Models/lesson.model.sch.js";


export const getMyEnrolledCourses = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role; 

        let courses = [];

        if (userRole === "teacher" || userRole === "admin") {
            // Teachers see courses they OWN/CREATED
            courses = await CourseSch.find({ createdby: userId })
                .select('courseTitle courseCode thumbnail')
                .lean();
        } else {
            // Students see courses they are ENROLLED in
            const enrollments = await Enrollment.find({ student: userId })
                .populate('course', 'courseTitle courseCode thumbnail')
                .lean();
            
            courses = enrollments
                .filter(e => e.course) // Security check in case course was deleted
                .map(e => e.course);
        }

        res.status(200).json(courses);
    } catch (error) {
        console.error("Error in getMyEnrolledCourses:", error);
        res.status(500).json({ message: "Error fetching courses" });
    }
};


export const enrollmentforTeacher = async (req, res) => {
  try {
    const { teacherId, courseId } = req.body;

    const enrollments = await Enrollment.find({ student: teacherId, course: courseId });
    const enrollment = enrollments[0];
    if (enrollment) {
      res.status(200).json({ message: "Enrollments fetched successfully", enrollment });
    } else {
      res.status(404).json({ message: "No enrollments found" });
    }

  } catch (error) {
    console.log("Error in the enrollmentforTeacher", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export const enrollment = async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user._id;
  try {
    const course = await CourseSch.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const exists = await Enrollment.findOne({
      student: userId,
      course: courseId,
    });
    if (exists)
      return res
        .status(400)
        .json({ message: "Already enrolled in this course" });

    const enrollment = await Enrollment.create({
      student: userId,
      course: courseId,
    });
    res.status(201).json({ message: "Enrollment successful", enrollment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const isEnrolled = async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user._id;
  try {
    const exists = await Enrollment.findOne({
      student: userId,
      course: courseId,
    });

    res.status(200).json({ enrolled: !!exists });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const studenCourses = async (req, res) => {
  const userId = req.user._id;
  const search = req.query.search?.trim(); // Get the search query from the request

  try {
    const filter = { student: userId }; // Find enrollments by student ID

    // Find enrollments with optional search filter
    let enrolledCourses = await Enrollment.find(filter).populate({
      path: "course",
      select: "courseTitle createdby category subcategory language thumbnail",
      populate: [
        {
          path: "createdby",
          select: "firstName middleName lastName profileImg",
        },
        {
          path: "category",
          select: "title",
        },
      ],
    });

    // If a search query is provided, filter courses by courseTitle
    if (search) {
      enrolledCourses = enrolledCourses.filter((enroll) =>
        enroll.course?.courseTitle?.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.status(200).json({ message: "Enrolled Courses", enrolledCourses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const studentsEnrolledinCourse = async (req, res) => {
  const { courseId } = req.params;
  try {
    const enrolledStudents = await Enrollment.find({
      course: courseId,
    }).populate("student", "firstName middleName lastName profileImg");
    res.status(200).json(enrolledStudents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const unEnrollment = async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user._id;
  try {
    const enrollment = await Enrollment.findOneAndDelete({
      student: userId,
      course: courseId,
    });
    res.status(200).json(enrollment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const studentCourseDetails = async (req, res) => {
  const { enrollmentId } = req.params;

  try {
    const enrolledData = await Enrollment.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(enrollmentId) },
      },
      {
        $lookup: {
          from: "coursesches",
          localField: "course",
          foreignField: "_id",
          as: "courseDetails",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "createdby",
                foreignField: "_id",
                as: "createdby",
              },
            },
            { $unwind: "$createdby" },
            {
              $lookup: {
                from: "categories",
                localField: "category",
                foreignField: "_id",
                as: "category",
              },
            },
            { $unwind: "$category" },
            {
              $lookup: {
                from: "semesters",
                let: { courseId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$isArchived", false] },
                          { $eq: ["$course", "$$courseId"] },
                        ],
                      },
                    },
                  },
                ],
                as: "semester",
              },
            },
            {
              $lookup: {
                from: "assessments",
                let: { courseId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$course", "$$courseId"] },
                          { $eq: ["$type", "final-assessment"] },
                        ],
                      },
                    },
                  },
                  {
                    $project: {
                      _id: 1,
                      title: 1,
                      description: 1,
                    },
                  },
                ],
                as: "finalAssessments",
              },
            },
            {
              $project: {
                courseTitle: 1,
                courseDescription: 1,
                language: 1,
                thumbnail: 1,
                createdAt: 1,
                updatedAt: 1,
                teachingPoints: 1,
                semester: 1,
                quarter: 1,
                semesterbased: 1,
                requirements: 1,
                createdby: {
                  _id: "$createdby._id",
                  firstName: "$createdby.firstName",
                  middleName: "$createdby.middleName",
                  lastName: "$createdby.lastName",
                  profileImg: "$createdby.profileImg",
                },
                category: {
                  _id: "$category._id",
                  title: "$category.title",
                },
                subcategory: {
                  _id: "$subcategory._id",
                  title: "$subcategory.title",
                },
                chapters: 1,
                finalAssessments: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$courseDetails" },
    ]);

    if (!enrolledData || enrolledData.length === 0) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    res.status(200).json({
      message: "Course overview fetched successfully",
      enrolledCourse: enrolledData[0],
    });
  } catch (error) {
    console.error("Error in studentCourseDetails:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};







export const chapterDetails = async (req, res) => {
  const { chapterId } = req.params;
  const userId = req.user._id;

  try {
    const chapter = await Chapter.findById(chapterId).populate("course");
    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    const isEnrolled = await Enrollment.findOne({
      student: userId,
      course: chapter.course._id,
    });

    if (!isEnrolled) {
      return res
        .status(403)
        .json({ message: "Unauthorized access to chapter" });
    }

    const chapterData = await Chapter.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(chapterId) },
      },
      {
        $lookup: {
          from: "lessons",
          localField: "_id",
          foreignField: "chapter",
          as: "lessons",
          pipeline: [
            {
              $lookup: {
                from: "assessments",
                let: { lessonId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$lesson", "$$lessonId"] },
                          { $eq: ["$type", "lesson-assessment"] },
                        ],
                      },
                    },
                  },
                  {
                    $project: {
                      _id: 1,
                      title: 1,
                      description: 1,
                    },
                  },
                ],
                as: "lessonAssessments",
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "assessments",
          let: { chapterId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$chapter", "$$chapterId"] },
                    { $eq: ["$type", "chapter-assessment"] },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                title: 1,
                description: 1,
              },
            },
          ],
          as: "chapterAssessments",
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          lessons: 1,
          chapterAssessments: 1,
        },
      },
    ]);

    if (!chapterData || chapterData.length === 0) {
      return res
        .status(404)
        .json({ message: "Chapter not found in aggregation" });
    }

    res.status(200).json({
      message: "Chapter details fetched successfully",
      chapterDetails: chapterData[0],
    });
  } catch (error) {
    console.error("Error in chapterDetails:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// controller/adminController.js
export const getStudentEnrolledCourses = async (req, res) => {
  const { id } = req.params;

  try {
    const enrolledCourses = await Enrollment.find({ student: id }).populate({
      path: "course",
      select: "courseTitle createdby category subcategory language thumbnail",
      populate: [
        {
          path: "createdby",
          select: "firstName middleName lastName profileImg",
        },
        { path: "category", select: "title" },
        { path: "subcategory", select: "title" },
      ],
    });

    res
      .status(200)
      .json({ message: "Student's Enrolled Courses", enrolledCourses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



export const chapterDetailsStdPre = async (req, res) => {
  const { chapterId } = req.params;

  try {
    const chapter = await Chapter.findById(chapterId).populate("course");

    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    const chapterData = await Chapter.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(chapterId) },
      },
      {
        $lookup: {
          from: "lessons",
          localField: "_id",
          foreignField: "chapter",
          as: "lessons",
          pipeline: [
            {
              $lookup: {
                from: "assessments",
                let: { lessonId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$lesson", "$$lessonId"] },
                          { $eq: ["$type", "lesson-assessment"] },
                        ],
                      },
                    },
                  },
                  {
                    $project: {
                      _id: 1,
                      title: 1,
                      description: 1,
                    },
                  },
                ],
                as: "lessonAssessments",
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "assessments",
          let: { chapterId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$chapter", "$$chapterId"] },
                    { $eq: ["$type", "chapter-assessment"] },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                title: 1,
                description: 1,
              },
            },
          ],
          as: "chapterAssessments",
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          lessons: 1,
          chapterAssessments: 1,
        },
      },
    ]);

    if (!chapterData || chapterData.length === 0) {
      return res
        .status(404)
        .json({ message: "Chapter not found in aggregation" });
    }

    res.status(200).json({
      message: "Chapter details fetched successfully",
      chapterDetails: chapterData[0],
    });
  } catch (error) {
    console.error("Error in chapterDetails:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};
