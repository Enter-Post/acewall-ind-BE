import mongoose from "mongoose";
import { uploadToCloudinary } from "../../lib/cloudinary-course.config.js";
import CourseSch from "../../Models/courses.model.sch.js";
import User from "../../Models/user.model.js";
import Enrollment from "../../Models/Enrollement.model.js";
import Chapter from "../../Models/chapter.model.sch.js";
import Lesson from "../../Models/lesson.model.sch.js";
import Assessment from "../../Models/Assessment.model.js";
import AssessmentCategory from "../../Models/assessment-category.js";
import Announcement from "../../Models/Annoucement.model.js";
import Comment from "../../Models/comment.model.js";
import nodemailer from "nodemailer";
import Semester from "../../Models/semester.model.js";
import Quarter from "../../Models/quarter.model.js";
import Discussion from "../../Models/discussion.model.js";
import stripe from "../../config/stripe.js";
import { ValidationError, NotFoundError } from "../../Utiles/errors.js";
import { asyncHandler } from "../../middlewares/errorHandler.middleware.js";



export const importCourseFromJSON = asyncHandler(async (req, res) => {
  const data = req.body;
  const userId = req.user._id;

  if (!data || Object.keys(data).length === 0) {
    throw new ValidationError("Course data is required");
  }

  let rawSemesters = data.semesters || data.semester || [];
  const rawCurriculum = data.curriculum || [];
  const rawAssessments = data.assessments || [];
  const rawDiscussions = data.discussions || [];

  const {
    _id: oldCourseId,
    curriculum, assessments, discussions, assessmentCategories,                                  
    semesters, semester, quarter, quarters,
    category, subcategory,
    createdAt, updatedAt, __v, createdby,                          
    ...courseBody
  } = data;

  const newCourse = await CourseSch.create({
    ...courseBody,
    courseTitle: `${courseBody.courseTitle || 'Untitled'} (Imported)`,
    category: category?._id || category || null,
    subcategory: subcategory?._id || subcategory || null,
    createdby: userId,
    semesterbased: true,
    price: 0,
    published: false,
    isVerified: "pending",
    semester: [],
    quarter: [],
  });

  const semesterMap = {};
  const quarterMap = {};
  const categoryMap = {};
  const chapterMap = {};
  const lessonMap = {};

  const newSemesterIds = [];
  const newQuarterIds = [];

  for (const sem of rawSemesters) {
    const { _id: oldSemId, quarters: nestedQuarters, ...semBody } = sem;

    const newSem = await Semester.create({
      ...semBody,
      course: newCourse._id,
      createdby: userId,
      isArchived: false
    });

    semesterMap[oldSemId] = newSem._id;
    newSemesterIds.push(newSem._id);

    const sourceQuarters = nestedQuarters || (data.quarters ? data.quarters.filter(q => q.semester === oldSemId) : []);

    if (sourceQuarters.length > 0) {
      for (const qtr of sourceQuarters) {
        const { _id: oldQtrId, ...qtrBody } = qtr;
        const newQtr = await Quarter.create({
          ...qtrBody,
          semester: newSem._id,
          isArchived: false
        });
        quarterMap[oldQtrId] = newQtr._id;
        newQuarterIds.push(newQtr._id);
      }
    }
  }

  await CourseSch.findByIdAndUpdate(newCourse._id, {
    semester: newSemesterIds,
    quarter: newQuarterIds
  });

  if (assessmentCategories && assessmentCategories.length > 0) {
    for (const cat of assessmentCategories) {
      const { _id: oldCatId, ...catBody } = cat;
      const newCat = await AssessmentCategory.create({
        ...catBody,
        course: newCourse._id,
        createdBy: userId
      });
      categoryMap[oldCatId] = newCat._id;
    }
  }

  for (const chap of rawCurriculum) {
    const { _id: oldChapId, lessons, ...chapBody } = chap;
    const newQuarterId = quarterMap[chapBody.quarter?._id || chapBody.quarter] || null;

    const newChapter = await Chapter.create({
      ...chapBody,
      course: newCourse._id,
      createdby: userId,
      quarter: newQuarterId
    });

    chapterMap[oldChapId] = newChapter._id;

    if (lessons && lessons.length > 0) {
      for (const lesson of lessons) {
        const { _id: oldLessonId, ...lessonBody } = lesson;
        await Lesson.create({
          ...lessonBody,
          chapter: newChapter._id,
          createdby: userId
        });
      }
    }
  }

  for (const asmt of rawAssessments) {
    const { _id: oldAsmtId, questions, ...asmtBody } = asmt;

    const cleanedQuestions = questions?.map(({ _id, concept, ...q }) => ({
      ...q,
      files: q.files?.map(({ _id: fId, ...f }) => f) || []
    })) || [];

    await Assessment.create({
      ...asmtBody,
      course: newCourse._id,
      createdby: userId,
      category: categoryMap[asmtBody.category?._id || asmtBody.category] || null,
      chapter: chapterMap[asmtBody.chapter?._id || asmtBody.chapter] || null,
      questions: cleanedQuestions
    });
  }

  res.status(201).json({
    success: true,
    data: {
      courseId: newCourse._id,
      courseTitle: newCourse.courseTitle,
    },
    message: "Course imported successfully",
    timestamp: new Date().toISOString(),
  });
});


export const getFullCourseData = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ValidationError("Valid course ID is required");
  }

  const courseAggregation = await CourseSch.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(courseId) },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "subcategories",
        localField: "subcategory",
        foreignField: "_id",
        as: "subcategory",
      },
    },
    { $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "semesters",
        let: { courseId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$course", "$$courseId"] },
                  { $eq: ["$isArchived", false] },
                ],
              },
            },
          },
          {
            $lookup: {
              from: "quarters",
              localField: "_id",
              foreignField: "semester",
              as: "quarters",
            },
          },
          { $sort: { startDate: 1 } },
        ],
        as: "semesterData",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "createdby",
        foreignField: "_id",
        as: "createdby",
        pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1 } }],
      },
    },
    { $unwind: { path: "$createdby", preserveNullAndEmptyArrays: true } },
  ]);

  const course = courseAggregation[0];

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  const chapters = await Chapter.find({ course: courseId }).sort({ createdAt: 1 }).lean();
  const curriculum = await Promise.all(
    chapters.map(async (chapter) => {
      const lessons = await Lesson.find({ chapter: chapter._id }).sort({ createdAt: 1 }).lean();
      return { ...chapter, lessons };
    })
  );

  const assessmentCategories = await AssessmentCategory.find({ course: courseId }).lean();
  const assessments = await Assessment.find({ course: courseId }).populate("category").lean();
  const discussions = await Discussion.find({ course: courseId }).populate("category").lean();

  const fullCourseData = {
    ...course,
    semesters: course.semesterData,
    curriculum,
    assessmentCategories,
    assessments,
    discussions,
  };

  delete fullCourseData.semesterData;

  res.status(200).json({
    success: true,
    data: fullCourseData,
    message: "Full course data retrieved successfully",
    timestamp: new Date().toISOString(),
  });
});


export const getCoursesWithMeetings = async (req, res) => {
  try {
    // 1. Fetch all meetings to count them per course
    // Use .lean() for performance since we just need the data
    const meetings = await ZoomMeeting.find({}, "course").lean();

    // 2. Calculate meeting counts per course
    const meetingCounts = {};
    meetings.forEach((m) => {
      if (m.course) {
        const cId = m.course.toString();
        meetingCounts[cId] = (meetingCounts[cId] || 0) + 1;
      }
    });

    const courseIds = Object.keys(meetingCounts);

    if (courseIds.length === 0) {
      return res
        .status(200)
        .json({ courses: [], message: "No courses with meetings found" });
    }

    // 3. Fetch course details
    // Use .lean() so we can easily attach the 'meetingCount' property
    const courses = await CourseSch.find({ _id: { $in: courseIds } })
      .populate("createdby", "firstName lastName email")
      .populate("category", "title")
      .populate("subcategory", "title")
      .sort({ createdAt: -1 })
      .lean();

    // 4. Attach the counts to the course objects
    const coursesWithCounts = courses.map((course) => ({
      ...course,
      meetingCount: meetingCounts[course._id.toString()] || 0,
    }));

    res.status(200).json({
      success: true,
      count: coursesWithCounts.length,
      courses: coursesWithCounts,
      message: "Courses with meetings fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching courses with meetings:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// export const getFullCourseData = async (req, res) => {
//   try {
//     const { courseId } = req.params;

//     // 1. Fetch Core Course Details (Metadata, Requirements, Teaching Points)
//     const course = await CourseSch.findById(courseId)
//       .populate("category subcategory", "title")
//       .select("-__v")
//       .lean();

//     if (!course) return res.status(404).json({ message: "Course not found" });

//     // 2. Fetch Structure (Semesters & Quarters)
//     const semesters = await Semester.find({ course: courseId }).select("-__v").lean();
//     const quarters = await Quarter.find({ 
//       semester: { $in: semesters.map(s => s._id) } 
//     }).select("-__v").lean();

//     // 3. Fetch Content (Chapters & Lessons)
//     // We include all descriptions, PDF links, and Video links
//     const chapters = await Chapter.find({ course: courseId }).select("-__v").lean();
//     const lessons = await Lesson.find({ 
//       chapter: { $in: chapters.map(c => c._id) } 
//     }).select("-__v").lean();

//     // 4. Fetch Assessments (The most valuable data)
//     // We get every question, every MCQ option, and the correct answers
//     const assessments = await Assessment.find({ 
//       course: courseId 
//     }).populate("category", "name").select("-__v").lean();

//     // 5. Build the instructional tree
//     const exportData = {
//       exportDate: new Date().toISOString(),
//       courseInfo: {
//         title: course.courseTitle,
//         description: course.courseDescription,
//         language: course.language,
//         requirements: course.requirements,
//         teachingPoints: course.teachingPoints,
//         price: course.price,
//         gradingSystem: course.gradingSystem
//       },
//       curriculum: chapters.map(chap => ({
//         chapterTitle: chap.title,
//         chapterDescription: chap.description,
//         lessons: lessons
//           .filter(l => l.chapter.toString() === chap._id.toString())
//           .map(l => ({
//             title: l.title,
//             description: l.description,
//             content: {
//               pdfs: l.pdfFiles,
//               video: l.youtubeLinks,
//               links: l.otherLink
//             }
//           })),
//         assessments: assessments
//           .filter(a => a.chapter?.toString() === chap._id.toString())
//           .map(a => ({
//             title: a.title,
//             type: a.type,
//             questions: a.questions // This includes the valuable Q&A and MCQ options
//           }))
//       })),
//       // Add Semester structure if it exists
//       schedule: semesters.map(sem => ({
//         semesterName: sem.title,
//         dates: { start: sem.startDate, end: sem.endDate },
//         quarters: quarters.filter(q => q.semester.toString() === sem._id.toString())
//       }))
//     };

//     res.status(200).json(exportData);
//   } catch (error) {
//     res.status(500).json({ message: "Failed to compile course data", error: error.message });
//   }
// };


export const toggleGradingSystem = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ValidationError("Valid course ID is required");
  }

  const course = await CourseSch.findById(courseId);

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  course.gradingSystem =
    course.gradingSystem === "normalGrading"
      ? "StandardGrading"
      : "normalGrading";

  await course.save();

  res.status(200).json({
    success: true,
    data: {
      gradingSystem: course.gradingSystem,
    },
    message: "Grading system updated successfully",
    timestamp: new Date().toISOString(),
  });
});

export const createCourseSch = asyncHandler(async (req, res) => {
  const createdby = req.user._id;
  const {
    courseTitle,
    category,
    subcategory,
    language,
    courseDescription,
    semesterbased,
    teachingPoints,
    requirements,
    published,
    price,
    paymentType,
    freeTrialMonths
  } = req.body;

  const files = req.files;

  if (!courseTitle) {
    throw new ValidationError("Course title is required");
  }

  if (!category) {
    throw new ValidationError("Category is required");
  }

  if (!paymentType || !["FREE", "ONETIME", "SUBSCRIPTION"].includes(paymentType)) {
    throw new ValidationError("Valid payment type is required (FREE, ONETIME, SUBSCRIPTION)");
  }

  let thumbnail = { url: "", filename: "" };
  if (files?.thumbnail && files.thumbnail[0]) {
    const uploadResult = await uploadToCloudinary(files.thumbnail[0].buffer, "course_thumbnails");
    thumbnail = {
      url: uploadResult.secure_url,
      filename: files.thumbnail[0].originalname,
    };
  }

  const parsedTeachingPoints = teachingPoints ? JSON.parse(teachingPoints) : [];
  const parsedRequirements = requirements ? JSON.parse(requirements) : [];

  const courseData = {
    courseTitle,
    category,
    subcategory,
    thumbnail,
    language,
    courseDescription,
    semesterbased,
    teachingPoints: parsedTeachingPoints,
    requirements: parsedRequirements,
    createdby,
    published,
    paymentType,
  };

  if (paymentType !== "FREE") {
    if (!price || parseFloat(price) <= 0) {
      throw new ValidationError("Valid price is required for paid courses");
    }

    const product = await stripe.products.create({
      name: courseTitle,
      description: courseDescription,
    });

    const priceInCents = Math.round(parseFloat(price) * 100);
    const stripePriceConfig = {
      product: product.id,
      unit_amount: priceInCents,
      currency: 'usd',
    };

    if (paymentType === "SUBSCRIPTION") {
      stripePriceConfig.recurring = { interval: "month" };
      courseData.freeTrialMonths = Number(freeTrialMonths || 0);
    }

    const stripePrice = await stripe.prices.create(stripePriceConfig);

    courseData.price = parseFloat(price);
    courseData.stripeProductId = product.id;
    courseData.stripePriceId = stripePrice.id;
  }

  const course = new CourseSch(courseData);
  await course.save();

  await Enrollment.create({ student: createdby, course: course._id });

  res.status(201).json({
    success: true,
    data: {
      course,
    },
    message: "Course created successfully",
    timestamp: new Date().toISOString(),
  });
});

export const getAllCoursesSch = asyncHandler(async (req, res) => {
  const { isVerified, search } = req.query;

  const query = {
    isVerified: isVerified,
  };

  if (search) {
    query["courseTitle"] = { $regex: search, $options: "i" };
  }

  const courses = await CourseSch.find(query)
    .populate(
      "createdby",
      "firstName middleName lastName Bio email profileImg"
    )
    .populate("category", "title")
    .populate("subcategory", "title");

  res.status(200).json({
    success: true,
    data: {
      courses,
      count: courses.length,
    },
    message: courses.length === 0 ? "No courses found" : "All courses fetched successfully",
    timestamp: new Date().toISOString(),
  });
});

export const getCoursesbySubcategorySch = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const { subCategoryId } = req.params;

  if (!subCategoryId || !mongoose.Types.ObjectId.isValid(subCategoryId)) {
    throw new ValidationError("Valid subcategory ID is required");
  }

  const query = {
    subcategory: subCategoryId,
    isVerified: "approved",
    published: true,
  };

  if (search) {
    query.courseTitle = { $regex: search, $options: "i" };
  }

  const courses = await CourseSch.find(query, {
    courseTitle: 1,
    thumbnail: 1,
    category: 1,
    subcategory: 1,
    createdby: 1,
    language: 1,
  })
    .populate("createdby", "firstName lastName Bio profileImg isVarified")
    .populate("category", "title")
    .populate("subcategory", "title");

  const filteredCourses = courses.filter(
    (course) => course.createdby?.isVarified === true
  );

  res.status(200).json({
    success: true,
    data: {
      courses: filteredCourses,
      count: filteredCourses.length,
    },
    message: filteredCourses.length === 0 ? "No courses found" : "Courses fetched successfully",
    timestamp: new Date().toISOString(),
  });
});

export const courseDetailsStdPre = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ValidationError("Valid course ID is required");
  }

  const courseData = await CourseSch.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(courseId) },
    },
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
        from: "subcategories",
        localField: "subcategory",
        foreignField: "_id",
        as: "subcategory",
      },
    },
    { $unwind: "$subcategory" },
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
  ]);

  if (!courseData || courseData.length === 0) {
    throw new NotFoundError("Course not found");
  }

  res.status(200).json({
    success: true,
    data: {
      course: courseData[0],
    },
    message: "Course details fetched successfully",
    timestamp: new Date().toISOString(),
  });
});





export const getunPurchasedCourseByIdStdPrew = asyncHandler(async (req, res) => {
  const courseId = req.params.id;

  if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ValidationError("Valid course ID is required");
  }

  const courseData = await CourseSch.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(courseId) },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
        pipeline: [
          { $project: { _id: 1, title: 1 } },
        ],
      },
    },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "subcategories",
        localField: "subcategory",
        foreignField: "_id",
        as: "subcategory",
        pipeline: [
          { $project: { _id: 1, title: 1 } },
        ],
      },
    },
    { $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true } },
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
        from: "chapters",
        localField: "_id",
        foreignField: "course",
        as: "chapters",
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
                  { $eq: ["$type", "Course-assessment"] },
                ],
              },
            },
          },
          {
            $lookup: {
              from: "assessmentcategories",
              localField: "category",
              foreignField: "_id",
              as: "category",
            },
          },
          {
            $unwind: {
              path: "$category",
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
        as: "CourseAssessments",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "createdby",
        foreignField: "_id",
        as: "createdby",
        pipeline: [
          {
            $project: {
              firstName: 1,
              middleName: 1,
              lastName: 1,
              profileImg: 1,
              isVarified: 1,
              email: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$createdby",
        preserveNullAndEmptyArrays: true,
      },
    },
  ]);

  if (!courseData || courseData.length === 0) {
    throw new NotFoundError("Course not found");
  }

  res.status(200).json({
    success: true,
    data: {
      course: courseData[0],
    },
    message: "Course fetched successfully",
    timestamp: new Date().toISOString(),
  });
});






export const getunPurchasedCourseByIdSch = asyncHandler(async (req, res) => {
  const courseId = req.params.id;

  if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ValidationError("Valid course ID is required");
  }

  const courseData = await CourseSch.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(courseId) },
    },
    {
      $lookup: {
        from: "chapters",
        let: { courseId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$course", "$$courseId"] },
            },
          },
          {
            $lookup: {
              from: "lessons",
              let: { chapterId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$chapter", "$$chapterId"] },
                  },
                },
                {
                  $project: {
                    title: 1,
                    description: 1,
                    chapter: 1,
                  },
                },
              ],
              as: "lessons",
            },
          },
          {
            $project: {
              title: 1,
              description: 1,
              lessons: 1,
            },
          },
        ],
        as: "chapters",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "createdby",
        foreignField: "_id",
        as: "createdby",
      },
    },
    { $unwind: { path: "$createdby", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        courseTitle: 1,
        thumbnail: 1,
        category: 1,
        subcategory: 1,
        createdby: {
          firstName: 1,
          middleName: 1,
          lastName: 1,
          Bio: 1,
          profileImg: 1,
        },
        language: 1,
        courseDescription: 1,
        teachingPoints: 1,
        requirements: 1,
        chapters: 1,
        price: 1,
        paymentType: 1,
        freeTrialMonths: 1,
      },
    },
  ]);

  if (!courseData || courseData.length === 0) {
    throw new NotFoundError("Course not found");
  }

  res.status(200).json({
    success: true,
    data: {
      course: courseData[0],
    },
    message: "Course fetched successfully",
    timestamp: new Date().toISOString(),
  });
});

export const getCourseDetails = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ValidationError("Valid course ID is required");
  }

  const course = await CourseSch.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(courseId) },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
        pipeline: [
          {
            $project: {
              _id: 1,
              title: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$category",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "subcategories",
        localField: "subcategory",
        foreignField: "_id",
        as: "subcategory",
        pipeline: [
          {
            $project: {
              _id: 1,
              title: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$subcategory",
        preserveNullAndEmptyArrays: true,
      },
    },
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
                  { $eq: ["$type", "Course-assessment"] },
                ],
              },
            },
          },
          {
            $lookup: {
              from: "assessmentcategories",
              localField: "category",
              foreignField: "_id",
              as: "category",
            },
          },
          {
            $unwind: {
              path: "$category",
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
        as: "CourseAssessments",
      },
    },
    {
      $lookup: {
        from: "enrollments",
        let: { courseId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$course", "$$courseId"],
              },
            },
          },
        ],
        as: "enrollments",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "createdby",
        foreignField: "_id",
        as: "createdby",
        pipeline: [
          {
            $project: {
              firstName: 1,
              middleName: 1,
              lastName: 1,
              profileImg: 1,
              isVarified: 1,
              email: 1,
            },
          },
        ]
      }
    },
    {
      $unwind: {
        path: "$createdby",
        preserveNullAndEmptyArrays: true,
      },
    },
  ]);

  if (!course || course.length === 0) {
    throw new NotFoundError("Course not found");
  }

  res.status(200).json({
    success: true,
    data: {
      course: course[0],
    },
    message: "Course fetched successfully",
    timestamp: new Date().toISOString(),
  });
});
export const deleteCourseSch = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ValidationError("Valid course ID is required");
  }

  const courseObjectId = new mongoose.Types.ObjectId(courseId);

  const deletedCourse = await CourseSch.findByIdAndDelete(courseObjectId);

  if (!deletedCourse) {
    throw new NotFoundError("Course not found");
  }

  await Comment.deleteMany({ course: courseObjectId });

  const chapters = await Chapter.find({ course: courseObjectId });
  const chapterIds = chapters.map((ch) => ch._id);

  const lessons = await Lesson.find({ chapter: { $in: chapterIds } });
  const lessonIds = lessons.map((ls) => ls._id);

  await Chapter.deleteMany({ _id: { $in: chapterIds } });
  await Lesson.deleteMany({ _id: { $in: lessonIds } });

  await Assessment.deleteMany({
    $or: [
      { course: courseObjectId, type: "final-assessment" },
      { chapter: { $in: chapterIds }, type: "chapter-assessment" },
      { lesson: { $in: lessonIds }, type: "lesson-assessment" },
    ],
  });

  await Announcement.deleteMany({ course: courseObjectId });

  await AssessmentCategory.deleteMany({
    course: courseObjectId,
  });

  await Enrollment.deleteMany({ course: courseObjectId });

  res.status(200).json({
    success: true,
    data: {
      deletedCourseId: courseId,
    },
    message: "Course and all related data, including comments, deleted successfully",
    timestamp: new Date().toISOString(),
  });
});

export const getCoursesByTeacherSch = asyncHandler(async (req, res) => {
  const teacherId = req.user._id;
  const search = req.query.search?.trim();
  const published = req.query.published;
  const verified = req.query.isVerified;

  const query = {
    createdby: teacherId,
    isVerified: verified,
  };

  if (search) {
    query["courseTitle"] = { $regex: search, $options: "i" };
  }

  if (published !== undefined) {
    query["published"] = published === "true";
  }

  const courses = await CourseSch.find(query)
    .sort({ createdAt: -1 })
    .populate({
      path: "createdby",
      select: "firstName middleName lastName profileImg",
    })
    .populate({
      path: "category",
      select: "title",
    });

  res.status(200).json({
    success: true,
    data: {
      courses,
      count: courses.length,
    },
    message: courses.length === 0 ? "No courses found for this teacher" : "Courses fetched successfully",
    timestamp: new Date().toISOString(),
  });
});

export const getCoursesforadminofteacher = asyncHandler(async (req, res) => {
  const teacherId = req.query.teacherId;
  const { search } = req.query;

  if (!teacherId || !mongoose.Types.ObjectId.isValid(teacherId)) {
    throw new ValidationError("Valid teacher ID is required");
  }

  const query = {
    $and: [
      { createdby: teacherId },
      search
        ? { "basics.courseTitle": { $regex: search, $options: "i" } }
        : {},
    ],
  };

  const courses = await CourseSch.find(query)
    .populate("createdby")
    .populate("category");

  res.status(200).json({
    success: true,
    data: {
      courses,
      count: courses.length,
    },
    message: courses.length === 0 ? "No courses found for this teacher" : "Courses fetched successfully",
    timestamp: new Date().toISOString(),
  });
});

export const getallcoursesforteacher = asyncHandler(async (req, res) => {
  const teacherId = req.user._id;

  const studentsWithCourses = await Enrollment.aggregate([
    {
      $lookup: {
        from: "coursesches",
        localField: "course",
        foreignField: "_id",
        as: "courseDetails",
      },
    },
    { $unwind: "$courseDetails" },
    {
      $match: {
        "courseDetails.createdby": new mongoose.Types.ObjectId(teacherId),
        "courseDetails.isVerified": "approved",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "student",
        foreignField: "_id",
        as: "studentDetails",
      },
    },
    { $unwind: "$studentDetails" },
    {
      $match: {
        "studentDetails._id": { $ne: new mongoose.Types.ObjectId(teacherId) },
      },
    },
    {
      $group: {
        _id: "$studentDetails._id",
        firstName: { $first: "$studentDetails.firstName" },
        middleName: { $first: "$studentDetails.middleName" },
        lastName: { $first: "$studentDetails.lastName" },
        Bio: { $first: "$studentDetails.Bio" },
        profileImg: { $first: "$studentDetails.profileImg" },
        gender: { $first: "$studentDetails.gender" },
        email: { $first: "$studentDetails.email" },
        createdAt: { $first: "$studentDetails.createdAt" },
        courses: {
          $push: {
            _id: "$courseDetails._id",
            courseTitle: "$courseDetails.courseTitle",
            description: "$courseDetails.courseDescription",
            thumbnail: "$courseDetails.thumbnail",
            category: "$courseDetails.category",
            subcategory: "$courseDetails.subcategory",
          },
        },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      students: studentsWithCourses,
      count: studentsWithCourses.length,
    },
    message: "Students with their teacher's approved courses fetched successfully",
    timestamp: new Date().toISOString(),
  });
});

export const getDueDate = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ValidationError("Valid course ID is required");
  }

  const course = await CourseSch.findById(courseId).select(
    "startingDate endingDate"
  );

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  res.status(200).json({
    success: true,
    data: {
      startingDate: course.startingDate,
      endingDate: course.endingDate,
    },
    message: "Course dates retrieved successfully",
    timestamp: new Date().toISOString(),
  });
});

export const thumnailChange = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const thumbnail = req.file;

  if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ValidationError("Valid course ID is required");
  }

  if (!thumbnail) {
    throw new ValidationError("Thumbnail file is required");
  }

  const course = await CourseSch.findById(courseId);

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  const result = await uploadToCloudinary(
    thumbnail.buffer,
    "course_thumbnails"
  );

  course.thumbnail = {
    url: result.secure_url,
    publicId: result.public_id,
    filename: thumbnail.originalname,
  };

  await course.save();

  res.status(200).json({
    success: true,
    data: {
      thumbnail: course.thumbnail,
    },
    message: "Thumbnail updated successfully",
    timestamp: new Date().toISOString(),
  });
});

export const getCourseBasics = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ValidationError("Valid course ID is required");
  }

  const course = await CourseSch.findById(courseId);

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  res.status(200).json({
    success: true,
    data: {
      course,
    },
    message: "Course found successfully",
    timestamp: new Date().toISOString(),
  });
});

export const editCourseInfo = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const {
    courseTitle,
    price,
    category,
    subcategory,
    language,
    teachingPoints,
    requirements,
    courseDescription,
  } = req.body;

  if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ValidationError("Valid course ID is required");
  }

  if (!courseTitle) {
    throw new ValidationError("Course title is required");
  }

  const course = await CourseSch.findById(courseId);

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  let parsedTeachingPoints = [];
  let parsedRequirements = [];

  if (teachingPoints) {
    try {
      parsedTeachingPoints = JSON.parse(teachingPoints);
    } catch (error) {
      throw new ValidationError("Invalid teaching points format");
    }
  }

  if (requirements) {
    try {
      parsedRequirements = JSON.parse(requirements);
    } catch (error) {
      throw new ValidationError("Invalid requirements format");
    }
  }

  course.courseTitle = courseTitle;
  course.category = category;
  course.price = price;
  course.subcategory = subcategory;
  course.language = language;
  course.teachingPoints = parsedTeachingPoints;
  course.requirements = parsedRequirements;
  course.courseDescription = courseDescription;

  await course.save();

  res.status(200).json({
    success: true,
    data: {
      course,
    },
    message: "Course updated successfully",
    timestamp: new Date().toISOString(),
  });
});

export const verifyCourse = asyncHandler(async (req, res) => {
  const { isVerified } = req.body;
  const { courseId } = req.params;

  if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ValidationError("Valid course ID is required");
  }

  if (!isVerified || !["approved", "rejected", "pending"].includes(isVerified)) {
    throw new ValidationError("Invalid verification status. Must be 'approved', 'rejected', or 'pending'.");
  }

  const course = await CourseSch.findById(courseId).populate("createdby");

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  course.isVerified = isVerified;
  course.isAppliedReverified = {
    status: false,
    request: null,
  };

  await course.save();

    const teacherEmail = course.createdby?.email;
    const teacherName = course.createdby?.firstName || "Instructor";
    const courseTitle = course.courseTitle;

    // ✅ Email setup (like in verifyTeacherDocument)
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: Number(process.env.MAIL_PORT) === 465,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // ✅ Send approval email
    if (isVerified === "approved" && teacherEmail) {
      try {
        await transporter.sendMail({
          from: `"Admin Team" <${process.env.MAIL_USER}>`,
          to: teacherEmail,
          subject: "Course Approved ✅",
          html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f7fb; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          
          <!-- Logo -->
          <div style="text-align: center; padding: 20px; background: #ffffff;">
            <img src="https://lirp.cdn-website.com/6602115c/dms3rep/multi/opt/acewall+scholars-431w.png" 
                 alt="Acewall Scholars Logo" 
                 style="height: 60px; margin: 0 auto;" />
          </div>

          <!-- Header -->
          <div style="background: #28a745; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Course Approved</h1>
          </div>

          <!-- Body -->
          <div style="padding: 20px; color: #333;">
            <p style="font-size: 16px;">Congratulations, <strong>${teacherName}</strong>!</p>
            <p style="font-size: 16px;">Your course titled <strong>"${courseTitle}"</strong> has been <strong>approved</strong> by our review team.</p>
            <p style="font-size: 16px;">It is now live and visible to learners on the platform.</p>
            <p style="font-size: 16px; margin-top: 15px;">We wish you great success in your teaching journey!</p>
          </div>

          <!-- Footer -->
          <div style="background: #f0f4f8; color: #555; text-align: center; padding: 15px; font-size: 12px;">
            <p style="margin: 0;">Acewall Scholars © ${new Date().getFullYear()}</p>
            <p style="margin: 0;">If you have any query contact us on same email</p>
          </div>
        </div>
      </div>
      `,
        });
      } catch (mailError) {
        console.error("❌ Error sending approval email:", mailError);
      }
    }

    // ✅ Send rejection email
    if (isVerified === "rejected" && teacherEmail) {
      try {
        await transporter.sendMail({
          from: `"Admin Team" <${process.env.MAIL_USER}>`,
          to: teacherEmail,
          subject: "Course Rejected ❌",
          html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f7fb; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          
          <!-- Logo -->
          <div style="text-align: center; padding: 20px; background: #ffffff;">
            <img src="https://lirp.cdn-website.com/6602115c/dms3rep/multi/opt/acewall+scholars-431w.png" 
                 alt="Acewall Scholars Logo" 
                 style="height: 60px; margin: 0 auto;" />
          </div>

          <!-- Header -->
          <div style="background: #dc3545; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Course Rejected</h1>
          </div>

          <!-- Body -->
          <div style="padding: 20px; color: #333;">
            <p style="font-size: 16px;">Hello, <strong>${teacherName}</strong></p>
            <p style="font-size: 16px;">We regret to inform you that your course titled <strong>"${courseTitle}"</strong> has been <strong>rejected</strong> after our review process.</p>
            <p style="font-size: 16px;">Please review the course guidelines and make the necessary changes before resubmitting.</p>
            <p style="font-size: 16px; margin-top: 15px;">If you have questions, feel free to reach out to our support team.</p>
          </div>

          <!-- Footer -->
          <div style="background: #f0f4f8; color: #555; text-align: center; padding: 15px; font-size: 12px;">
            <p style="margin: 0;">Acewall Scholars © ${new Date().getFullYear()}</p>
            <p style="margin: 0;">If you have any query contact us on same email</p>
          </div>
        </div>
      </div>
      `,
        });
      } catch (mailError) {
        console.error("❌ Error sending rejection email:", mailError);
      }
    }


    const message =
      isVerified === "approved"
        ? "Course approved successfully."
        : isVerified === "rejected"
          ? "Course rejected successfully."
          : "Course verification status updated.";

  res.status(200).json({
    success: true,
    data: {
      courseId: course._id,
      isVerified: course.isVerified,
    },
    message,
    timestamp: new Date().toISOString(),
  });
});

export const rejectCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { remark } = req.body;

  if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ValidationError("Valid course ID is required");
  }

  const course = await CourseSch.findByIdAndUpdate(
    courseId,
    { isVerified: "rejected", remarks: remark },
    { new: true }
  ).populate("createdby");

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  course.isAppliedReverified = {
    status: false,
    request: null,
  };

  await course.save();

  const teacherEmail = course.createdby?.email;
  const teacherName = course.createdby?.firstName || "Instructor";
  const courseTitle = course.courseTitle;

  if (teacherEmail) {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: Number(process.env.MAIL_PORT) === 465,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    try {
      await transporter.sendMail({
        from: `"Admin Team" <${process.env.MAIL_USER}>`,
        to: teacherEmail,
        subject: "Your Course Has Been Rejected ❌",
        html: `
  <div style="font-family: Arial, sans-serif; background-color: #f4f7fb; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
      
      <!-- Logo -->
      <div style="text-align: center; padding: 20px; background: #ffffff;">
        <img src="https://lirp.cdn-website.com/6602115c/dms3rep/multi/opt/acewall+scholars-431w.png" 
             alt="Acewall Scholars Logo" 
             style="height: 60px; margin: 0 auto;" />
      </div>

      <!-- Header -->
      <div style="background: #dc3545; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Course Rejected</h1>
      </div>

      <!-- Body -->
      <div style="padding: 20px; color: #333;">
        <p style="font-size: 16px;">Hello, <strong>${teacherName}</strong></p>
        <p style="font-size: 16px;">Your course titled <strong>"${courseTitle}"</strong> has been <strong>rejected</strong> after review.</p>
        
        ${remark
            ? `<p style="font-size: 16px; color: #b71c1c;"><strong>Reason:</strong> ${remark}</p>`
            : `<p style="font-size: 16px;">No specific remarks were provided.</p>`
          }

        <p style="font-size: 16px;">You may revise and resubmit your course after making the required changes.</p>
        <p style="font-size: 16px; margin-top: 15px;">If you have any questions, feel free to contact our support team.</p>
      </div>

      <!-- Footer -->
      <div style="background: #f0f4f8; color: #555; text-align: center; padding: 15px; font-size: 12px;">
        <p style="margin: 0;">Acewall Scholars © ${new Date().getFullYear()}</p>
        <p style="margin: 0;">If you have any query contact us on same email</p>
      </div>
    </div>
  </div>
  `,
      });
    } catch (emailError) {
      console.error("Error sending rejection email:", emailError);
    }
  }

  res.status(200).json({
    success: true,
    data: {
      courseId: course._id,
      isVerified: course.isVerified,
      remarks: course.remarks,
    },
    message: "Course rejected successfully",
    timestamp: new Date().toISOString(),
  });
});


export const applyCourseReverification = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { request } = req.body;

  if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ValidationError("Valid course ID is required");
  }

  const course = await CourseSch.findById(courseId);

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  course.isAppliedReverified = {
    status: true,
    request: request || null,
  };

  course.isVerified = "pending";

  await course.save();

  res.status(200).json({
    success: true,
    data: {
      courseId: course._id,
      isAppliedReverified: course.isAppliedReverified,
      isVerified: course.isVerified,
    },
    message: "Course re-verification request applied successfully",
    timestamp: new Date().toISOString(),
  });
});

export const teacherCourseForDesboard = asyncHandler(async (req, res) => {
  const teacherId = req.user._id;

  // Get the 5 most recently created published courses
  const recentPublishedCourses = await CourseSch.find({
    createdby: teacherId,
    published: true,
    isVerified: "approved",
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .select("courseTitle thumbnail category courseDescription createdAt");

  const publishedCount = await CourseSch.countDocuments({
    createdby: teacherId,
    isVerified: "approved",
  });

  const unpublishedCount = await CourseSch.countDocuments({
    createdby: teacherId,
    published: false,
  });

  const approvedCount = await CourseSch.countDocuments({
    createdby: teacherId,
    isVerified: "approved",
  });

  const pendingCount = await CourseSch.countDocuments({
    createdby: teacherId,
    isVerified: "pending",
  });

  const rejectedCount = await CourseSch.countDocuments({
    createdby: teacherId,
    isVerified: "rejected",
  });

  const totalCount = await CourseSch.countDocuments({
    createdby: teacherId,
  });

  res.status(200).json({
    success: true,
    data: {
      published: recentPublishedCourses,
      unpublished: unpublishedCount,
      publishedCount: publishedCount,
      approved: approvedCount,
      pending: pendingCount,
      rejected: rejectedCount,
      total: totalCount,
    },
    message: "Course counts fetched successfully",
    timestamp: new Date().toISOString(),
  });
});

export const archivedCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ValidationError("Invalid course ID format");
  }

  const course = await CourseSch.findById(courseId);
  if (!course) {
    throw new NotFoundError("Course not found");
  }

  course.published = !course.published;
  course.archivedDate = course.published ? null : new Date();
  await course.save();

  res.status(200).json({
    success: true,
    data: { course },
    message: course.published
      ? "Course published successfully"
      : "Course archived successfully",
    timestamp: new Date().toISOString(),
  });
});

///for teacher only
export const getVerifiedCourses = asyncHandler(async (req, res) => {
  const teacherId = req.user._id;

  const courses = await CourseSch.find({
    createdby: teacherId,
    published: true,
    isVerified: "approved",
  }).select("courseTitle thumbnail");

  res.status(200).json({
    success: true,
    data: { courses },
    message: courses.length > 0 ? "Courses fetched successfully" : "No courses found",
    timestamp: new Date().toISOString(),
  });
});

export const getCoursesforAdmin = asyncHandler(async (req, res) => {
  const recentPublishedCourses = await CourseSch.find({
    published: true,
    isVerified: "approved",
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .select("courseTitle thumbnail category courseDescription createdAt");

  const publishedCount = await CourseSch.countDocuments({
    isVerified: "approved",
  });

  const unpublishedCount = await CourseSch.countDocuments({
    published: false,
  });

  const approvedCount = await CourseSch.countDocuments({
    isVerified: "approved",
  });

  const pendingCount = await CourseSch.countDocuments({
    isVerified: "pending",
  });

  const rejectedCount = await CourseSch.countDocuments({
    isVerified: "rejected",
  });

  const totalCount = await CourseSch.countDocuments({});

  res.status(200).json({
    success: true,
    data: {
      published: recentPublishedCourses,
      unpublished: unpublishedCount,
      publishedCount: publishedCount,
      approved: approvedCount,
      pending: pendingCount,
      rejected: rejectedCount,
      total: totalCount,
    },
    message: "Course counts fetched successfully",
    timestamp: new Date().toISOString(),
  });
});


export const getRequiredDocumentforEdit = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ValidationError("Invalid course ID format");
  }

  const course = await CourseSch.findById(courseId);
  
  if (!course) {
    throw new NotFoundError("Course not found");
  }

  res.status(200).json({
    success: true,
    data: { 
      documents: course.documents,
      courseType: course.courseType 
    },
    message: "Required documents fetched successfully",
    timestamp: new Date().toISOString(),
  });
});

export const editCoureDocument = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ValidationError("Invalid course ID format");
  }

  const course = await CourseSch.findById(courseId);
  if (!course) {
    throw new NotFoundError("Course not found");
  }

  const files = req.files;
  const currentDocuments = course.documents || {};
  const updatedDocuments = { ...currentDocuments };

  for (const field in files) {
    const file = files[field]?.[0];
    if (file) {
      const uploadResult = await uploadToCloudinary(file.buffer, "course_documents");

      updatedDocuments[field] = {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        filename: file.originalname,
      };
    }
  }

  if (updatedDocuments.resume) {
    course.documents.resume = updatedDocuments.resume;
  }
  if (updatedDocuments.certificate) {
    course.documents.certificate = updatedDocuments.certificate;
  }
  if (updatedDocuments.governmentId) {
    course.documents.governmentId = updatedDocuments.governmentId;
  }
  if (updatedDocuments.transcript) {
    course.documents.transcript = updatedDocuments.transcript;
  }

  await course.save();

  res.status(200).json({
    success: true,
    data: { course },
    message: "Course documents updated successfully",
    timestamp: new Date().toISOString(),
  });
});


export const getCourseEnrollmentStats = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { range } = req.query;

  if (!courseId) {
    throw new ValidationError("Course ID is required");
  }

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ValidationError("Invalid course ID format");
  }

  let startDate = null;
  const now = new Date();

  // Calculate the date offset
  if (range === '7d') {
    startDate = new Date();
    startDate.setDate(now.getDate() - 7);
  } else if (range === '30d') {
    startDate = new Date();
    startDate.setMonth(now.getMonth() - 1);
  } else if (range === '6m') {
    startDate = new Date();
    startDate.setMonth(now.getMonth() - 6);
  }

  const matchStage = {
    course: new mongoose.Types.ObjectId(courseId)
  };

  if (startDate) {
    matchStage.createdAt = { $gte: startDate };
  }

  const stats = await Enrollment.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id": 1 } },
    {
      $project: {
        _id: 0,
        date: "$_id",
        students: "$count"
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: { stats: stats || [] },
    message: "Enrollment statistics fetched successfully",
    timestamp: new Date().toISOString(),
  });
});


export const getUserCoursesforFilter = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const search = req.query.search || "";

  const searchFilter = search
    ? {
      courseTitle: { $regex: search, $options: "i" },
    }
    : {};

  let courses = [];

  // ============================
  // ✅ TEACHER COURSES
  // ============================
  if (role === "teacher") {
    courses = await CourseSch.aggregate([
      {
        $match: {
          isVerified: "approved",
          createdby: new mongoose.Types.ObjectId(userId),
          ...searchFilter

        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $lookup: {
          from: "subcategories",
          localField: "subcategory",
          foreignField: "_id",
          as: "subcategory",
        },
      },
      {
        $unwind: { path: "$category", preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          courseTitle: 1,
          courseCode: 1,
          language: 1,
          published: 1,
          gradingSystem: 1,
          thumbnail: 1,
          createdAt: 1,
          category: {
            _id: "$category._id",
            name: "$category.name",
          },
          subcategory: {
            _id: "$subcategory._id",
            name: "$subcategory.name",
          },
        },
      },
      {
        $sort: {
          published: -1,
          createdAt: -1,
        },
      },
    ]);
  }

  if (role === "student") {
    courses = await Enrollment.aggregate([
      {
        $match: {
          student: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "coursesches",
          localField: "course",
          foreignField: "_id",
          as: "course",
        },
      },
      {
        $unwind: "$course",
      },

      // 🔍 Search filter here
      {
        $match: search
          ? {
            "course.courseTitle": {
              $regex: search,
              $options: "i",
            },
          }
          : {},
      },

      {
        $lookup: {
          from: "categories",
          localField: "course.category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $lookup: {
          from: "subcategories",
          localField: "course.subcategory",
          foreignField: "_id",
          as: "subcategory",
        },
      },
      {
        $unwind: { path: "$category", preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: "$course._id",
          courseTitle: "$course.courseTitle",
          language: "$course.language",
          published: "$course.published",
          gradingSystem: "$course.gradingSystem",
          thumbnail: "$course.thumbnail",
          createdAt: "$course.createdAt",

          progress: 1,
          completed: 1,

          category: {
            _id: "$category._id",
            name: "$category.name",
          },
          subcategory: {
            _id: "$subcategory._id",
            name: "$subcategory.name",
          },
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);
  }

  res.status(200).json({
    success: true,
    data: {
      totalCourses: courses.length,
      courses,
    },
    message: "User courses fetched successfully",
    timestamp: new Date().toISOString(),
  });
});
