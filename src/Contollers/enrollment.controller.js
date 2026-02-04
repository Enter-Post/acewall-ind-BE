import mongoose from "mongoose";
import CourseSch from "../Models/courses.model.sch.js";
import Enrollment from "../Models/Enrollement.model.js";
import Chapter from "../Models/chapter.model.sch.js";
import Submission from "../Models/submission.model.js";
import Assessment from "../Models/Assessment.model.js";
import Lesson from "../Models/lesson.model.sch.js";
import { ValidationError, NotFoundError, DatabaseError } from '../Utiles/errors.js';
import { asyncHandler } from '../middlewares/errorHandler.middleware.js';


export const getMyEnrolledCourses = asyncHandler(async (req, res, next) => {
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

        res.status(200).json({
            success: true,
            data: { courses },
            message: 'Enrolled courses retrieved successfully'
        });
    } catch (error) {
        next(error);
    }
});


export const enrollmentforTeacher = asyncHandler(async (req, res, next) => {
  try {
    const { teacherId, courseId } = req.body;

    // Validate required fields
    if (!teacherId || !courseId) {
      throw new ValidationError("teacherId and courseId are required", "VAL_001");
    }

    const enrollments = await Enrollment.find({ student: teacherId, course: courseId });
    const enrollment = enrollments[0];
    
    if (!enrollment) {
      throw new NotFoundError("No enrollments found", "RES_001");
    }

    res.status(200).json({
      success: true,
      data: { enrollment },
      message: "Enrollments fetched successfully"
    });
  } catch (error) {
    next(error);
  }
});

// export const enrollment = async (req, res) => {
//   const { courseId } = req.params;
//   const userId = req.user._id;
//   try {
//     const course = await CourseSch.findById(courseId);
//     if (!course) return res.status(404).json({ message: "Course not found" });

//     const exists = await Enrollment.findOne({
//       student: userId,
//       course: courseId,
//     });
//     if (exists)
//       return res
//         .status(400)
//         .json({ message: "Already enrolled in this course" });

//     const enrollment = await Enrollment.create({
//       student: userId,
//       course: courseId,
//     });
//     res.status(201).json({ message: "Enrollment successful", enrollment });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

export const isEnrolled = asyncHandler(async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    if (!courseId) {
      throw new ValidationError("Course ID is required", "VAL_001");
    }

    const exists = await Enrollment.findOne({
      student: userId,
      course: courseId,
    });

    res.status(200).json({
      success: true,
      data: { enrolled: !!exists },
      message: 'Enrollment status checked'
    });
  } catch (err) {
    next(err);
  }
});

export const studenCourses = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user._id;
    const search = req.query.search?.trim();

    const filter = { student: userId };

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

    res.status(200).json({
      success: true,
      data: { enrolledCourses },
      message: "Enrolled courses retrieved successfully"
    });
  } catch (err) {
    next(err);
  }
});

export const studentsEnrolledinCourse = asyncHandler(async (req, res, next) => {
  try {
    const { courseId } = req.params;

    if (!courseId) {
      throw new ValidationError("Course ID is required", "VAL_001");
    }

    const enrolledStudents = await Enrollment.find({
      course: courseId,
    }).populate("student", "firstName middleName lastName profileImg");

    res.status(200).json({
      success: true,
      data: { enrolledStudents },
      message: 'Enrolled students retrieved successfully'
    });
  } catch (err) {
    next(err);
  }
});

export const unEnrollment = asyncHandler(async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    if (!courseId) {
      throw new ValidationError("Course ID is required", "VAL_001");
    }

    const enrollment = await Enrollment.findOneAndDelete({
      student: userId,
      course: courseId,
    });

    if (!enrollment) {
      throw new NotFoundError("Enrollment not found", "RES_001");
    }

    res.status(200).json({
      success: true,
      data: { enrollment },
      message: 'Successfully unenrolled from course'
    });
  } catch (err) {
    next(err);
  }
});

export const studentCourseDetails = asyncHandler(async (req, res, next) => {
  try {
    const { enrollmentId } = req.params;

    if (!enrollmentId) {
      throw new ValidationError("Enrollment ID is required", "VAL_001");
    }

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
                subscriptionId: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$courseDetails" },
      {
        $project: {
          enrollmentId: "$_id",
          student: 1,
          course: 1,
          enrolledAt: 1,
          progress: 1,
          completed: 1,
          enrollmentType: 1,
          status: 1,
          stripeSessionId: 1,
          subscriptionId: 1,
          courseDetails: 1,
        },
      },
    ]);

    if (!enrolledData || enrolledData.length === 0) {
      throw new NotFoundError("Enrollment not found", "RES_001");
    }

    res.status(200).json({
      success: true,
      data: { enrolledCourse: enrolledData[0] },
      message: "Course overview fetched successfully"
    });
  } catch (error) {
    next(error);
  }
});







export const chapterDetails = asyncHandler(async (req, res, next) => {
  try {
    const { chapterId } = req.params;
    const userId = req.user._id;

    if (!chapterId) {
      throw new ValidationError("Chapter ID is required", "VAL_001");
    }

    const chapter = await Chapter.findById(chapterId).populate("course");
    if (!chapter) {
      throw new NotFoundError("Chapter not found", "RES_001");
    }

    const isEnrolled = await Enrollment.findOne({
      student: userId,
      course: chapter.course._id,
    });

    if (!isEnrolled) {
      throw new ValidationError("Unauthorized access to chapter", "AUTH_003");
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
      throw new NotFoundError("Chapter not found in aggregation", "RES_001");
    }

    res.status(200).json({
      success: true,
      data: { chapterDetails: chapterData[0] },
      message: "Chapter details fetched successfully"
    });
  } catch (error) {
    next(error);
  }
});

// controller/adminController.js
export const getStudentEnrolledCourses = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("Student ID is required", "VAL_001");
    }

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

    res.status(200).json({
      success: true,
      data: { enrolledCourses },
      message: "Student's enrolled courses retrieved successfully"
    });
  } catch (err) {
    next(err);
  }
});



export const chapterDetailsStdPre = asyncHandler(async (req, res, next) => {
  try {
    const { chapterId } = req.params;

    if (!chapterId) {
      throw new ValidationError("Chapter ID is required", "VAL_001");
    }

    const chapter = await Chapter.findById(chapterId).populate("course");

    if (!chapter) {
      throw new NotFoundError("Chapter not found", "RES_001");
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
      throw new NotFoundError("Chapter not found in aggregation", "RES_001");
    }

    res.status(200).json({
      success: true,
      data: { chapterDetails: chapterData[0] },
      message: "Chapter details fetched successfully"
    });
  } catch (error) {
    next(error);
  }
});
