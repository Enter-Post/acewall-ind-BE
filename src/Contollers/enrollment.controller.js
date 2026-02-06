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

        res.status(200).json(courses);
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
      enrollment,
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
      enrolled: !!exists,
      message: 'Enrollment status checked'
    });
  } catch (err) {
    next(err);
  }
});



const validateFilterParams = (type, status) => {
  const validTypes = ['ONETIME', 'SUBSCRIPTION', 'FREE'];
  const validStatuses = ['active', 'trial', 'cancelled', 'pastdue'];

  // Validate type if provided
  if (type && !validTypes.includes(type.toUpperCase())) {
    throw new ValidationError(
      `Invalid type parameter. Must be one of: ${validTypes.join(', ')}`,
      'VAL_002'
    );
  }

  // Validate status if provided
  if (status && !validStatuses.includes(status.toLowerCase())) {
    throw new ValidationError(
      `Invalid status parameter. Must be one of: ${validStatuses.join(', ')}`,
      'VAL_003'
    );
  }

  // Status can only be used with SUBSCRIPTION type
  if (status && type && type.toUpperCase() !== 'SUBSCRIPTION') {
    throw new ValidationError(
      'Status filter can only be used with type=SUBSCRIPTION',
      'VAL_004'
    );
  }

  // Status requires type to be specified
  if (status && !type) {
    throw new ValidationError(
      'Status filter requires type=SUBSCRIPTION to be specified',
      'VAL_005'
    );
  }
};

const buildEnrollmentFilter = (userId, type, status) => {
  const filter = {
    student: userId,
    enrollmentType: { $ne: 'TEACHERENROLLMENT' } // Exclude teacher enrollments
  };

  if (!type) {
    // No type filter - return all enrollments (except TEACHERENROLLMENT)
    return filter;
  }

  const typeUpper = type.toUpperCase();
  
  if (typeUpper === 'ONETIME') {
    // ONETIME: only show ACTIVE one-time purchases
    filter.enrollmentType = 'ONETIME';
    filter.status = 'ACTIVE';
  } else if (typeUpper === 'FREE') {
    // FREE: only show ACTIVE free courses
    filter.enrollmentType = 'FREE';
    filter.status = 'ACTIVE';
  } else if (typeUpper === 'SUBSCRIPTION') {
    filter.enrollmentType = 'SUBSCRIPTION';
    
    if (status) {
      const statusLower = status.toLowerCase();
      
      if (statusLower === 'active') {
        // Active includes ACTIVE and APPLIEDFORCANCEL (still has access until period end)
        filter.status = { $in: ['ACTIVE', 'APPLIEDFORCANCEL'] };
      } else if (statusLower === 'trial') {
        filter.status = 'TRIAL';
      } else if (statusLower === 'cancelled') {
        filter.status = 'CANCELLED';
      } else if (statusLower === 'pastdue') {
        filter.status = 'PAST_DUE';
      }
    }
    // If no status sub-filter, return all subscription statuses
  }

  return filter;
};

const getEnrollmentCounts = async (userId) => {
  const counts = {
    onetime: 0,
    subscription: {
      total: 0,
      active: 0,
      trial: 0,
      cancelled: 0,
      pastdue: 0
    },
    free: 0
  };

  try {
    // Aggregate all enrollments in a single query
    const aggregation = await Enrollment.aggregate([
      {
        $match: {
          student: userId,
          enrollmentType: { $ne: 'TEACHERENROLLMENT' }
        }
      },
      {
        $group: {
          _id: {
            type: '$enrollmentType',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Process aggregation results
    aggregation.forEach(item => {
      const { type, status } = item._id;
      const count = item.count;

      if (type === 'ONETIME' && status === 'ACTIVE') {
        counts.onetime += count;
      } else if (type === 'FREE' && status === 'ACTIVE') {
        counts.free += count;
      } else if (type === 'SUBSCRIPTION') {
        counts.subscription.total += count;
        
        if (status === 'ACTIVE' || status === 'APPLIEDFORCANCEL') {
          counts.subscription.active += count;
        } else if (status === 'TRIAL') {
          counts.subscription.trial += count;
        } else if (status === 'CANCELLED') {
          counts.subscription.cancelled += count;
        } else if (status === 'PAST_DUE') {
          counts.subscription.pastdue += count;
        }
      }
    });
  } catch (error) {
    console.error('Error calculating enrollment counts:', error);
    // Return default counts on error
  }

  return counts;
};


export const studenCourses = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user._id;
    const search = req.query.search?.trim();
    const type = req.query.type?.trim();
    const status = req.query.status?.trim();

    // Validate filter parameters
    validateFilterParams(type, status);

    // Build MongoDB filter based on type and status
    const filter = buildEnrollmentFilter(userId, type, status);

    // Find enrollments with filter
    let enrolledCourses = await Enrollment.find(filter)
      .populate({
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
      })
      .sort('-enrolledAt') // Newest first
      .lean();

    // Filter out enrollments where course was deleted
    enrolledCourses = enrolledCourses.filter(enroll => enroll.course);

    // If search query is provided, filter by course title
    if (search) {
      enrolledCourses = enrolledCourses.filter((enroll) =>
        enroll.course?.courseTitle?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Get enrollment counts for metadata
    const counts = await getEnrollmentCounts(userId);

    // Build response with metadata
    res.status(200).json({
      enrolledCourses,
      metadata: {
        total: enrolledCourses.length,
        filters: {
          type: type?.toUpperCase() || null,
          status: status?.toLowerCase() || null,
          search: search || null
        },
        counts
      },
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

    res.status(200).json(enrolledStudents);
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

    res.status(200).json(enrollment);
  } catch (err) {
    next(err);
  }
});

export const studentCourseDetails = async (req, res) => {
  const { enrollmentId } = req.params;
  try {
    const checkEnrollment = await Enrollment.findById(enrollmentId)

    if (checkEnrollment.status === "CANCELLED") {
      return res.status(403).json({ message: "Access denied to cancelled enrollment", enrolledCourse: [] });
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
          trial: 1,
        },
      },
    ]);

    if (!enrolledData || enrolledData.length === 0) {
      throw new NotFoundError("Enrollment not found", "RES_001");
    }

    res.status(200).json({
      enrolledCourse: enrolledData[0],
      message: "Course overview fetched successfully"
    });
  } catch (error) {
    next(error);
  }
};


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
      chapterDetails: chapterData[0],
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
      enrolledCourses,
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
      chapterDetails: chapterData[0],
      message: "Chapter details fetched successfully"
    });
  } catch (error) {
    next(error);
  }
});
