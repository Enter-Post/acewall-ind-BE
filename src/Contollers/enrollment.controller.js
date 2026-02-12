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
            const enrollments = await Enrollment.find({ student: userId, status: { $ne: "CANCELLED" } })
                .populate('course', 'courseTitle courseCode thumbnail')
                .lean();
            
            courses = enrollments
                .filter(e => e.course) // Security check in case course was deleted
                .map(e => ({
                    ...e.course,
                    enrollmentStatus: e.status,
                    enrollmentType: e.enrollmentType,
                    enrollmentId: e._id,
                    canRenew: e.status === "CANCELLED" && e.enrollmentType === "SUBSCRIPTION"
                }));
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

export const enrollment = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;
  const userId = req.user._id;

  // Find and validate course
  const course = await CourseSch.findById(courseId);
  if (!course) {
    throw new NotFoundError("Course not found", "RES_001");
  }

  // Check if course is free
  if (course.paymentType !== "FREE") {
    throw new ValidationError(
      "This is a paid course. Please use the payment flow to enroll.",
      "VAL_002"
    );
  }

  // Check for existing enrollment
  const exists = await Enrollment.findOne({
    student: userId,
    course: courseId,
  });
  
  if (exists) {
    throw new ValidationError(
      "Already enrolled in this course",
      "VAL_003"
    );
  }

  // Create enrollment with required fields
  const enrollment = await Enrollment.create({
    student: userId,
    course: courseId,
    enrollmentType: "FREE",
    status: "ACTIVE",
  });

  res.status(201).json({ 
    message: "Enrollment successful", 
    enrollment 
  });
});

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


const VALID_TYPES = ['ONETIME', 'SUBSCRIPTION', 'FREE'];
const VALID_STATUSES = ['active', 'trial', 'cancelled', 'pastdue'];

const validateFilterParams = (type, status) => {
  const typeUpper = type?.toUpperCase();
  const statusLower = status?.toLowerCase();

  if (type && !VALID_TYPES.includes(typeUpper)) {
    throw new ValidationError(
      `Invalid type. Allowed: ${VALID_TYPES.join(', ')}`,
      'VAL_002'
    );
  }

  if (status && !VALID_STATUSES.includes(statusLower)) {
    throw new ValidationError(
      `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}`,
      'VAL_003'
    );
  }

  if (status && typeUpper !== 'SUBSCRIPTION') {
    throw new ValidationError(
      'Status filter only allowed for SUBSCRIPTION',
      'VAL_005'
    );
  }

  if (status && !type) {
    throw new ValidationError(
      'Status requires type=SUBSCRIPTION',
      'VAL_005'
    );
  }
};

const TYPE_CONFIG = {
  ONETIME: { enrollmentType: 'ONETIME', status: 'ACTIVE' },
  FREE: { enrollmentType: 'FREE', status: 'ACTIVE' },
  SUBSCRIPTION: { enrollmentType: 'SUBSCRIPTION' }
};

const STATUS_MAP = {
  active: 'ACTIVE',
  trial: 'TRIAL',
  cancelled: { $in: ['CANCELLED', 'APPLIEDFORCANCEL'] },
  pastdue: 'PAST_DUE'
};

const buildEnrollmentFilter = (userId, type, status) => {
  const baseFilter = {
    student: userId,
    enrollmentType: { $ne: 'TEACHERENROLLMENT' },
    status: { $ne: 'CANCELLED' }
  };

  if (!type) return baseFilter;

  const typeUpper = type.toUpperCase();
  const config = TYPE_CONFIG[typeUpper];
  if (!config) return baseFilter;

  const filter = { ...baseFilter, ...config };

  if (typeUpper === 'SUBSCRIPTION' && status) {
    filter.status = STATUS_MAP[status.toLowerCase()];
  }

  return filter;
};

const SUBSCRIPTION_STATUS_MAP = {
  ACTIVE: 'active',
  APPLIEDFORCANCEL: 'cancelled', // Treat applied for cancel as cancelled in counts
  TRIAL: 'trial',
  CANCELLED: 'cancelled',
  PAST_DUE: 'pastdue'
};

const getEnrollmentCounts = async (userId) => {
  const counts = {
    onetime: 0,
    free: 0,
    subscription: { total: 0, active: 0, trial: 0, cancelled: 0, pastdue: 0 },
  };

  try {
    const studentId =
      userId instanceof mongoose.Types.ObjectId
        ? userId
        : mongoose.isValidObjectId(userId)
          ? new mongoose.Types.ObjectId(userId)
          : null;

    if (!studentId) return counts;

    const aggregation = await Enrollment.aggregate([
      {
        $match: {
          student: studentId, // <-- key change
          enrollmentType: { $ne: "TEACHERENROLLMENT" },
        },
      },
      {
        $group: {
          _id: { type: "$enrollmentType", status: "$status" },
          count: { $sum: 1 },
        },
      },
    ]);

    aggregation.forEach(({ _id: { type, status }, count }) => {
      if (type === "ONETIME" && status === "ACTIVE") {
        counts.onetime += count;
        return;
      }
      if (type === "FREE" && status === "ACTIVE") {
        counts.free += count;
        return;
      }
      if (type === "SUBSCRIPTION") {
        const key = SUBSCRIPTION_STATUS_MAP[status];
        if (!key) return;

        counts.subscription[key] += count;
        
        if (key === "active" || key === "trial") {
          counts.subscription.total += count;
        }
      }
    });
  } catch (err) {
    console.error("Enrollment count error:", err);
  }

  return counts;
};


export const studenCourses = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    const now = new Date();
    await Enrollment.updateMany(
      {
        student: userId,
        status: "APPLIEDFORCANCEL",
        cancellationDate: { $lte: now }
      },
      {
        $set: { status: "CANCELLED" }
      }
    );
    
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

export const studentsEnrolledinCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { status } = req.query;

  if (!courseId) {
    throw new ValidationError("Course ID is required", "VAL_001");
  }

  const filter = { course: courseId };

  const statusMap = {
    active: ["ACTIVE", "TRIAL", "APPLIEDFORCANCEL", "PAST_DUE"],
    cancelled: ["CANCELLED"],
    appliedforcancel: ["APPLIEDFORCANCEL"]
  };

  if (status) {
    const normalizedStatus = status.toLowerCase();
    filter.status = statusMap[normalizedStatus]
      ? { $in: statusMap[normalizedStatus] }
      : status.toUpperCase();
  }

  // Fetch Students
  const students = await Enrollment.find(filter)
    .populate("student", "firstName middleName lastName profileImg email")
    .sort({ enrolledAt: -1 })
    .lean();

  // Status Counts
  const statusCounts = await Enrollment.aggregate([
    { $match: { course: new mongoose.Types.ObjectId(courseId) } },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);

  const counts = statusCounts.reduce(
    (acc, { _id, count }) => {
      acc.total += count;
      if (_id === "ACTIVE") acc.active += count;
      if (_id === "CANCELLED") acc.cancelled += count;
      if (_id === "APPLIEDFORCANCEL") acc.appliedForCancel += count;
      if (_id === "TRIAL") acc.trial += count;
      if (_id === "PAST_DUE") acc.pastDue += count;
      return acc;
    },
    {
      total: 0,
      active: 0,
      cancelled: 0,
      appliedForCancel: 0,
      trial: 0,
      pastDue: 0
    }
  );

  res.status(200).json({
    students,
    counts,
    filter: status?.toLowerCase() || "all",
    message: "Enrolled students fetched successfully"
  });
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

export const studentCourseDetails = asyncHandler(async (req, res, next) => {
  const { enrollmentId } = req.params;
  try {
    const checkEnrollment = await Enrollment.findById(enrollmentId)

    if (!checkEnrollment) {
    throw new NotFoundError("Enrollment not found or has been removed", "RES_001");
    }
    
    // Auto-update APPLIEDFORCANCEL to CANCELLED if cancellation date has passed
    if (checkEnrollment.status === "APPLIEDFORCANCEL" && checkEnrollment.cancellationDate) {
      const now = new Date();
      if (now >= checkEnrollment.cancellationDate) {
        checkEnrollment.status = "CANCELLED";
        await checkEnrollment.save();
      }
    }
    
    if (checkEnrollment.status === "CANCELLED") {
      const canRenew = checkEnrollment.enrollmentType === "SUBSCRIPTION";
      return res.status(403).json({ 
        message: "Your enrollment has been cancelled. " + (canRenew ? "You can renew your subscription to regain access." : "Please contact support."),
        canRenew,
        enrollmentId: checkEnrollment._id,
        enrolledCourse: [] 
      });
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
